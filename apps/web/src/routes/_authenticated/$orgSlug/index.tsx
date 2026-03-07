import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	FolderGit2,
	ListTodo,
	MoreHorizontal,
	Plus,
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
import { useOrg } from "@/lib/org-context";

const searchSchema = z.object({
	tab: z.enum(["projects", "members"]).catch("projects"),
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

	if (projects === undefined) {
		return <Loader />;
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
					{tab === "projects" && (
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
				].map((tabOption) => (
					<button
						className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
							tab === tabOption.key
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

			{tab === "projects" ? (
				<ProjectsTab
					onHideCreateForm={() => setShowCreateForm(false)}
					orgId={org._id}
					orgSlug={org.slug}
					projects={projects}
					showCreateForm={showCreateForm}
				/>
			) : (
				<MembersTab currentUserRole={org.role} orgId={org._id} />
			)}
		</div>
	);
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
				<div className="space-y-3">
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
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"admin" | "member">("member");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const inviteMember = useMutation(api.organizations.inviteMember);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			await inviteMember({
				email: email.trim(),
				orgId,
				role,
			});
			setEmail("");
			setRole("member");
			toast.success("Invite sent");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send invite"
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Invite Member</CardTitle>
				<CardDescription>
					Send an invite to add someone to this organization.
				</CardDescription>
			</CardHeader>
			<form className="space-y-4 px-6 pb-6" onSubmit={handleSubmit}>
				<div className="space-y-2">
					<Label htmlFor="invite-email">Email</Label>
					<Input
						id="invite-email"
						onChange={(e) => setEmail(e.target.value)}
						placeholder="person@company.com"
						type="email"
						value={email}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="invite-role">Role</Label>
					<select
						className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
						id="invite-role"
						onChange={(e) => setRole(e.target.value as "admin" | "member")}
						value={role}
					>
						<option value="member">Member</option>
						<option value="admin">Admin</option>
					</select>
				</div>
				<Button disabled={!email.trim() || isSubmitting} type="submit">
					{isSubmitting ? "Sending..." : "Send Invite"}
				</Button>
			</form>
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
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [repoUrl, setRepoUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createProject = useMutation(api.projects.create);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			const projectId = await createProject({
				description: description.trim() || undefined,
				name: name.trim(),
				orgId,
				repoUrl: repoUrl.trim() || undefined,
			});
			onCreated();
			navigate({
				params: { orgSlug, projectId },
				to: "/$orgSlug/projects/$projectId",
			});
		} catch {
			toast.error("Failed to create project");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create Project</CardTitle>
				<CardDescription>
					Add a project to organize conversations, tasks, and docs.
				</CardDescription>
			</CardHeader>
			<form className="space-y-4 px-6 pb-6" onSubmit={handleSubmit}>
				<div className="space-y-2">
					<Label htmlFor="project-name">Project Name</Label>
					<Input
						id="project-name"
						onChange={(e) => setName(e.target.value)}
						placeholder="Mobile app"
						value={name}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="project-description">Description</Label>
					<Input
						id="project-description"
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Optional"
						value={description}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="project-repo-url">Repository URL</Label>
					<Input
						id="project-repo-url"
						onChange={(e) => setRepoUrl(e.target.value)}
						placeholder="https://github.com/org/repo"
						value={repoUrl}
					/>
				</div>
				<div className="flex gap-2">
					<Button disabled={!name.trim() || isSubmitting} type="submit">
						{isSubmitting ? "Creating..." : "Create Project"}
					</Button>
					<Button onClick={onCancel} type="button" variant="outline">
						Cancel
					</Button>
				</div>
			</form>
		</Card>
	);
}
