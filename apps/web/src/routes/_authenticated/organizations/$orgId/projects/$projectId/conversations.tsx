import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Plus } from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/conversations"
)({
	component: ConversationsPage,
});

function statusVariant(status: Doc<"conversations">["status"]) {
	switch (status) {
		case "active":
			return "default";
		case "completed":
			return "secondary";
		case "abandoned":
			return "outline";
		default:
			return "outline";
	}
}

function formatDate(timestamp: number) {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function ConversationsPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const conversations = useQuery(api.conversations.list, { projectId });
	const createConversation = useMutation(api.conversations.create);

	if (conversations === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const handleCreate = async () => {
		await createConversation({ projectId });
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
						<div
							className="flex items-center justify-between gap-4 rounded-lg border p-4"
							key={conversation._id}
						>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">
									{conversation.title ?? "Untitled conversation"}
								</p>
								<p className="text-muted-foreground text-xs">
									{formatDate(conversation.createdAt)}
								</p>
							</div>
							<Badge variant={statusVariant(conversation.status)}>
								{conversation.status}
							</Badge>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
