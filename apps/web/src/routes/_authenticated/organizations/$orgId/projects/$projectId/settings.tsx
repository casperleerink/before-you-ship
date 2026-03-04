import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import z from "zod";

import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/settings"
)({
	component: SettingsPage,
});

function SettingsPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const project = useQuery(api.projects.getById, { projectId });
	const updateProject = useMutation(api.projects.update);

	if (project === undefined) {
		return <Loader />;
	}

	if (!project) {
		return null;
	}

	return (
		<div className="p-6">
			<h1 className="mb-6 font-bold text-2xl">Settings</h1>
			<div className="max-w-lg space-y-6">
				<ProjectSettingsForm
					description={project.description ?? ""}
					name={project.name}
					onSubmit={async (values) => {
						await updateProject({
							projectId,
							name: values.name,
							description: values.description || undefined,
						});
						toast.success("Project settings updated");
					}}
				/>
				<div className="space-y-2">
					<Label>Repository</Label>
					<p className="text-muted-foreground text-sm">
						{project.repoUrl ?? "No repository connected"}
					</p>
				</div>
			</div>
		</div>
	);
}

function ProjectSettingsForm({
	name,
	description,
	onSubmit,
}: {
	name: string;
	description: string;
	onSubmit: (values: { name: string; description: string }) => Promise<void>;
}) {
	const form = useForm({
		defaultValues: {
			name,
			description,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(1, "Project name is required"),
				description: z.string(),
			}),
		},
	});

	return (
		<form
			className="space-y-6"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<form.Field name="name">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Project Name</Label>
						<Input
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							value={field.state.value}
						/>
						{field.state.meta.errors.map((error) => (
							<p className="text-red-500 text-sm" key={error?.message}>
								{error?.message}
							</p>
						))}
					</div>
				)}
			</form.Field>

			<form.Field name="description">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Description</Label>
						<textarea
							className="h-32 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Describe the project..."
							value={field.state.value}
						/>
						{field.state.meta.errors.map((error) => (
							<p className="text-red-500 text-sm" key={error?.message}>
								{error?.message}
							</p>
						))}
					</div>
				)}
			</form.Field>

			<form.Subscribe>
				{(state) => (
					<Button
						disabled={!state.canSubmit || state.isSubmitting}
						type="submit"
					>
						{state.isSubmitting ? "Saving..." : "Save Changes"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
