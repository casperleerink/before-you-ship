import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Inbox, MessageSquare } from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/triage"
)({
	component: TriagePage,
});

function TriagePage() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const items = useQuery(api.triageItems.list, { projectId });
	const createFromTriageItem = useMutation(
		api.conversations.createFromTriageItem
	);
	const navigate = useNavigate();

	if (items === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const navigateToConversation = (conversationId: Id<"conversations">) => {
		navigate({
			params: {
				conversationId,
				orgSlug,
				projectId: projectIdParam,
			},
			to: "/$orgSlug/projects/$projectId/conversations/$conversationId",
		});
	};

	const handlePendingClick = async (triageItemId: Id<"triageItems">) => {
		const conversationId = await createFromTriageItem({ triageItemId });
		navigateToConversation(conversationId);
	};

	return (
		<div className="p-6">
			<div className="mb-4">
				<h1 className="font-bold text-2xl">Triage</h1>
			</div>

			{items.length === 0 ? (
				<EmptyState
					description="Submit ideas and bug reports to be refined by AI. Use the + button or press Cmd+J."
					icon={Inbox}
					title="No triage items yet"
				/>
			) : (
				<div className="space-y-2">
					{items.map((item) => (
						<button
							className="flex w-full items-start justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
							key={item._id}
							onClick={() => {
								if (item.status === "converted" && item.conversationId) {
									navigateToConversation(item.conversationId);
								} else if (item.status === "pending") {
									handlePendingClick(item._id).catch(() => {
										// Keep user on current screen if conversion fails
									});
								}
							}}
							type="button"
						>
							<div className="min-w-0 flex-1">
								<p className="text-sm">{item.content}</p>
								{item.status === "converted" && (
									<p className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
										<MessageSquare className="h-3 w-3" />
										View conversation
									</p>
								)}
							</div>
							<Badge
								variant={item.status === "pending" ? "outline" : "secondary"}
							>
								{item.status}
							</Badge>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
