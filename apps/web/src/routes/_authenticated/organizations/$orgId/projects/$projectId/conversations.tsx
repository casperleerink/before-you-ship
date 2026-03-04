import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

import EmptyState from "@/components/empty-state";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/conversations"
)({
	component: ConversationsPage,
});

function ConversationsPage() {
	return (
		<div className="p-6">
			<h1 className="mb-4 font-bold text-2xl">Conversations</h1>
			<EmptyState
				description="Start a conversation to refine ideas into tasks."
				icon={MessageSquare}
				title="No conversations yet"
			/>
		</div>
	);
}
