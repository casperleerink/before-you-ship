import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import EmptyState from "@/components/empty-state";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/docs"
)({
	component: DocsPage,
});

function DocsPage() {
	return (
		<div className="p-6">
			<h1 className="mb-4 font-bold text-2xl">Docs</h1>
			<EmptyState
				description="Create documents to provide context for AI conversations."
				icon={FileText}
				title="No documents yet"
			/>
		</div>
	);
}
