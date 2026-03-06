import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import {
	createFileRoute,
	Link,
	Outlet,
	useMatchRoute,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	ArrowLeft,
	FileText,
	Inbox,
	ListTodo,
	MessageSquare,
	Plus,
	Settings,
} from "lucide-react";
import { useState } from "react";

import Loader from "@/components/loader";
import { ModeToggle } from "@/components/mode-toggle";
import TriageQuickAddForm from "@/components/triage-quick-add-form";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { useOrg } from "@/lib/org-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId"
)({
	component: ProjectLayout,
});

const navItems = [
	{ label: "Triage", icon: Inbox, to: "/$orgSlug/projects/$projectId/triage" },
	{
		label: "Conversations",
		icon: MessageSquare,
		to: "/$orgSlug/projects/$projectId/conversations",
	},
	{ label: "Tasks", icon: ListTodo, to: "/$orgSlug/projects/$projectId/tasks" },
	{ label: "Docs", icon: FileText, to: "/$orgSlug/projects/$projectId/docs" },
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
	const project = useQuery(api.projects.getById, { projectId });
	const matchRoute = useMatchRoute();

	if (project === undefined) {
		return <Loader />;
	}

	if (!project || project.organizationId !== org._id) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<h1 className="font-bold text-2xl">Project not found</h1>
			</div>
		);
	}

	return (
		<div className="flex h-svh">
			<aside className="flex w-60 flex-col border-r">
				<div className="border-b p-4">
					<Link
						className="mb-2 flex items-center gap-1 text-muted-foreground text-sm hover:underline"
						params={{ orgSlug }}
						search={{ tab: "projects" }}
						to="/$orgSlug"
					>
						<ArrowLeft className="h-3 w-3" />
						Back to projects
					</Link>
					<h2 className="truncate font-semibold text-lg">{project.name}</h2>
				</div>

				<nav className="flex-1 p-2">
					{navItems.map((item) => {
						const isActive = matchRoute({
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

				<div className="border-t p-3">
					<div className="flex items-center justify-between">
						<UserMenu />
						<ModeToggle />
					</div>
				</div>

				<div className="border-t p-3">
					<SidebarQuickAdd projectId={projectId} />
				</div>
			</aside>

			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}

function SidebarQuickAdd({ projectId }: { projectId: Id<"projects"> }) {
	const [isOpen, setIsOpen] = useState(false);

	if (!isOpen) {
		return (
			<Button
				className="w-full"
				onClick={() => setIsOpen(true)}
				size="sm"
				variant="outline"
			>
				<Plus className="mr-1 h-4 w-4" />
				Quick Add Triage
			</Button>
		);
	}

	return (
		<TriageQuickAddForm
			layout="stacked"
			onSuccess={() => setIsOpen(false)}
			projectId={projectId}
		/>
	);
}
