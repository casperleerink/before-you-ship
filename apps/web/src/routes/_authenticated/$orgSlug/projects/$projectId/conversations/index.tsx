import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquare, Plus } from "lucide-react";

import { useMemo } from "react";
import { z } from "zod";

import { ConversationStatusDropdown } from "@/components/conversation-status-dropdown";
import EmptyState from "@/components/empty-state";
import { ConversationCardsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	countConversationsByStatus,
	filterConversations,
	getConversationEmptyState,
	type StatusFilter,
} from "@/features/conversations/conversation-list";
import { CONVERSATION_STATUS_OPTIONS } from "@/lib/conversation-utils";
import { formatRelativeTime } from "@/lib/utils";

const searchSchema = z.object({
	status: z.enum(["all", "active", "completed", "abandoned"]).catch("active"),
});

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/conversations/"
)({
	component: ConversationsPage,
	validateSearch: searchSchema,
});

function ConversationsPage() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const { status } = Route.useSearch();
	const projectId = projectIdParam as Id<"projects">;
	const { data: conversations } = useQuery(
		convexQuery(api.conversations.list, { projectId })
	);
	const navigate = useNavigate({ from: Route.fullPath });

	const filteredConversations = useMemo(
		() => filterConversations(conversations, status),
		[conversations, status]
	);
	const counts = useMemo(
		() => countConversationsByStatus(conversations),
		[conversations]
	);

	if (conversations === undefined) {
		return <ConversationCardsSkeleton />;
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
					description={getConversationEmptyState(status).description}
					icon={MessageSquare}
					title={getConversationEmptyState(status).title}
				/>
			) : (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
					{filteredConversations.map((conversation) => (
						<Card
							className="cursor-pointer transition-colors hover:bg-muted/50"
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
							size="sm"
						>
							<CardHeader>
								<CardTitle className="line-clamp-2 text-sm">
									{conversation.title ?? "Untitled conversation"}
								</CardTitle>
								<CardAction>
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
								</CardAction>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground text-xs">
									{conversation.createdByUser.name} &middot;{" "}
									{formatRelativeTime(conversation.createdAt)}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
