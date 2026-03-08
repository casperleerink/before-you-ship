import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getAppFormOnSubmit, useAppForm } from "@/lib/app-form";
import { useAppMutation } from "@/lib/convex-mutation";
import {
	getProjectMemberAssignmentFormDefaults,
	projectMemberAssignmentFormSchema,
} from "@/lib/form-schemas";
import { parseListInput, stringifyListInput } from "@/lib/list-input";

export function ProjectAssignmentTeamSection({
	canManage,
	projectId,
}: {
	canManage: boolean;
	projectId: Id<"projects">;
}) {
	const { data: members } = useQuery(
		convexQuery(api.projects.listProjectMembersForAssignment, { projectId })
	);

	if (!canManage || members === undefined) {
		return null;
	}

	const eligibleCount = members.filter(
		(member) => member.isEligibleForAssignment
	).length;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Assignment Team</CardTitle>
				<CardDescription>
					Choose who the AI can assign work to in this project and add
					project-specific ownership details.
				</CardDescription>
				<div className="flex gap-2 pt-2 text-xs">
					<Badge variant="outline">{eligibleCount} eligible</Badge>
					{eligibleCount === 0 && (
						<Badge variant="secondary">No candidates configured</Badge>
					)}
				</div>
			</CardHeader>
			<div className="px-6 pb-6">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Member</TableHead>
							<TableHead>Access</TableHead>
							<TableHead>Project Assignment</TableHead>
							<TableHead className="w-[220px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((member) => (
							<TableRow key={member._id}>
								<TableCell>
									<div className="space-y-1">
										<div className="font-medium">{member.name}</div>
										<div className="text-muted-foreground text-xs">
											{member.email}
										</div>
									</div>
								</TableCell>
								<TableCell>
									<Badge variant="secondary">{member.role}</Badge>
								</TableCell>
								<TableCell>
									<div className="space-y-1 text-sm">
										<div>
											{member.assignment?.projectRoleLabel ??
												(member.isProjectMember
													? "In assignment pool"
													: "Not in pool")}
										</div>
										<div className="text-muted-foreground text-xs">
											{member.isEligibleForAssignment
												? "Eligible for AI assignment"
												: "Not eligible"}
										</div>
									</div>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-2">
										<ProjectAssignmentDialog
											member={member}
											projectId={projectId}
										/>
										{member.isProjectMember && (
											<RemoveProjectMemberButton
												name={member.name}
												projectId={projectId}
												userId={member._id}
											/>
										)}
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</Card>
	);
}

function ProjectAssignmentDialog({
	member,
	projectId,
}: {
	member: {
		_id: Id<"users">;
		assignment?: {
			eligibleForAssignment: boolean;
			notesForAI?: string;
			ownedAreas: string[];
			ownedSystems: string[];
			projectRoleLabel?: string;
		};
		name: string;
	};
	projectId: Id<"projects">;
}) {
	const [open, setOpen] = useState(false);
	const { mutateAsync: upsertProjectMember } = useAppMutation(
		api.projects.upsertProjectMember
	);
	const form = useAppForm({
		defaultValues: getProjectMemberAssignmentFormDefaults({
			eligibleForAssignment: member.assignment?.eligibleForAssignment,
			notesForAI: member.assignment?.notesForAI,
			ownedAreas: stringifyListInput(member.assignment?.ownedAreas),
			ownedSystems: stringifyListInput(member.assignment?.ownedSystems),
			projectRoleLabel: member.assignment?.projectRoleLabel,
		}),
		onSubmit: async ({ value }) => {
			try {
				await upsertProjectMember({
					assignment: {
						eligibleForAssignment: value.eligibleForAssignment === "true",
						notesForAI: value.notesForAI.trim() || undefined,
						ownedAreas: parseListInput(value.ownedAreas),
						ownedSystems: parseListInput(value.ownedSystems),
						projectRoleLabel: value.projectRoleLabel.trim() || undefined,
					},
					projectId,
					userId: member._id,
				});
				toast.success(`Updated ${member.name}'s project assignment settings`);
				setOpen(false);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to update assignment settings"
				);
			}
		},
		validators: {
			onChange: projectMemberAssignmentFormSchema,
			onSubmit: projectMemberAssignmentFormSchema,
		},
	});

	return (
		<>
			<Button onClick={() => setOpen(true)} size="sm" variant="outline">
				{member.assignment ? "Edit" : "Add"}
			</Button>
			<Dialog
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen);
					if (nextOpen) {
						form.reset(
							getProjectMemberAssignmentFormDefaults({
								eligibleForAssignment: member.assignment?.eligibleForAssignment,
								notesForAI: member.assignment?.notesForAI,
								ownedAreas: stringifyListInput(member.assignment?.ownedAreas),
								ownedSystems: stringifyListInput(
									member.assignment?.ownedSystems
								),
								projectRoleLabel: member.assignment?.projectRoleLabel,
							})
						);
					}
				}}
				open={open}
			>
				<DialogContent className="max-w-xl">
					<DialogTitle>Project Assignment Settings</DialogTitle>
					<DialogDescription>
						Configure how the AI should consider {member.name} for this project.
					</DialogDescription>
					<form.AppForm>
						<form
							className="mt-4 space-y-4"
							onSubmit={getAppFormOnSubmit(form)}
						>
							<div className="grid gap-4 md:grid-cols-2">
								<form.AppField name="projectRoleLabel">
									{(field) => (
										<field.TextField
											label="Project role label"
											placeholder="Frontend owner"
										/>
									)}
								</form.AppField>
								<form.AppField name="eligibleForAssignment">
									{(field) => (
										<field.SelectField
											label="Eligibility"
											options={[
												{ label: "Eligible", value: "true" },
												{ label: "Not eligible", value: "false" },
											]}
										/>
									)}
								</form.AppField>
							</div>
							<form.AppField name="ownedAreas">
								{(field) => (
									<field.TextareaField
										description="Comma-separated"
										label="Owned areas"
									/>
								)}
							</form.AppField>
							<form.AppField name="ownedSystems">
								{(field) => (
									<field.TextareaField
										description="Comma-separated"
										label="Owned systems"
									/>
								)}
							</form.AppField>
							<form.AppField name="notesForAI">
								{(field) => (
									<field.TextareaField
										label="Notes for AI"
										placeholder="Any project-specific context that helps assignment"
									/>
								)}
							</form.AppField>
							<div className="flex justify-end">
								<form.SubmitButton submittingText="Saving..." type="submit">
									Save Assignment Settings
								</form.SubmitButton>
							</div>
						</form>
					</form.AppForm>
				</DialogContent>
			</Dialog>
		</>
	);
}

function RemoveProjectMemberButton({
	name,
	projectId,
	userId,
}: {
	name: string;
	projectId: Id<"projects">;
	userId: Id<"users">;
}) {
	const { mutateAsync: removeProjectMember } = useAppMutation(
		api.projects.removeProjectMember
	);

	return (
		<Button
			onClick={async () => {
				try {
					await removeProjectMember({ projectId, userId });
					toast.success(`Removed ${name} from the assignment pool`);
				} catch (error) {
					toast.error(
						error instanceof Error
							? error.message
							: "Failed to remove project member"
					);
				}
			}}
			size="sm"
			variant="ghost"
		>
			Remove
		</Button>
	);
}
