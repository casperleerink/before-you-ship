import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	FolderGit2,
	ListTodo,
	MoreHorizontal,
	Plus,
	Settings,
	Shield,
	ShieldCheck,
	UserMinus,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import Loader from "@/components/loader";
import { ProjectDot } from "@/components/project-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getAppFormOnSubmit, useAppForm } from "@/lib/app-form";
import {
	getInviteMemberDefaults,
	getOrganizationNameDefaults,
	getProjectFormDefaults,
	inviteMemberSchema,
	organizationNameSchema,
	projectFormSchema,
} from "@/lib/form-schemas";
import { useOrg } from "@/lib/org-context";

const searchSchema = z.object({
	tab: z.enum(["projects", "members", "settings"]).catch("projects"),
});

export const Route = createFileRoute("/_authenticated/$orgSlug/")({
	component: OrgDashboardPage,
	validateSearch: searchSchema,
});

function OrgDashboardPage() {
	const { orgSlug } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const org = useOrg();
	const projects = useQuery(api.projects.list, { orgId: org._id });
	const [showCreateForm, setShowCreateForm] = useState(false);
	const activeTab =
		tab === "settings" && org.role !== "owner" ? "projects" : tab;

	if (projects === undefined) {
		return <Loader />;
	}

	let tabContent: React.ReactNode;
	if (activeTab === "projects") {
		tabContent = (
			<ProjectsTab
				onHideCreateForm={() => setShowCreateForm(false)}
				orgId={org._id}
				orgSlug={org.slug}
				projects={projects}
				showCreateForm={showCreateForm}
			/>
		);
	} else if (activeTab === "members") {
		tabContent = <MembersTab currentUserRole={org.role} orgId={org._id} />;
	} else {
		tabContent = (
			<SettingsTab orgId={org._id} orgName={org.name} orgSlug={org.slug} />
		);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<Link
						className="text-muted-foreground text-sm hover:underline"
						to="/"
					>
						Organizations
					</Link>
					<h1 className="font-bold text-2xl">{org.name}</h1>
				</div>
				<div className="flex items-center gap-2">
					<Link
						params={{ orgSlug }}
						search={{
							complexity: [],
							effort: [],
							project: [],
							risk: [],
							status: [],
						}}
						to="/$orgSlug/my-tasks"
					>
						<Button variant="outline">
							<ListTodo className="mr-2 h-4 w-4" />
							My Tasks
						</Button>
					</Link>
					{activeTab === "projects" && (
						<Button onClick={() => setShowCreateForm(true)}>
							<Plus className="mr-2 h-4 w-4" />
							New Project
						</Button>
					)}
				</div>
			</div>

			<div className="mb-6 flex gap-1 border-b">
				{[
					{ key: "projects" as const, label: "Projects", icon: FolderGit2 },
					{ key: "members" as const, label: "Members", icon: Users },
					...(org.role === "owner"
						? [{ key: "settings" as const, label: "Settings", icon: Settings }]
						: []),
				].map((tabOption) => (
					<button
						className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
							activeTab === tabOption.key
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
						key={tabOption.key}
						onClick={() =>
							navigate({
								search: (prev) => ({
									...prev,
									tab: tabOption.key,
								}),
							})
						}
						type="button"
					>
						<tabOption.icon className="mr-2 inline-block h-4 w-4" />
						{tabOption.label}
					</button>
				))}
			</div>

			{tabContent}
		</div>
	);
}

