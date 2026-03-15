import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	useMatchRoute,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	FileText,
	Inbox,
	LayoutDashboard,
	ListTodo,
	MessageSquare,
	Plus,
	Settings,
	TriangleAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { getProjectColor, ProjectDot } from "@/components/project-dot";
import TriageCaptureModal from "@/components/triage-capture-modal";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { projectByIdQuery } from "@/lib/convex-query-options";
import { useOrg } from "@/lib/org-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId"
)({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			projectByIdQuery(params.projectId as Id<"projects">)
		);
	},
	component: ProjectLayout,
});

const navItems = [
	{
		label: "Overview",
		icon: LayoutDashboard,
		to: "/$orgSlug/projects/$projectId",
		exact: true,
	},
	{
		label: "Triage",
		icon: Inbox,
		to: "/$orgSlug/projects/$projectId/triage",
	},
	{
		label: "Conversations",
		icon: MessageSquare,
		to: "/$orgSlug/projects/$projectId/conversations",
	},
	{
		label: "Tasks",
		icon: ListTodo,
		to: "/$orgSlug/projects/$projectId/tasks",
	},
	{
		label: "Docs",
		icon: FileText,
		to: "/$orgSlug/projects/$projectId/docs",
	},
	{
		label: "Settings",
		icon: Settings,
		to: "/$orgSlug/projects/$projectId/settings",
	},
] as const;

function ProjectLayout() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const org = useOrg();
	const projectId = projectIdParam as Id<"projects">;
	const { data: project, isPending } = useQuery(projectByIdQuery(projectId));
	const matchRoute = useMatchRoute();
	const [triageModalOpen, setTriageModalOpen] = useState(false);
	const { resolvedTheme } = useTheme();
	const isConversationDetail = !!matchRoute({
		fuzzy: true,
		params: { orgSlug, projectId: projectIdParam },
		to: "/$orgSlug/projects/$projectId/conversations/$conversationId",
	});

	const handleOpenTriageModal = useCallback(() => {
		setTriageModalOpen(true);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "j") {
				e.preventDefault();
				handleOpenTriageModal();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleOpenTriageModal]);

	const projectThemeStyle = useMemo(() => {
		if (!project) {
			return undefined;
		}
		const color = getProjectColor(project.name);
		const primary = resolvedTheme === "dark" ? color.dark : color.light;
		return {
			"--primary": primary,
			"--primary-foreground": "oklch(1 0 0)",
			"--sidebar-primary": primary,
			"--sidebar-primary-foreground": "oklch(1 0 0)",
		} as React.CSSProperties;
	}, [project, resolvedTheme]);

	if (isPending) {
		return <Loader />;
	}

	if (!project || project.organizationId !== org._id) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<EmptyState
					description="This project doesn't exist or you don't have access to it."
					icon={TriangleAlert}
					title="Project not found"
				/>
			</div>
		);
	}

	return (
		<div className="flex h-svh min-w-0 max-w-full" style={projectThemeStyle}>
			<aside className="flex w-60 flex-col border-r">
				<div className="flex items-center gap-2 p-3">
					<Link
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent"
						params={{ orgSlug }}
						search={{ tab: "projects" }}
						to="/$orgSlug"
					>
						<ArrowLeft className="h-4 w-4" />
						<span className="sr-only">Back to projects</span>
					</Link>
					<ProjectDot name={project.name} />
					<h2 className="min-w-0 flex-1 truncate font-semibold text-sm">
						{project.name}
					</h2>
				</div>

				<nav className="flex-1 p-2">
					{navItems.map((item) => {
						const isActive =
							"exact" in item && item.exact
								? matchRoute({
										params: { orgSlug, projectId: projectIdParam },
										to: item.to,
									})
								: matchRoute({
										fuzzy: true,
										params: { orgSlug, projectId: projectIdParam },
										to: item.to,
									});

						return (
							<Link
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
									isActive
										? "bg-accent font-medium text-accent-foreground"
										: "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
								)}
								key={item.to}
								params={{ orgSlug, projectId: projectIdParam }}
								to={item.to}
							>
								<item.icon className="h-4 w-4" />
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="p-2">
					<UserMenu />
				</div>
			</aside>

			<main className="relative flex-1 overflow-hidden">
				<div className="h-full overflow-auto">
					<Outlet />
				</div>

				{!isConversationDetail && (
					<Button
						className="absolute right-6 bottom-6 h-12 w-12 rounded-full shadow-lg"
						onClick={handleOpenTriageModal}
						size="icon"
					>
						<Plus className="h-5 w-5" />
						<span className="sr-only">Quick add triage item</span>
					</Button>
				)}
			</main>

			<TriageCaptureModal
				onOpenChange={setTriageModalOpen}
				open={triageModalOpen}
				projectId={projectId}
			/>
		</div>
	);
}
