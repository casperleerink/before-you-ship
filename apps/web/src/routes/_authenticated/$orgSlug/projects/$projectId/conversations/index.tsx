import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { MessageSquare, Plus } from "lucide-react";

import { useMemo } from "react";
import { z } from "zod";

import { ConversationStatusDropdown } from "@/components/conversation-status-dropdown";
import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	CONVERSATION_STATUS_OPTIONS,
	type ConversationStatus,
} from "@/lib/conversation-utils";

type StatusFilter = ConversationStatus | "all";

const searchSchema = z.object({
	status: z.enum(["all", "active", "completed", "abandoned"]).catch("active"),
});

const EMPTY_STATE_MESSAGES: Record<StatusFilter, string> = {
	all: "Start a conversation to refine ideas into tasks.",
	active: "No active conversations. Start one or check another tab.",
	completed: "No completed conversations yet.",
	abandoned: "No abandoned conversations.",
};

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/conversations/"
)({
	component: ConversationsPage,
	validateSearch: searchSchema,
});

function formatDate(timestamp: number) {
	return new Date(timestamp).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function ConversationsPage() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const { status } = Route.useSearch();
	const projectId = projectIdParam as Id<"projects">;
	const conversations = useQuery(api.conversations.list, { projectId });
	const navigate = useNavigate({ from: Route.fullPath });

	const filteredConversations = useMemo(() => {
		if (!conversations) {
			return [];
		}
		if (status === "all") {
			return conversations;
		}
		return conversations.filter(
			(conversation) => conversation.status === status
		);
	}, [conversations, status]);

	const counts = useMemo(() => {
		if (!conversations) {
			return { abandoned: 0, active: 0, all: 0, completed: 0 };
		}

		const result = {
			abandoned: 0,
			active: 0,
			all: conversations.length,
			completed: 0,
		};

		for (const conversation of conversations) {
			if (conversation.status in result) {
				result[conversation.status as ConversationStatus] += 1;
			}
		}

		return result;
	}, [conversations]);

	if (conversations === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const handleCreate = () => {
		navigate({
			params: { orgSlug, projectId: projectIdParam },
			to: "/$orgSlug/projects/$projectId/conversations/new",
		});
	};

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Conversations</h1>
				<Button onClick={handleCreate} size="sm">
					<Plus className="mr-1 h-4 w-4" />
					New Conversation
				</Button>
			</div>

			<Tabs
				className="mb-4"
				onValueChange={(value) =>
					navigate({
						search: (prev) => ({
							...prev,
							status: value as StatusFilter,
						}),
					})
				}
				value={status}
			>
				<TabsList>
					<TabsTrigger value="all">All ({counts.all})</TabsTrigger>
					{CONVERSATION_STATUS_OPTIONS.map((option) => (
						<TabsTrigger key={option.value} value={option.value}>
							{option.label} ({counts[option.value]})
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			{filteredConversations.length === 0 ? (
				<EmptyState
					description={EMPTY_STATE_MESSAGES[status]}
					icon={MessageSquare}
					title={
						status === "all"
							? "No conversations yet"
							: `No ${status} conversations`
					}
				/>
			) : (
				<div className="space-y-2">
					{filteredConversations.map((conversation) => (
						<button
							className="flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
							key={conversation._id}
							onClick={() =>
								navigate({
									params: {
										conversationId: conversation._id,
										orgSlug,
										projectId: projectIdParam,
									},
									to: "/$orgSlug/projects/$projectId/conversations/$conversationId",
								})
							}
							type="button"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">
									{conversation.title ?? "Untitled conversation"}
								</p>
								<p className="text-muted-foreground text-xs">
									{formatDate(conversation.createdAt)}
								</p>
							</div>
							{/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper to stop propagation */}
							<div
								onClick={(event) => event.stopPropagation()}
								role="presentation"
							>
								<ConversationStatusDropdown
									conversationId={conversation._id}
									status={conversation.status}
								/>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
