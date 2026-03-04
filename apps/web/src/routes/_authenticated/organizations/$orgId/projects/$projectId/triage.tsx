import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Inbox, MessageSquare, Plus } from "lucide-react";
import { useState } from "react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import TriageQuickAddForm from "@/components/triage-quick-add-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/triage"
)({
	component: TriagePage,
});

function TriagePage() {
	const { orgId: orgIdParam, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const items = useQuery(api.triageItems.list, { projectId });
	const createFromTriageItem = useMutation(
		api.conversations.createFromTriageItem
	);
	const navigate = useNavigate();
	const [showCreateForm, setShowCreateForm] = useState(false);

	if (items === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const navigateToConversation = (conversationId: Id<"conversations">) => {
		navigate({
			to: "/organizations/$orgId/projects/$projectId/conversations/$conversationId",
			params: {
				orgId: orgIdParam,
				projectId: projectIdParam,
				conversationId,
			},
		});
	};

	const handlePendingClick = async (triageItemId: Id<"triageItems">) => {
		const conversationId = await createFromTriageItem({ triageItemId });
		navigateToConversation(conversationId);
	};

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Triage</h1>
				<Button onClick={() => setShowCreateForm(true)} size="sm">
					<Plus className="mr-1 h-4 w-4" />
					Add Item
				</Button>
			</div>

			{showCreateForm && (
				<div className="mb-4">
					<TriageQuickAddForm
						onSuccess={() => setShowCreateForm(false)}
						projectId={projectId}
					/>
				</div>
			)}

			{items.length === 0 && !showCreateForm ? (
				<EmptyState
					description="Submit ideas and bug reports to be refined by AI."
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
									handlePendingClick(item._id);
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
