import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Inbox, Plus } from "lucide-react";
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
	const { projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const items = useQuery(api.triageItems.list, { projectId });
	const [showCreateForm, setShowCreateForm] = useState(false);

	if (items === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

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
						<div
							className="flex items-start justify-between gap-4 rounded-lg border p-4"
							key={item._id}
						>
							<p className="flex-1 text-sm">{item.content}</p>
							<Badge
								variant={item.status === "pending" ? "outline" : "secondary"}
							>
								{item.status}
							</Badge>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
