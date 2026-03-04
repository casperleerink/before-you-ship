import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Plus } from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { conversationStatusVariant } from "@/lib/conversation-utils";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/conversations/"
)({
	component: ConversationsPage,
});

function formatDate(timestamp: number) {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function ConversationsPage() {
	const { orgId: orgIdParam, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const conversations = useQuery(api.conversations.list, { projectId });
	const createConversation = useMutation(api.conversations.create);
	const navigate = useNavigate();

	if (conversations === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const handleCreate = async () => {
		const conversationId = await createConversation({ projectId });
		navigate({
			to: "/organizations/$orgId/projects/$projectId/conversations/$conversationId",
			params: {
				orgId: orgIdParam,
				projectId: projectIdParam,
				conversationId,
			},
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

			{conversations.length === 0 ? (
				<EmptyState
					description="Start a conversation to refine ideas into tasks."
					icon={MessageSquare}
					title="No conversations yet"
				/>
			) : (
				<div className="space-y-2">
					{conversations.map((conversation) => (
						<button
							className="flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
							key={conversation._id}
							onClick={() =>
								navigate({
									to: "/organizations/$orgId/projects/$projectId/conversations/$conversationId",
									params: {
										orgId: orgIdParam,
										projectId: projectIdParam,
										conversationId: conversation._id,
									},
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
							<Badge variant={conversationStatusVariant(conversation.status)}>
								{conversation.status}
							</Badge>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