function SettingsTab({
	orgId,
	orgName,
	orgSlug,
}: {
	orgId: Id<"organizations">;
	orgName: string;
	orgSlug: string;
}) {
	const navigate = useNavigate({ from: Route.fullPath });
	const updateOrganization = useMutation(api.organizations.update);
	const deleteOrganization = useMutation(api.organizations.deleteOrganization);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [deleteConfirmation, setDeleteConfirmation] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);
	const form = useAppForm({
		defaultValues: getOrganizationNameDefaults(orgName),
		onSubmit: async ({ value }) => {
			const nextName = value.name.trim();
			try {
				const updated = await updateOrganization({
					name: nextName,
					orgId,
				});
				form.reset({
					name: updated.name,
				});
				toast.success("Organization updated");
				navigate({
					params: { orgSlug: updated.slug },
					search: { tab: "settings" },
					to: "/$orgSlug",
				});
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to update organization"
				);
			}
		},
		validators: {
			onChange: organizationNameSchema,
			onSubmit: organizationNameSchema,
		},
	});

	const isDeleteConfirmed = deleteConfirmation.trim() === orgName;

	return (
		<div className="space-y-8">
			<Card>
				<CardHeader>
					<CardTitle>Organization Settings</CardTitle>
					<CardDescription>
						Rename the organization and review the URL slug that will be used
						throughout the app.
					</CardDescription>
				</CardHeader>
				<form.AppForm>
					<form
						className="space-y-4 px-6 pb-6"
						onSubmit={getAppFormOnSubmit(form)}
					>
						<form.AppField name="name">
							{(field) => <field.TextField label="Organization name" />}
						</form.AppField>
						<form.Subscribe selector={(state) => state.values.name}>
							{(name) => (
								<div className="space-y-1">
									<Label>Slug preview</Label>
									<p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
										/{createSlugPreview(name) || orgSlug}
									</p>
									<p className="text-muted-foreground text-xs">
										Renaming the organization updates its URL.
									</p>
								</div>
							)}
						</form.Subscribe>
						<form.SubmitButton submittingText="Saving..." type="submit">
							Save changes
						</form.SubmitButton>
					</form>
				</form.AppForm>
			</Card>

			<Card className="border-destructive/30">
				<CardHeader>
					<CardTitle className="text-destructive">Danger Zone</CardTitle>
					<CardDescription>
						Delete the organization and all of its projects, members, invites,
						and connected resources.
					</CardDescription>
				</CardHeader>
				<div className="px-6 pb-6">
					<Button
						onClick={() => setIsDeleteDialogOpen(true)}
						variant="destructive"
					>
						Delete Organization
					</Button>
				</div>
			</Card>

			<Dialog
				onOpenChange={(open) => {
					setIsDeleteDialogOpen(open);
					if (!open) {
						setDeleteConfirmation("");
					}
				}}
				open={isDeleteDialogOpen}
			>
				<DialogContent>
					<DialogTitle>Delete organization</DialogTitle>
					<DialogDescription>
						Type <span className="font-medium text-foreground">{orgName}</span>{" "}
						to confirm. This permanently deletes the organization and every
						project inside it.
					</DialogDescription>

					<div className="mt-4 space-y-4">
						<div className="space-y-1">
							<Label htmlFor="delete-org-confirmation">Organization name</Label>
							<Input
								id="delete-org-confirmation"
								onChange={(event) => setDeleteConfirmation(event.target.value)}
								placeholder={orgName}
								value={deleteConfirmation}
							/>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								onClick={() => setIsDeleteDialogOpen(false)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
							<Button
								disabled={!isDeleteConfirmed || isDeleting}
								onClick={async () => {
									setIsDeleting(true);
									try {
										await deleteOrganization({ orgId });
										toast.success("Organization deleted");
										navigate({ to: "/" });
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: "Failed to delete organization"
										);
									} finally {
										setIsDeleting(false);
									}
								}}
								type="button"
								variant="destructive"
							>
								{isDeleting ? "Deleting..." : "Delete Organization"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function createSlugPreview(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function ProjectsTab({
	orgId,
	orgSlug,
	projects,
	showCreateForm,
	onHideCreateForm,
}: {
	orgId: Id<"organizations">;
	orgSlug: string;
	projects: Array<{
		_id: Id<"projects">;
		name: string;
		repoUrl?: string;
	}>;
	showCreateForm: boolean;
	onHideCreateForm: () => void;
}) {
	return (
		<>
			{showCreateForm && (
				<div className="mb-6">
					<CreateProjectForm
						onCancel={onHideCreateForm}
						onCreated={onHideCreateForm}
						orgId={orgId}
						orgSlug={orgSlug}
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
				<div className="grid gap-3">
					{projects.map((project) => (
						<Link
							key={project._id}
							params={{ orgSlug, projectId: project._id }}
							to="/$orgSlug/projects/$projectId"
						>
							<Card className="cursor-pointer transition-colors hover:bg-muted/50">
								<CardHeader>
									<div className="flex items-center gap-2">
										<ProjectDot name={project.name} />
										<CardTitle>{project.name}</CardTitle>
									</div>
									<CardDescription>
										{project.repoUrl ? "Repo connected" : "No repo connected"}
									</CardDescription>
								</CardHeader>
							</Card>
						</Link>
					))}
				</div>
			)}
		</>
	);
}

function MembersTab({
	orgId,
	currentUserRole,
}: {
	orgId: Id<"organizations">;
	currentUserRole: string;
}) {
	const members = useQuery(api.organizations.listMembers, { orgId });
	const invites = useQuery(api.organizations.listInvites, { orgId });
	const canManage = currentUserRole === "owner" || currentUserRole === "admin";

	if (members === undefined || invites === undefined) {
		return <Loader />;
	}

	return (
		<div className="space-y-8">
			{canManage && <InviteMemberForm orgId={orgId} />}

			<div>
				<h3 className="mb-3 font-semibold text-lg">
					Members ({members.length})
				</h3>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							{canManage && <TableHead className="w-10" />}
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((member) => (
							<TableRow key={member._id}>
								<TableCell className="font-medium">{member.name}</TableCell>
								<TableCell className="text-muted-foreground">
									{member.email}
								</TableCell>
								<TableCell>
									<RoleBadge role={member.role} />
								</TableCell>
								{canManage && (
									<TableCell>
										<MemberActions
											currentUserRole={currentUserRole}
											member={member}
											orgId={orgId}
										/>
									</TableCell>
								)}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{invites.length > 0 && (
				<div>
					<h3 className="mb-3 font-semibold text-lg">
						Pending Invites ({invites.length})
					</h3>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Invited By</TableHead>
								{canManage && <TableHead className="w-10" />}
							</TableRow>
						</TableHeader>
						<TableBody>
							{invites.map((invite) => (
								<TableRow key={invite._id}>
									<TableCell className="font-medium">{invite.email}</TableCell>
									<TableCell>
										<RoleBadge role={invite.role} />
									</TableCell>
									<TableCell className="text-muted-foreground">
										{invite.inviterName}
									</TableCell>
									{canManage && (
										<TableCell>
											<InviteActions inviteId={invite._id} />
										</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}

function RoleBadge({ role }: { role: string }) {
	let Icon = Users;
	if (role === "owner") {
		Icon = Shield;
	} else if (role === "admin") {
		Icon = ShieldCheck;
	}

	return (
		<Badge variant={role === "owner" ? "default" : "secondary"}>
			<Icon className="mr-1 h-3 w-3" />
			{role}
		</Badge>
	);
}

function MemberActions({
	orgId,
	member,
	currentUserRole,
}: {
	orgId: Id<"organizations">;
	member: {
		_id: Id<"users">;
		name: string;
		role: string;
	};
	currentUserRole: string;
}) {
	const removeMember = useMutation(api.organizations.removeMember);
	const canRemove =
		member.role !== "owner" &&
		(currentUserRole === "owner" || member.role === "member");

	if (!canRemove) {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="icon" variant="ghost">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					className="text-destructive"
					onClick={async () => {
						await removeMember({ orgId, userId: member._id });
						toast.success(`${member.name} removed from organization`);
					}}
				>
					<UserMinus className="mr-2 h-4 w-4" />
					Remove member
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function InviteActions({ inviteId }: { inviteId: Id<"organizationInvites"> }) {
	const cancelInvite = useMutation(api.organizations.cancelInvite);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="icon" variant="ghost">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					className="text-destructive"
					onClick={async () => {
						await cancelInvite({ inviteId });
						toast.success("Invite cancelled");
					}}
				>
					<X className="mr-2 h-4 w-4" />
					Cancel invite
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function InviteMemberForm({ orgId }: { orgId: Id<"organizations"> }) {
	const inviteMember = useMutation(api.organizations.inviteMember);
	const form = useAppForm({
		defaultValues: getInviteMemberDefaults(),
		onSubmit: async ({ value }) => {
			try {
				await inviteMember({
					email: value.email.trim(),
					orgId,
					role: value.role,
				});
				form.reset();
				toast.success("Invite sent");
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to send invite"
				);
			}
		},
		validators: {
			onChange: inviteMemberSchema,
			onSubmit: inviteMemberSchema,
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Invite Member</CardTitle>
				<CardDescription>
					Send an invite to add someone to this organization.
				</CardDescription>
			</CardHeader>
			<form.AppForm>
				<form
					className="space-y-4 px-6 pb-6"
					onSubmit={getAppFormOnSubmit(form)}
				>
					<form.AppField name="email">
						{(field) => (
							<field.TextField
								label="Email"
								placeholder="person@company.com"
								type="email"
							/>
						)}
					</form.AppField>
					<form.AppField name="role">
						{(field) => (
							<field.SelectField
								label="Role"
								options={[
									{ label: "Member", value: "member" },
									{ label: "Admin", value: "admin" },
								]}
							/>
						)}
					</form.AppField>
					<form.SubmitButton submittingText="Sending..." type="submit">
						Send Invite
					</form.SubmitButton>
				</form>
			</form.AppForm>
		</Card>
	);
}

function CreateProjectForm({
	orgId,
	orgSlug,
	onCancel,
	onCreated,
}: {
	orgId: Id<"organizations">;
	orgSlug: string;
	onCancel: () => void;
	onCreated: () => void;
}) {
	const createProject = useMutation(api.projects.create);
	const navigate = useNavigate();
	const form = useAppForm({
		defaultValues: getProjectFormDefaults(),
		onSubmit: async ({ value }) => {
			try {
				const projectId = await createProject({
					description: value.description.trim() || undefined,
					name: value.name.trim(),
					orgId,
					repoUrl: value.repoUrl.trim() || undefined,
				});
				form.reset();
				onCreated();
				navigate({
					params: { orgSlug, projectId },
					to: "/$orgSlug/projects/$projectId",
				});
			} catch {
				toast.error("Failed to create project");
			}
		},
		validators: {
			onChange: projectFormSchema,
			onSubmit: projectFormSchema,
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create Project</CardTitle>
				<CardDescription>
					Add a project to organize conversations, tasks, and docs.
				</CardDescription>
			</CardHeader>
			<form.AppForm>
				<form
					className="space-y-4 px-6 pb-6"
					onSubmit={getAppFormOnSubmit(form)}
				>
					<form.AppField name="name">
						{(field) => (
							<field.TextField
								autoFocus
								label="Project Name"
								placeholder="Mobile app"
							/>
						)}
					</form.AppField>
					<form.AppField name="description">
						{(field) => (
							<field.TextField label="Description" placeholder="Optional" />
						)}
					</form.AppField>
					<form.AppField name="repoUrl">
						{(field) => (
							<field.TextField
								label="Repository URL"
								placeholder="https://github.com/org/repo"
							/>
						)}
					</form.AppField>
					<div className="flex gap-2">
						<form.SubmitButton submittingText="Creating..." type="submit">
							Create Project
						</form.SubmitButton>
						<Button onClick={onCancel} type="button" variant="outline">
							Cancel
						</Button>
					</div>
				</form>
			</form.AppForm>
		</Card>
	);
}
