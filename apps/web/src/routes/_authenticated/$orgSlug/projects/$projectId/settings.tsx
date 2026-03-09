import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { env } from "@project-manager/env/web";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import Loader from "@/components/loader";
import { ProjectAssignmentTeamSection } from "@/components/project-assignment-team-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppFormOnSubmit, useAppForm, withForm } from "@/lib/app-form";
import { useAppActionMutation, useAppMutation } from "@/lib/convex-mutation";
import { projectByIdQuery } from "@/lib/convex-query-options";
import {
	getProjectSettingsDefaults,
	getSelfHostedRepoDefaults,
	projectSettingsSchema,
	selfHostedRepoSchema,
} from "@/lib/form-schemas";
import { useOrg } from "@/lib/org-context";

const searchSchema = z.object({
	error: z.string().optional(),
	github: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/settings"
)({
	component: SettingsPage,
	validateSearch: searchSchema,
});

const ProjectSettingsFields = withForm({
	defaultValues: getProjectSettingsDefaults(),
	validators: {
		onChange: projectSettingsSchema,
		onSubmit: projectSettingsSchema,
	},
	render({ form }) {
		return (
			<>
				<div>
					<Label className="text-base">Project Details</Label>
					<p className="mt-1 text-muted-foreground text-sm">
						Update the project name and description used throughout the app.
					</p>
				</div>

				<form.AppField name="name">
					{(field) => <field.TextField label="Project name" />}
				</form.AppField>

				<form.AppField name="description">
					{(field) => (
						<field.TextField label="Description" placeholder="Optional" />
					)}
				</form.AppField>

				<form.SubmitButton submittingText="Saving..." type="submit">
					Save changes
				</form.SubmitButton>
			</>
		);
	},
});

const SelfHostedRepoFields = withForm({
	defaultValues: getSelfHostedRepoDefaults(),
	validators: {
		onChange: selfHostedRepoSchema,
		onSubmit: selfHostedRepoSchema,
	},
	render({ form }) {
		return (
			<>
				<form.AppField name="repoUrl">
					{(field) => (
						<field.TextField
							errorClassName="space-y-0"
							label="Repository URL"
							placeholder="https://gitlab.example.com/org/repo.git"
						/>
					)}
				</form.AppField>

				<form.AppField name="accessToken">
					{(field) => (
						<field.TextField
							description="Optional. Use for private repositories."
							label="Access Token"
							placeholder="For private repositories"
							type="password"
						/>
					)}
				</form.AppField>

				<form.SubmitButton
					size="sm"
					submittingText="Connecting..."
					type="submit"
				>
					Connect Repository
				</form.SubmitButton>
			</>
		);
	},
});

function SettingsPage() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const { error, github } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const org = useOrg();
	const projectId = projectIdParam as Id<"projects">;
	const { data: project } = useQuery(projectByIdQuery(projectId));
	const { mutateAsync: updateProject } = useAppMutation(api.projects.update);
	const { mutateAsync: deleteProject } = useAppMutation(
		api.projects.deleteProject
	);

	useEffect(() => {
		if (!(github === "connected" || error)) {
			return;
		}

		if (github === "connected") {
			toast.success("GitHub account connected");
		} else if (error) {
			const messages: Record<string, string> = {
				expired: "Connection request expired — please try again",
				invalid_state: "Connection failed — please try again",
				oauth_failed: "GitHub authentication failed",
			};
			toast.error(messages[error] ?? "Connection error");
		}

		navigate({
			replace: true,
			search: (prev) => ({
				...prev,
				error: undefined,
				github: undefined,
			}),
		});
	}, [error, github, navigate]);

	if (project === undefined) {
		return <Loader />;
	}

	if (!project) {
		return null;
	}

	return (
		<div className="p-6">
			<h1 className="mb-6 font-bold text-2xl">Settings</h1>
			<div className="max-w-lg space-y-8">
				<ProjectSettingsForm
					description={project.description ?? ""}
					name={project.name}
					onSubmit={async (values) => {
						await updateProject({
							description: values.description || undefined,
							name: values.name,
							projectId,
						});
						toast.success("Project settings updated");
					}}
				/>
				<ProjectAssignmentTeamSection
					canManage={org.role !== "member"}
					projectId={projectId}
				/>
				<RepositorySection
					projectId={projectId}
					repoProvider={project.repoProvider}
					repoUrl={project.repoUrl}
				/>
				<DeleteProjectSection
					canDelete={org.role !== "member"}
					onDelete={async () => {
						await deleteProject({ projectId });
						toast.success("Project deleted");
						navigate({
							params: { orgSlug },
							search: { tab: "projects" },
							to: "/$orgSlug",
						});
					}}
					projectName={project.name}
				/>
			</div>
		</div>
	);
}

