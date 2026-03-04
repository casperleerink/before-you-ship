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
	Settings,
} from "lucide-react";

import Loader from "@/components/loader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId"
)({
	component: ProjectLayout,
});

const navItems = [
	{ label: "Triage", icon: Inbox, to: "triage" },
	{ label: "Conversations", icon: MessageSquare, to: "conversations" },
	{ label: "Tasks", icon: ListTodo, to: "tasks" },
	{ label: "Docs", icon: FileText, to: "docs" },
	{ label: "Settings", icon: Settings, to: "settings" },
] as const;

function ProjectLayout() {
	const { orgId: orgIdParam, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const project = useQuery(api.projects.getById, { projectId });
	const matchRoute = useMatchRoute();

	if (project === undefined) {
		return <Loader />;
	}

	if (!project) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<h1 className="font-bold text-2xl">Project not found</h1>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-41px)]">
			<aside className="flex w-60 flex-col border-r">
				<div className="border-b p-4">
					<Link
						className="mb-2 flex items-center gap-1 text-muted-foreground text-sm hover:underline"
						params={{ orgId: orgIdParam }}
						to="/organizations/$orgId"
					>
						<ArrowLeft className="h-3 w-3" />
						Back to projects
					</Link>
					<h2 className="truncate font-semibold text-lg">{project.name}</h2>
				</div>

				<nav className="flex-1 p-2">
					{navItems.map((item) => {
						const isActive = matchRoute({
							to: `/organizations/$orgId/projects/$projectId/${item.to}`,
							fuzzy: true,
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
								params={{
									orgId: orgIdParam,
									projectId: projectIdParam,
								}}
								to={`/organizations/$orgId/projects/$projectId/${item.to}`}
							>
								<item.icon className="h-4 w-4" />
								{item.label}
							</Link>
						);
					})}
				</nav>
			</aside>

			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}
