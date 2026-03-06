import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Inbox, ListTodo, MessageSquare } from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/"
)({
	component: ProjectDashboard,
});

type ActivityItem =
	| {
			type: "triage";
			id: string;
			content: string;
			createdAt: number;
			status: string;
			conversationId?: Id<"conversations">;
	  }
	| {
			type: "conversation";
			id: string;
			title: string;
			createdAt: number;
			status: string;
	  }
	| {
			type: "task";
			id: string;
			title: string;
			createdAt: number;
			status: string;
	  };

function ProjectDashboard() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;

	const triageItems = useQuery(api.triageItems.list, { projectId });
	const conversations = useQuery(api.conversations.list, { projectId });
	const tasks = useQuery(api.tasks.list, { projectId });

	if (
		triageItems === undefined ||
		conversations === undefined ||
		tasks === undefined
	) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const feed: ActivityItem[] = [
		...triageItems.map((item) => ({
			type: "triage" as const,
			id: item._id,
			content: item.content,
			createdAt: item.createdAt,
			status: item.status,
			conversationId: item.conversationId,
		})),
		...conversations.map((c) => ({
			type: "conversation" as const,
			id: c._id,
			title: c.title ?? "Untitled conversation",
			createdAt: c.createdAt,
			status: c.status,
		})),
		...tasks.map((t) => ({
			type: "task" as const,
			id: t._id,
			title: t.title,
			createdAt: t.createdAt,
			status: t.status,
		})),
	]
		.sort((a, b) => b.createdAt - a.createdAt)
		.slice(0, 20);

	const iconMap = {
		triage: Inbox,
		conversation: MessageSquare,
		task: ListTodo,
	};

	const linkFor = (item: ActivityItem) => {
		switch (item.type) {
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
						conversationId: item.id,
					},
				};
			case "task":
				return {
					to: "/$orgSlug/projects/$projectId/tasks" as const,
					params: { orgSlug, projectId: projectIdParam },
				};
			default:
				return {
					to: "/$orgSlug/projects/$projectId" as const,
					params: { orgSlug, projectId: projectIdParam },
				};
		}
	};

	const labelFor = (item: ActivityItem) => {
		switch (item.type) {
			case "triage":
				return item.content;
			case "conversation":
				return item.title;
			case "task":
				return item.title;
			default:
				return "";
		}
	};

	return (
		<div className="p-6">
			<h1 className="mb-6 font-bold text-2xl">Activity</h1>

			{feed.length === 0 ? (
				<EmptyState
					description="Triage items, conversations, and tasks will appear here."
					icon={Inbox}
					title="No activity yet"
				/>
			) : (
				<div className="space-y-2">
					{feed.map((item) => {
						const Icon = iconMap[item.type];
						const link = linkFor(item);

						return (
							<Link
								className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
								key={`${item.type}-${item.id}`}
								{...link}
							>
								<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="min-w-0 flex-1 truncate text-sm">
									{labelFor(item)}
								</span>
								<Badge className="shrink-0" variant="outline">
									{item.status}
								</Badge>
								<span className="shrink-0 text-muted-foreground text-xs">
									{formatRelativeTime(item.createdAt)}
								</span>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
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
