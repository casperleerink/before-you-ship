import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Inbox, ListTodo, MessageSquare } from "lucide-react";

import { ProjectActivityList } from "@/components/project-activity-list";
import { DashboardCardsSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/"
)({
	component: ProjectDashboard,
});

function ProjectDashboard() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;

	const { data: triageItems } = useQuery(
		convexQuery(api.triageItems.list, { projectId })
	);
	const { data: tasks } = useQuery(convexQuery(api.tasks.list, { projectId }));
	const { data: conversations } = useQuery(
		convexQuery(api.conversations.list, { projectId })
	);
	const { data: docs } = useQuery(convexQuery(api.docs.list, { projectId }));

	const isLoading =
		triageItems === undefined ||
		tasks === undefined ||
		conversations === undefined ||
		docs === undefined;

	if (isLoading) {
		return <DashboardCardsSkeleton />;
	}

	const pendingTriage = triageItems.filter((t) => t.status === "pending");
	const tasksByStatus = {
		ready: tasks.filter((t) => t.status === "ready").length,
		in_progress: tasks.filter((t) => t.status === "in_progress").length,
		done: tasks.filter((t) => t.status === "done").length,
	};
	const activeConversations = conversations.filter(
		(c) => c.status === "active"
	);

	return (
		<div className="p-6">
			<h1 className="mb-6 font-bold text-2xl">Overview</h1>

			{/* Summary cards */}
			<div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
				<Link
					params={{ orgSlug, projectId: projectIdParam }}
					to="/$orgSlug/projects/$projectId/triage"
				>
					<Card size="sm">
						<CardHeader>
							<div className="flex items-center gap-2 text-muted-foreground">
								<Inbox className="h-4 w-4" />
								<CardTitle className="text-sm">Triage</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="font-bold text-3xl">{pendingTriage.length}</p>
							<p className="text-muted-foreground text-xs">pending</p>
						</CardContent>
					</Card>
				</Link>

				<Link
					params={{ orgSlug, projectId: projectIdParam }}
					search={{ complexity: [], effort: [], risk: [], status: [] }}
					to="/$orgSlug/projects/$projectId/tasks"
				>
					<Card size="sm">
						<CardHeader>
							<div className="flex items-center gap-2 text-muted-foreground">
								<ListTodo className="h-4 w-4" />
								<CardTitle className="text-sm">Tasks</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="font-bold text-3xl">{tasks.length}</p>
							<div className="flex gap-2 text-muted-foreground text-xs">
								<span>{tasksByStatus.ready} ready</span>
								<span>&middot;</span>
								<span>{tasksByStatus.in_progress} active</span>
								<span>&middot;</span>
								<span>{tasksByStatus.done} done</span>
							</div>
						</CardContent>
					</Card>
				</Link>

				<Link
					params={{ orgSlug, projectId: projectIdParam }}
					search={{ status: "active" }}
					to="/$orgSlug/projects/$projectId/conversations"
				>
					<Card size="sm">
						<CardHeader>
							<div className="flex items-center gap-2 text-muted-foreground">
								<MessageSquare className="h-4 w-4" />
								<CardTitle className="text-sm">Conversations</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="font-bold text-3xl">{activeConversations.length}</p>
							<p className="text-muted-foreground text-xs">
								active of {conversations.length} total
							</p>
						</CardContent>
					</Card>
				</Link>

				<Link
					params={{ orgSlug, projectId: projectIdParam }}
					to="/$orgSlug/projects/$projectId/docs"
				>
					<Card size="sm">
						<CardHeader>
							<div className="flex items-center gap-2 text-muted-foreground">
								<FileText className="h-4 w-4" />
								<CardTitle className="text-sm">Docs</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="font-bold text-3xl">{docs.length}</p>
							<p className="text-muted-foreground text-xs">documents</p>
						</CardContent>
					</Card>
				</Link>
			</div>

			{/* Activity timeline */}
			<h2 className="mb-4 font-semibold text-lg">Recent Activity</h2>

			<ProjectActivityList
				orgSlug={orgSlug}
				projectId={projectId}
				projectIdParam={projectIdParam}
			/>
		</div>
	);
}