function DeleteProjectSection({
	projectName,
	canDelete,
	onDelete,
}: {
	projectName: string;
	canDelete: boolean;
	onDelete: () => Promise<void>;
}) {
	const [confirmValue, setConfirmValue] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);
	const [open, setOpen] = useState(false);

	if (!canDelete) {
		return null;
	}

	const isConfirmed = confirmValue.trim() === projectName;

	return (
		<div className="rounded-lg border border-destructive/30 p-6">
			<div className="space-y-1">
				<Label className="text-base text-destructive">Danger Zone</Label>
				<p className="text-muted-foreground text-sm">
					Delete this project and all of its conversations, tasks, docs,
					activity, and connected resources.
				</p>
			</div>

			<div className="mt-4">
				<Button onClick={() => setOpen(true)} variant="destructive">
					Delete Project
				</Button>
			</div>

			<Dialog
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen);
					if (!nextOpen) {
						setConfirmValue("");
					}
				}}
				open={open}
			>
				<DialogContent>
					<DialogTitle>Delete project</DialogTitle>
					<DialogDescription>
						Type{" "}
						<span className="font-medium text-foreground">{projectName}</span>{" "}
						to confirm. This action permanently removes the project and its
						associated data.
					</DialogDescription>

					<div className="mt-4 space-y-4">
						<div className="space-y-1">
							<Label htmlFor="delete-project-confirmation">Project name</Label>
							<Input
								id="delete-project-confirmation"
								onChange={(event) => setConfirmValue(event.target.value)}
								placeholder={projectName}
								value={confirmValue}
							/>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								onClick={() => setOpen(false)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
							<Button
								disabled={!isConfirmed || isDeleting}
								onClick={async () => {
									setIsDeleting(true);
									try {
										await onDelete();
										setOpen(false);
									} catch {
										toast.error("Failed to delete project");
									} finally {
										setIsDeleting(false);
									}
								}}
								type="button"
								variant="destructive"
							>
								{isDeleting ? "Deleting..." : "Delete Project"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function RepositorySection({
	projectId,
	repoUrl,
	repoProvider,
}: {
	projectId: Id<"projects">;
	repoUrl?: string;
	repoProvider?: string;
}) {
	const { data: githubConnection } = useQuery(
		convexQuery(
			api.gitConnections.getByProvider,
			repoUrl ? "skip" : { provider: "github" }
		)
	);
	const { mutateAsync: disconnectRepo } = useAppMutation(
		api.projects.disconnectRepo
	);

	return (
		<div className="space-y-4">
			<div>
				<Label className="text-base">Repository</Label>
				<p className="mt-1 text-muted-foreground text-sm">
					Connect a Git repository to enable AI codebase analysis.
				</p>
			</div>

			{repoUrl ? (
				<ConnectedRepo
					onDisconnect={async () => {
						await disconnectRepo({ projectId });
						toast.success("Repository disconnected");
					}}
					repoProvider={repoProvider}
					repoUrl={repoUrl}
				/>
			) : (
				<div className="space-y-6">
					<GitHubConnectionStatus
						connection={githubConnection}
						projectId={projectId}
					/>
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								or
							</span>
						</div>
					</div>
					<SelfHostedRepoForm projectId={projectId} />
				</div>
			)}
		</div>
	);
}

function ConnectedRepo({
	repoUrl,
	repoProvider,
	onDisconnect,
}: {
	repoUrl: string;
	repoProvider?: string;
	onDisconnect: () => Promise<void>;
}) {
	const [disconnecting, setDisconnecting] = useState(false);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="flex items-center gap-3">
					{repoProvider === "github" ? <GitHubIcon /> : <GitIcon />}
					<div>
						<p className="font-medium text-sm">{repoUrl}</p>
						<div className="mt-1 flex items-center gap-2">
							{repoProvider && (
								<Badge variant="secondary">{repoProvider}</Badge>
							)}
							<Badge variant="secondary">Repository connected</Badge>
						</div>
					</div>
				</div>
				<Button
					disabled={disconnecting}
					onClick={async () => {
						setDisconnecting(true);
						try {
							await onDisconnect();
						} finally {
							setDisconnecting(false);
						}
					}}
					size="sm"
					variant="outline"
				>
					{disconnecting ? "Disconnecting..." : "Disconnect"}
				</Button>
			</div>
		</div>
	);
}

function GitHubConnectionStatus({
	connection,
	projectId,
}: {
	connection:
		| {
				_id: Id<"gitConnections">;
				displayName: string;
				avatarUrl?: string;
		  }
		| null
		| undefined;
	projectId: Id<"projects">;
}) {
	const { mutateAsync: createRequest } = useAppMutation(
		api.gitConnections.createRequest
	);
	const { mutateAsync: disconnectGitHub } = useAppMutation(
		api.gitConnections.disconnect
	);
	const [connecting, setConnecting] = useState(false);

	const handleConnect = useCallback(async () => {
		setConnecting(true);
		try {
			const { state } = await createRequest({
				provider: "github",
				returnUrl: window.location.href.split("?")[0],
			});
			const connectUrl = `${env.VITE_CONVEX_SITE_URL}/api/github/connect?state=${state}`;
			window.location.href = connectUrl;
		} catch {
			toast.error("Failed to initiate GitHub connection");
			setConnecting(false);
		}
	}, [createRequest]);

	if (connection === undefined) {
		return null;
	}

	if (!connection) {
		return (
			<div className="rounded-lg border border-dashed p-6 text-center">
				<GitHubIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
				<p className="mb-1 font-medium text-sm">Connect GitHub</p>
				<p className="mb-4 text-muted-foreground text-xs">
					Link your GitHub account to browse and connect repositories.
				</p>
				<Button disabled={connecting} onClick={handleConnect} size="sm">
					{connecting ? "Connecting..." : "Connect GitHub"}
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between rounded-lg border p-3">
				<div className="flex items-center gap-2">
					<GitHubIcon className="size-4" />
					<span className="font-medium text-sm">{connection.displayName}</span>
					<Badge variant="secondary">Connected</Badge>
				</div>
				<Button
					onClick={async () => {
						await disconnectGitHub({
							connectionId: connection._id,
						});
						toast.success("GitHub disconnected");
					}}
					size="sm"
					variant="ghost"
				>
					Disconnect
				</Button>
			</div>
			<RepoSelector connectionId={connection._id} projectId={projectId} />
		</div>
	);
}

function RepoSelector({
	connectionId,
	projectId,
}: {
	connectionId: Id<"gitConnections">;
	projectId: Id<"projects">;
}) {
	const { mutateAsync: listRepos } = useAppActionMutation(api.github.listRepos);
	const { mutateAsync: connectRepo } = useAppMutation(api.projects.connectRepo);
	const [repos, setRepos] = useState<
		Array<{
			description: string | null;
			fullName: string;
			htmlUrl: string;
			id: number;
			isPrivate: boolean;
		}>
	>([]);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [search, setSearch] = useState("");

	const handleLoadRepos = useCallback(async () => {
		setLoading(true);
		try {
			const result = await listRepos({ connectionId, perPage: 100 });
			setRepos(result);
			setLoaded(true);
		} catch {
			toast.error("Failed to load repositories");
		} finally {
			setLoading(false);
		}
	}, [connectionId, listRepos]);

	const filteredRepos = useMemo(() => {
		if (!search) {
			return repos;
		}
		const lower = search.toLowerCase();
		return repos.filter((repo) => repo.fullName.toLowerCase().includes(lower));
	}, [repos, search]);

	if (!loaded) {
		return (
			<Button
				disabled={loading}
				onClick={() => {
					handleLoadRepos().catch(() => {
						// Errors are handled in handleLoadRepos.
					});
				}}
				size="sm"
				variant="outline"
			>
				{loading ? "Loading repositories..." : "Browse Repositories"}
			</Button>
		);
	}

	return (
		<div className="space-y-2">
			<Input
				onChange={(event) => setSearch(event.target.value)}
				placeholder="Search repositories..."
				value={search}
			/>
			<div className="max-h-64 overflow-y-auto rounded-lg border">
				{filteredRepos.length === 0 ? (
					<p className="p-4 text-center text-muted-foreground text-sm">
						{search ? "No matching repositories" : "No repositories found"}
					</p>
				) : (
					filteredRepos.map((repo) => (
						<button
							className="flex w-full items-center justify-between border-b p-3 text-left last:border-b-0 hover:bg-muted/50"
							key={repo.id}
							onClick={async () => {
								await connectRepo({
									projectId,
									repoProvider: "github",
									repoUrl: repo.htmlUrl,
								});
								toast.success(`Connected to ${repo.fullName}`);
							}}
							type="button"
						>
							<div>
								<p className="font-medium text-sm">{repo.fullName}</p>
								{repo.description && (
									<p className="text-muted-foreground text-xs">
										{repo.description}
									</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								{repo.isPrivate && <Badge variant="outline">Private</Badge>}
								<span className="text-muted-foreground text-xs">Select</span>
							</div>
						</button>
					))
				)}
			</div>
		</div>
	);
}

function SelfHostedRepoForm({ projectId }: { projectId: Id<"projects"> }) {
	const { mutateAsync: connectSelfHosted } = useAppMutation(
		api.projects.connectSelfHostedRepo
	);
	const form = useAppForm({
		defaultValues: getSelfHostedRepoDefaults(),
		onSubmit: async ({ value }) => {
			try {
				await connectSelfHosted({
					accessToken: value.accessToken.trim() || undefined,
					projectId,
					repoUrl: value.repoUrl.trim(),
				});
				toast.success("Repository connected");
				form.reset();
			} catch {
				toast.error("Failed to connect repository");
			}
		},
		validators: {
			onChange: selfHostedRepoSchema,
			onSubmit: selfHostedRepoSchema,
		},
	});

	return (
		<div className="rounded-lg border border-dashed p-6">
			<p className="mb-1 font-medium text-sm">Connect by URL</p>
			<p className="mb-4 text-muted-foreground text-xs">
				Enter a Git repository URL directly. Supports any Git host.
			</p>
			<form.AppForm>
				<form className="space-y-3" onSubmit={getAppFormOnSubmit(form)}>
					<SelfHostedRepoFields form={form} />
				</form>
			</form.AppForm>
		</div>
	);
}

function GitHubIcon({ className = "size-5" }: { className?: string }) {
	return (
		<svg
			aria-label="GitHub"
			className={className}
			fill="currentColor"
			role="img"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
		</svg>
	);
}

function GitIcon({ className = "size-5" }: { className?: string }) {
	return (
		<svg
			aria-label="Git"
			className={className}
			fill="currentColor"
			role="img"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M23.546 10.93L13.067.452a1.55 1.55 0 0 0-2.188 0L8.708 2.627l2.76 2.76a1.838 1.838 0 0 1 2.327 2.341l2.66 2.66a1.838 1.838 0 1 1-1.103 1.033l-2.48-2.48v6.53a1.838 1.838 0 1 1-1.514-.07V8.78a1.838 1.838 0 0 1-.998-2.41L7.629 3.64.452 10.818a1.55 1.55 0 0 0 0 2.187l10.48 10.48a1.55 1.55 0 0 0 2.186 0l10.428-10.43a1.55 1.55 0 0 0 0-2.125z" />
		</svg>
	);
}

function ProjectSettingsForm({
	name,
	description,
	onSubmit,
}: {
	name: string;
	description: string;
	onSubmit: (values: { description: string; name: string }) => Promise<void>;
}) {
	const form = useAppForm({
		defaultValues: getProjectSettingsDefaults({ description, name }),
		onSubmit: async ({ value }) => {
			try {
				await onSubmit({
					description: value.description.trim(),
					name: value.name.trim(),
				});
			} catch {
				toast.error("Failed to update project settings");
			}
		},
		validators: {
			onChange: projectSettingsSchema,
			onSubmit: projectSettingsSchema,
		},
	});

	return (
		<form.AppForm>
			<form
				className="space-y-4 rounded-lg border p-6"
				onSubmit={getAppFormOnSubmit(form)}
			>
				<ProjectSettingsFields form={form} />
			</form>
		</form.AppForm>
	);
}
