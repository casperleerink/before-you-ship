import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	FileText,
	Inbox,
	ListTodo,
	Map as MapIcon,
	MessageSquare,
} from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/"
)({
	component: ProjectDashboard,
});

const entityIconMap = {
	triage: Inbox,
	conversation: MessageSquare,
	task: ListTodo,
	doc: FileText,
	plan: MapIcon,
} as const;

function ProjectDashboard() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;

	const activity = useQuery(api.activity.list, { projectId });
	const triageItems = useQuery(api.triageItems.list, { projectId });
	const tasks = useQuery(api.tasks.list, { projectId });
	const conversations = useQuery(api.conversations.list, { projectId });
	const docs = useQuery(api.docs.list, { projectId });

	const isLoading =
		activity === undefined ||
		triageItems === undefined ||
		tasks === undefined ||
		conversations === undefined ||
		docs === undefined;

	if (isLoading) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
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

			{activity.length === 0 ? (
				<EmptyState
					description="Activity from triage items, conversations, tasks, docs, and plans will appear here."
					icon={Inbox}
					title="No activity yet"
				/>
			) : (
				<div>
					<div className="space-y-0">
						{activity.map((item, index) => {
							const EntityIcon = entityIconMap[item.entityType];
							const link = linkFor(item, orgSlug, projectIdParam);
							const isLast = index === activity.length - 1;

							return (
								<div className="relative flex gap-4" key={item._id}>
									{/* Per-item connector line */}
									{!isLast && (
										<div className="absolute top-6 bottom-0 left-3 w-px bg-border" />
									)}

									{/* Timeline dot */}
									<div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background">
										<EntityIcon className="h-3 w-3 text-muted-foreground" />
									</div>

									{/* Content */}
									<div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
										<div className="flex items-center gap-2">
											{item.description ? (
												<Link
													className="truncate font-medium text-sm transition-colors hover:text-muted-foreground"
													{...link}
												>
													{item.description}
												</Link>
											) : (
												<span className="truncate font-medium text-sm">
													{item.entityType}
												</span>
											)}
											<span className="ml-auto shrink-0 text-muted-foreground text-xs">
												{formatRelativeTime(item.createdAt)}
											</span>
										</div>
										<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
											<span>{item.user.name}</span>
											<span>&middot;</span>
											<span>{item.action}</span>
											<span>&middot;</span>
											<span>{item.entityType}</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

function linkFor(
	item: { entityType: string; entityId: string },
	orgSlug: string,
	projectIdParam: string
) {
	switch (item.entityType) {
		case "triage":
			return {
				to: "/$orgSlug/projects/$projectId/triage" as const,
				params: { orgSlug, projectId: projectIdParam },
			};
		case "conversation":
			return {
				to: "/$orgSlug/projects/$projectId/conversations/$conversationId" as const,
				params: {
					orgSlug,
					projectId: projectIdParam,
					conversationId: item.entityId,
				},
			};
		case "task":
			return {
				to: "/$orgSlug/projects/$projectId/tasks" as const,
				params: { orgSlug, projectId: projectIdParam },
			};
		case "doc":
			return {
				to: "/$orgSlug/projects/$projectId/docs" as const,
				params: { orgSlug, projectId: projectIdParam },
			};
		default:
			return {
				to: "/$orgSlug/projects/$projectId" as const,
				params: { orgSlug, projectId: projectIdParam },
			};
	}
}
