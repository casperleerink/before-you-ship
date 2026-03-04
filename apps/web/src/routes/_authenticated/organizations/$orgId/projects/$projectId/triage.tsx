import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";

import EmptyState from "@/components/empty-state";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/triage"
)({
	component: TriagePage,
});

function TriagePage() {
	return (
		<div className="p-6">
			<h1 className="mb-4 font-bold text-2xl">Triage</h1>
			<EmptyState
				description="Submit ideas and bug reports to be refined by AI."
				icon={Inbox}
				title="No triage items yet"
			/>
		</div>
	);
}
