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
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";

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

const actionIconMap = {
	created: Plus,
	updated: Pencil,
	deleted: Trash2,
} as const;

function ProjectDashboard() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;

	const activity = useQuery(api.activity.list, { projectId });

	if (activity === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	return (
		<div className="p-6">
			<h1 className="mb-6 font-bold text-2xl">Activity</h1>

			{activity.length === 0 ? (
				<EmptyState
					description="Activity from triage items, conversations, tasks, docs, and plans will appear here."
					icon={Inbox}
					title="No activity yet"
				/>
			) : (
				<div className="relative ml-4">
					{/* Vertical timeline line */}
					<div className="absolute top-0 bottom-0 left-3 w-px bg-border" />

					<div className="space-y-4">
						{activity.map((item) => {
							const EntityIcon = entityIconMap[item.entityType];
							const ActionIcon = actionIconMap[item.action];
							const link = linkFor(item, orgSlug, projectIdParam);

							return (
								<div className="relative flex gap-4" key={item._id}>
									{/* Timeline dot */}
									<div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background">
										<EntityIcon className="h-3 w-3 text-muted-foreground" />
									</div>

									{/* Content */}
									<div className="flex min-w-0 flex-1 flex-col gap-1 pb-2">
										<div className="flex items-center gap-2">
											<span className="font-medium text-sm">
												{item.user.name}
											</span>
											<span className="flex items-center gap-1 text-muted-foreground text-xs">
												<ActionIcon className="h-3 w-3" />
												{item.action}
											</span>
											<Badge className="text-xs" variant="outline">
												{item.entityType}
											</Badge>
											<span className="ml-auto shrink-0 text-muted-foreground text-xs">
												{formatRelativeTime(item.createdAt)}
											</span>
										</div>
										{item.description && (
											<Link
												className="truncate text-muted-foreground text-sm transition-colors hover:text-foreground"
												{...link}
											>
												{item.description}
											</Link>
										)}
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

function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60_000);

	if (minutes < 1) {
		return "just now";
	}
	if (minutes < 60) {
		return `${minutes}m ago`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours}h ago`;
	}

	const days = Math.floor(hours / 24);
	if (days < 7) {
		return `${days}d ago`;
	}

	return new Date(timestamp).toLocaleDateString();
}
