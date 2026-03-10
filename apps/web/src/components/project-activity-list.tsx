import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import {
	FileText,
	Inbox,
	ListTodo,
	Loader2,
	Map as MapIcon,
	MessageSquare,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";

import EmptyState from "@/components/empty-state";
import { ActivityListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

const ACTIVITY_PAGE_SIZE = 20;

const entityIconMap = {
	triage: Inbox,
	conversation: MessageSquare,
	task: ListTodo,
	doc: FileText,
	plan: MapIcon,
} as const;

export function ProjectActivityList({
	orgSlug,
	projectId,
	projectIdParam,
}: {
	orgSlug: string;
	projectId: Id<"projects">;
	projectIdParam: string;
}) {
	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	const {
		isLoading,
		loadMore,
		results: activity,
		status,
	} = usePaginatedQuery(
		api.activity.list,
		{ projectId },
		{ initialNumItems: ACTIVITY_PAGE_SIZE }
	);
	const loadNextPage = useEffectEvent(() => {
		if (status === "CanLoadMore") {
			loadMore(ACTIVITY_PAGE_SIZE);
		}
	});

	useEffect(() => {
		const node = loadMoreRef.current;
		if (!(node && status === "CanLoadMore")) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					loadNextPage();
				}
			},
			{ rootMargin: "200px 0px" }
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [status]);

	if (isLoading && activity.length === 0) {
		return <ActivityListSkeleton />;
	}

	if (activity.length === 0) {
		return (
			<EmptyState
				description="Activity from triage items, conversations, tasks, docs, and plans will appear here."
				icon={Inbox}
				title="No activity yet"
			/>
		);
	}

	return (
		<div>
			<div className="space-y-0">
				{activity.map((item, index) => {
					const EntityIcon = entityIconMap[item.entityType];
					const link = linkFor(item, orgSlug, projectIdParam);
					const isLast =
						index === activity.length - 1 && status === "Exhausted";

					return (
						<div className="relative flex gap-4" key={item._id}>
							{!isLast && (
								<div className="absolute top-6 bottom-0 left-3 w-px bg-border" />
							)}

							<div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background">
								<EntityIcon className="h-3 w-3 text-muted-foreground" />
							</div>

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

			<div className="flex justify-center pt-2" ref={loadMoreRef}>
				{status === "CanLoadMore" || status === "LoadingMore" ? (
					<Button
						disabled={status === "LoadingMore"}
						onClick={loadNextPage}
						size="sm"
						variant="outline"
					>
						{status === "LoadingMore" ? (
							<>
								<Loader2 className="animate-spin" />
								Loading more
							</>
						) : (
							"Load more activity"
						)}
					</Button>
				) : (
					<p className="text-muted-foreground text-sm">
						You&apos;ve reached the end of the activity feed.
					</p>
				)}
			</div>
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
