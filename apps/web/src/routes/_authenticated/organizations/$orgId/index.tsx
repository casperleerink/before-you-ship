import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
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

import Loader from "@/components/loader";
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
	DropdownMenuSeparator,
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

export const Route = createFileRoute("/_authenticated/organizations/$orgId/")({
	component: OrgDashboardPage,
});

type Tab = "projects" | "members";

function OrgDashboardPage() {
	const { orgId: orgIdParam } = Route.useParams();
	const orgId = orgIdParam as Id<"organizations">;
	const org = useQuery(api.organizations.getById, { orgId });
	const projects = useQuery(api.projects.list, { orgId });
	const [activeTab, setActiveTab] = useState<Tab>("projects");
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
				<div className="flex items-center gap-2">
					<Link
						params={{ orgId: orgIdParam }}
						to="/organizations/$orgId/my-tasks"
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
				].map((tab) => (
					<button
						className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
							activeTab === tab.key
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
						key={tab.key}
						onClick={() => setActiveTab(tab.key)}
						type="button"
					>
						<tab.icon className="mr-2 inline-block h-4 w-4" />
						{tab.label}
					</button>
				))}
			</div>

			{activeTab === "projects" && (
				<ProjectsTab
					onHideCreateForm={() => setShowCreateForm(false)}
					orgId={orgId}
					orgIdParam={orgIdParam}
					projects={projects}
					showCreateForm={showCreateForm}
				/>
			)}

			{activeTab === "members" && (
				<MembersTab currentUserRole={org.role} orgId={orgId} />
			)}
		</div>
	);
}

function ProjectsTab({
	orgId,
	orgIdParam,
	projects,
	showCreateForm,
	onHideCreateForm,
}: {
	orgId: Id<"organizations">;
	orgIdParam: string;
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
							params={{ orgId: orgIdParam, projectId: project._id }}
							to="/organizations/$orgId/projects/$projectId"
						>
							<Card className="cursor-pointer transition-colors hover:bg-muted/50">
								<CardHeader>
									<CardTitle>{project.name}</CardTitle>
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
											<CancelInviteButton inviteId={invite._id} />
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
	let variant: "default" | "secondary" | "outline" = "outline";
	if (role === "owner") {
		variant = "default";
	} else if (role === "admin") {
		variant = "secondary";
	}
	return <Badge variant={variant}>{role}</Badge>;
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
			await inviteMember({ orgId, email: email.trim(), role });
			toast.success(`Invite sent to ${email.trim()}`);
			setEmail("");
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
			</CardHeader>
			<form className="space-y-4 px-4 pb-4" onSubmit={handleSubmit}>
				<div className="flex gap-3">
					<div className="flex-1 space-y-2">
						<Label htmlFor="invite-email">Email</Label>
						<Input
							id="invite-email"
							onChange={(e) => setEmail(e.target.value)}
							placeholder="user@example.com"
							type="email"
							value={email}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="invite-role">Role</Label>
						<select
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
							id="invite-role"
							onChange={(e) => setRole(e.target.value as "admin" | "member")}
							value={role}
						>
							<option value="member">Member</option>
							<option value="admin">Admin</option>
						</select>
					</div>
				</div>
				<Button disabled={!email.trim() || isSubmitting} type="submit">
					{isSubmitting ? "Sending..." : "Send Invite"}
				</Button>
			</form>
		</Card>
	);
}

function MemberActions({
	orgId,
	member,
	currentUserRole,
}: {
	orgId: Id<"organizations">;
	member: { _id: Id<"users">; role: string };
	currentUserRole: string;
}) {
	const removeMember = useMutation(api.organizations.removeMember);
	const updateRole = useMutation(api.organizations.updateMemberRole);

	if (member.role === "owner") {
		return null;
	}

	const canChangeRole = currentUserRole === "owner";
	const canRemove =
		currentUserRole === "owner" ||
		(currentUserRole === "admin" && member.role !== "admin");

	if (!(canChangeRole || canRemove)) {
		return null;
	}

	const handleRemove = async () => {
		try {
			await removeMember({ orgId, userId: member._id });
			toast.success("Member removed");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to remove member"
			);
		}
	};

	const handleRoleChange = async (newRole: "admin" | "member") => {
		try {
			await updateRole({ orgId, userId: member._id, role: newRole });
			toast.success("Role updated");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update role"
			);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Member actions"
				className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
			>
				<MoreHorizontal className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{canChangeRole && member.role !== "admin" && (
					<DropdownMenuItem onClick={() => handleRoleChange("admin")}>
						<ShieldCheck className="mr-2 h-4 w-4" />
						Make Admin
					</DropdownMenuItem>
				)}
				{canChangeRole && member.role !== "member" && (
					<DropdownMenuItem onClick={() => handleRoleChange("member")}>
						<Shield className="mr-2 h-4 w-4" />
						Make Member
					</DropdownMenuItem>
				)}
				{canRemove && (
					<>
						{canChangeRole && <DropdownMenuSeparator />}
						<DropdownMenuItem onClick={handleRemove} variant="destructive">
							<UserMinus className="mr-2 h-4 w-4" />
							Remove
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function CancelInviteButton({
	inviteId,
}: {
	inviteId: Id<"organizationInvites">;
}) {
	const cancelInvite = useMutation(api.organizations.cancelInvite);

	const handleCancel = async () => {
		try {
			await cancelInvite({ inviteId });
			toast.success("Invite cancelled");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to cancel invite"
			);
		}
	};

	return (
		<button
			aria-label="Cancel invite"
			className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
			onClick={handleCancel}
			type="button"
		>
			<X className="h-4 w-4" />
		</button>
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
	const [description, setDescription] = useState("");
	const [repoUrl, setRepoUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createProject = useMutation(api.projects.create);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			await createProject({
				name: name.trim(),
				description: description.trim() || undefined,
				repoUrl: repoUrl.trim() || undefined,
				orgId,
			});
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
				<div className="space-y-2">
					<Label htmlFor="project-description">
						Description{" "}
						<span className="text-muted-foreground">(optional)</span>
					</Label>
					<textarea
						className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
						id="project-description"
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Brief description of the project"
						value={description}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="project-repo-url">
						Repository URL{" "}
						<span className="text-muted-foreground">(optional)</span>
					</Label>
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
