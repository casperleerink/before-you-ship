import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { env } from "@project-manager/env/web";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
	github: z.string().optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/settings"
)({
	component: SettingsPage,
	validateSearch: searchSchema,
});

function SettingsPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const { github, error } = Route.useSearch();
	const projectId = projectIdParam as Id<"projects">;
	const project = useQuery(api.projects.getById, { projectId });
	const updateProject = useMutation(api.projects.update);

	useEffect(() => {
		if (github === "connected") {
			toast.success("GitHub account connected");
			window.history.replaceState({}, "", window.location.pathname);
		} else if (error) {
			const messages: Record<string, string> = {
				invalid_state: "Connection failed — please try again",
				expired: "Connection request expired — please try again",
				oauth_failed: "GitHub authentication failed",
			};
			toast.error(messages[error] ?? "Connection error");
			window.history.replaceState({}, "", window.location.pathname);
		}
	}, [github, error]);

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
							projectId,
							name: values.name,
							description: values.description || undefined,
						});
						toast.success("Project settings updated");
					}}
				/>
				<RepositorySection
					projectId={projectId}
					repoProvider={project.repoProvider}
					repoUrl={project.repoUrl}
					sandboxId={project.sandboxId}
				/>
			</div>
		</div>
	);
}

function RepositorySection({
	projectId,
	repoUrl,
	repoProvider,
	sandboxId,
}: {
	projectId: Id<"projects">;
	repoUrl?: string;
	repoProvider?: string;
	sandboxId?: string;
}) {
	const githubConnection = useQuery(
		api.gitConnections.getByProvider,
		repoUrl ? "skip" : { provider: "github" }
	);
	const disconnectRepo = useMutation(api.projects.disconnectRepo);

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
					sandboxId={sandboxId}
				/>
			) : (
				<div className="space-y-4">
					<GitHubConnectionStatus
						connection={githubConnection}
						projectId={projectId}
					/>
				</div>
			)}
		</div>
	);
}

function ConnectedRepo({
	repoUrl,
	repoProvider,
	sandboxId,
	onDisconnect,
}: {
	repoUrl: string;
	repoProvider?: string;
	sandboxId?: string;
	onDisconnect: () => Promise<void>;
}) {
	const [disconnecting, setDisconnecting] = useState(false);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="flex items-center gap-3">
					{repoProvider === "github" && <GitHubIcon />}
					<div>
						<p className="font-medium text-sm">{repoUrl}</p>
						<div className="mt-1 flex items-center gap-2">
							{repoProvider && (
								<Badge variant="secondary">{repoProvider}</Badge>
							)}
							{sandboxId ? (
								<Badge variant="secondary">Sandbox ready</Badge>
							) : (
								<Badge variant="outline">Setting up sandbox...</Badge>
							)}
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
	const createRequest = useMutation(api.gitConnections.createRequest);
	const disconnectGitHub = useMutation(api.gitConnections.disconnect);
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
	const listRepos = useAction(api.github.listRepos);
	const connectRepo = useMutation(api.projects.connectRepo);
	const [repos, setRepos] = useState<
		Array<{
			id: number;
			fullName: string;
			description: string | null;
			htmlUrl: string;
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
	}, [listRepos, connectionId]);

	const filteredRepos = useMemo(() => {
		if (!search) {
			return repos;
		}
		const lower = search.toLowerCase();
		return repos.filter((r) => r.fullName.toLowerCase().includes(lower));
	}, [repos, search]);

	if (!loaded) {
		return (
			<Button
				disabled={loading}
				onClick={handleLoadRepos}
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
				onChange={(e) => setSearch(e.target.value)}
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
									repoUrl: repo.htmlUrl,
									repoProvider: "github",
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
