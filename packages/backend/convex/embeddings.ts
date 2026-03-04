import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";

const embeddingModel = google.textEmbeddingModel("text-embedding-004");

async function generateEmbedding(text: string): Promise<number[]> {
	const { embedding } = await embed({
		model: embeddingModel,
		value: text,
	});
	return embedding;
}

export const generateTaskEmbedding = internalAction({
	args: {
		taskId: v.id("tasks"),
	},
	handler: async (ctx, { taskId }) => {
		const task = await ctx.runQuery(internal.embeddings.getTask, { taskId });
		if (!task) {
			return;
		}

		const text = `${task.title}\n${task.brief}`;
		const embedding = await generateEmbedding(text);

		await ctx.runMutation(internal.embeddings.patchTaskEmbedding, {
			taskId,
			embedding,
		});
	},
});

export const generateDocEmbedding = internalAction({
	args: {
		docId: v.id("docs"),
	},
	handler: async (ctx, { docId }) => {
		const doc = await ctx.runQuery(internal.embeddings.getDoc, { docId });
		if (!doc) {
			return;
		}

		const text = `${doc.title}\n${doc.content}`;
		const embedding = await generateEmbedding(text);

		await ctx.runMutation(internal.embeddings.patchDocEmbedding, {
			docId,
			embedding,
		});
	},
});

export const getTask = internalQuery({
	args: { taskId: v.id("tasks") },
	handler: async (ctx, { taskId }) => {
		return await ctx.db.get(taskId);
	},
});

export const getDoc = internalQuery({
	args: { docId: v.id("docs") },
	handler: async (ctx, { docId }) => {
		return await ctx.db.get(docId);
	},
});

export const patchTaskEmbedding = internalMutation({
	args: {
		taskId: v.id("tasks"),
		embedding: v.array(v.float64()),
	},
	handler: async (ctx, { taskId, embedding }) => {
		await ctx.db.patch(taskId, { embedding });
	},
});

export const patchDocEmbedding = internalMutation({
	args: {
		docId: v.id("docs"),
		embedding: v.array(v.float64()),
	},
	handler: async (ctx, { docId, embedding }) => {
		await ctx.db.patch(docId, { embedding });
	},
});

export const vectorSearchTasks = internalAction({
	args: {
		projectId: v.id("projects"),
		text: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ projectId, text, limit }
	): Promise<
		{
			id: Id<"tasks">;
			title: string;
			brief: string;
			status: string;
			risk: string;
			complexity: string;
			effort: string;
			affectedAreas: string[];
			score: number;
		}[]
	> => {
		const embedding = await generateEmbedding(text);
		const results = await ctx.vectorSearch("tasks", "by_embedding", {
			vector: embedding,
			limit: limit ?? 10,
			filter: (q) => q.eq("projectId", projectId),
		});
		const tasks = await Promise.all(
			results.map(async (r) => {
				const task = await ctx.runQuery(internal.embeddings.getTask, {
					taskId: r._id,
				});
				return task
					? {
							id: r._id,
							title: task.title,
							brief: task.brief,
							status: task.status,
							risk: task.risk,
							complexity: task.complexity,
							effort: task.effort,
							affectedAreas: task.affectedAreas,
							score: r._score,
						}
					: null;
			})
		);
		return tasks.filter((t): t is NonNullable<typeof t> => t !== null);
	},
});

export const vectorSearchDocs = internalAction({
	args: {
		projectId: v.id("projects"),
		text: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ projectId, text, limit }
	): Promise<
		{
			id: Id<"docs">;
			title: string;
			content: string;
			score: number;
		}[]
	> => {
		const embedding = await generateEmbedding(text);
		const results = await ctx.vectorSearch("docs", "by_embedding", {
			vector: embedding,
			limit: limit ?? 10,
			filter: (q) => q.eq("projectId", projectId),
		});
		const docs = await Promise.all(
			results.map(async (r) => {
				const doc = await ctx.runQuery(internal.embeddings.getDoc, {
					docId: r._id,
				});
				return doc
					? {
							id: r._id,
							title: doc.title,
							content: doc.content,
							score: r._score,
						}
					: null;
			})
		);
		return docs.filter((d): d is NonNullable<typeof d> => d !== null);
	},
});
