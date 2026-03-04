import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { FolderGit2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/organizations/$orgId")({
	component: OrgDashboardPage,
});

function OrgDashboardPage() {
	const { orgId: orgIdParam } = Route.useParams();
	const orgId = orgIdParam as Id<"organizations">;
	const org = useQuery(api.organizations.getById, { orgId });
	const projects = useQuery(api.projects.list, { orgId });
	const [showCreateForm, setShowCreateForm] = useState(false);

	if (org === undefined || projects === undefined) {
		return <Loader />;
	}

	if (!org) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<h1 className="font-bold text-2xl">Organization not found</h1>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<Link
						className="text-muted-foreground text-sm hover:underline"
						to="/organizations"
					>
						Organizations
					</Link>
					<h1 className="font-bold text-2xl">{org.name}</h1>
				</div>
				<Button onClick={() => setShowCreateForm(true)}>
					<Plus className="mr-2 h-4 w-4" />
					New Project
				</Button>
			</div>

			{showCreateForm && (
				<div className="mb-6">
					<CreateProjectForm
						onCancel={() => setShowCreateForm(false)}
						onCreated={() => setShowCreateForm(false)}
						orgId={orgId}
					/>
				</div>
			)}

			{projects.length === 0 && !showCreateForm ? (
				<div className="py-12 text-center text-muted-foreground">
					<FolderGit2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p className="text-lg">No projects yet</p>
					<p className="mt-1 text-sm">
						Create your first project to get started.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{projects.map((project) => (
						<Card
							className="cursor-pointer transition-colors hover:bg-muted/50"
							key={project._id}
						>
							<CardHeader>
								<CardTitle>{project.name}</CardTitle>
								<CardDescription>
									{project.repoUrl ? "Repo connected" : "No repo connected"}
								</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

function CreateProjectForm({
	orgId,
	onCreated,
	onCancel,
}: {
	orgId: Id<"organizations">;
	onCreated: () => void;
	onCancel: () => void;
}) {
	const [name, setName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createProject = useMutation(api.projects.create);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			await createProject({ name: name.trim(), orgId });
			toast.success("Project created");
			onCreated();
		} catch {
			toast.error("Failed to create project");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create New Project</CardTitle>
			</CardHeader>
			<form className="space-y-4 px-4 pb-4" onSubmit={handleSubmit}>
				<div className="space-y-2">
					<Label htmlFor="project-name">Project Name</Label>
					<Input
						autoFocus
						id="project-name"
						onChange={(e) => setName(e.target.value)}
						placeholder="My Project"
						value={name}
					/>
				</div>
				<div className="flex gap-2">
					<Button disabled={!name.trim() || isSubmitting} type="submit">
						{isSubmitting ? "Creating..." : "Create Project"}
					</Button>
					<Button
						disabled={isSubmitting}
						onClick={onCancel}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
				</div>
			</form>
		</Card>
	);
}
