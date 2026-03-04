import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
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
