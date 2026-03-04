import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/"
)({
	component: ProjectIndex,
});

function ProjectIndex() {
	const { orgId, projectId } = Route.useParams();
	return (
		<Navigate
			params={{ orgId, projectId }}
			to="/organizations/$orgId/projects/$projectId/triage"
		/>
	);
}
