import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import Loader from "@/components/loader";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/settings"
)({
	component: SettingsPage,
});

function SettingsPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const project = useQuery(api.projects.getById, { projectId });

	if (project === undefined) {
		return <Loader />;
	}

	if (!project) {
		return null;
	}

	return (
		<div className="p-6">
			<h1 className="mb-4 font-bold text-2xl">Settings</h1>
			<div className="space-y-4">
				<div>
					<h3 className="font-medium text-muted-foreground text-sm">
						Project Name
					</h3>
					<p className="text-lg">{project.name}</p>
				</div>
				<div>
					<h3 className="font-medium text-muted-foreground text-sm">
						Repository
					</h3>
					<p className="text-lg">
						{project.repoUrl ?? "No repository connected"}
					</p>
				</div>
				<div>
					<h3 className="font-medium text-muted-foreground text-sm">
						Description
					</h3>
					<p className="text-lg">{project.description ?? "No description"}</p>
				</div>
			</div>
		</div>
	);
}
