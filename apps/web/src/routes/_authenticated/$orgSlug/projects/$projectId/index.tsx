import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/"
)({
	component: ProjectIndex,
});

function ProjectIndex() {
	const { orgSlug, projectId } = Route.useParams();
	return (
		<Navigate
			params={{ orgSlug, projectId }}
			to="/$orgSlug/projects/$projectId/triage"
		/>
	);
}
