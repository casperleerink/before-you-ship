import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$orgSlug/my-tasks")({
	beforeLoad: ({ params, search }) => {
		const typedSearch = search as {
			project?: string[];
			taskId?: string;
		};
		throw redirect({
			params: { orgSlug: params.orgSlug },
			search: {
				tab: "my-tasks" as const,
				...(typedSearch.project ? { project: typedSearch.project } : {}),
				...(typedSearch.taskId ? { taskId: typedSearch.taskId } : {}),
			},
			to: "/$orgSlug",
		});
	},
});
