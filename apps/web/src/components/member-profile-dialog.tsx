import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { getAppFormOnSubmit, useAppForm } from "@/lib/app-form";
import { useAppMutation } from "@/lib/convex-mutation";
import {
	getMemberProfileFormDefaults,
	memberProfileFormSchema,
} from "@/lib/form-schemas";
import { parseListInput, stringifyListInput } from "@/lib/list-input";

interface MemberProfile {
	assignmentEnabled: boolean;
	availabilityNotes?: string;
	availabilityStatus: "available" | "limited" | "unavailable";
	avoids: string[];
	department?: string;
	jobTitle?: string;
	ownedDomains: string[];
	preferredTaskTypes: string[];
	strengths: string[];
	timezone?: string;
	workDescription?: string;
}

export function MemberProfileDialog({
	member,
	orgId,
}: {
	member: {
		_id: Id<"users">;
		name: string;
		profile?: MemberProfile;
	};
	orgId: Id<"organizations">;
}) {
	const [open, setOpen] = useState(false);
	const { mutateAsync: updateMemberProfile } = useAppMutation(
		api.organizations.updateMemberProfile
	);
	const form = useAppForm({
		defaultValues: getMemberProfileFormDefaults({
			assignmentEnabled: member.profile?.assignmentEnabled,
			availabilityNotes: member.profile?.availabilityNotes,
			availabilityStatus: member.profile?.availabilityStatus,
			avoids: stringifyListInput(member.profile?.avoids),
			department: member.profile?.department,
			jobTitle: member.profile?.jobTitle,
			ownedDomains: stringifyListInput(member.profile?.ownedDomains),
			preferredTaskTypes: stringifyListInput(
				member.profile?.preferredTaskTypes
			),
			strengths: stringifyListInput(member.profile?.strengths),
			timezone: member.profile?.timezone,
			workDescription: member.profile?.workDescription,
		}),
		onSubmit: async ({ value }) => {
			try {
				await updateMemberProfile({
					orgId,
					profile: {
						assignmentEnabled: value.assignmentEnabled === "true",
						availabilityNotes: value.availabilityNotes.trim() || undefined,
						availabilityStatus: value.availabilityStatus,
						avoids: parseListInput(value.avoids),
						department: value.department.trim() || undefined,
						jobTitle: value.jobTitle.trim() || undefined,
						ownedDomains: parseListInput(value.ownedDomains),
						preferredTaskTypes: parseListInput(value.preferredTaskTypes),
						strengths: parseListInput(value.strengths),
						timezone: value.timezone.trim() || undefined,
						workDescription: value.workDescription.trim() || undefined,
					},
					userId: member._id,
				});
				toast.success(`Updated ${member.name}'s work profile`);
				setOpen(false);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to update member profile"
				);
			}
		},
		validators: {
			onChange: memberProfileFormSchema,
			onSubmit: memberProfileFormSchema,
		},
	});

	return (
		<>
			<Button onClick={() => setOpen(true)} size="sm" variant="outline">
				Edit Profile
			</Button>
			<Dialog
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen);
					if (nextOpen) {
						form.reset(
							getMemberProfileFormDefaults({
								assignmentEnabled: member.profile?.assignmentEnabled,
								availabilityNotes: member.profile?.availabilityNotes,
								availabilityStatus: member.profile?.availabilityStatus,
								avoids: stringifyListInput(member.profile?.avoids),
								department: member.profile?.department,
								jobTitle: member.profile?.jobTitle,
								ownedDomains: stringifyListInput(member.profile?.ownedDomains),
								preferredTaskTypes: stringifyListInput(
									member.profile?.preferredTaskTypes
								),
								strengths: stringifyListInput(member.profile?.strengths),
								timezone: member.profile?.timezone,
								workDescription: member.profile?.workDescription,
							})
						);
					}
				}}
				open={open}
			>
				<DialogContent className="max-w-2xl">
					<DialogTitle>Edit Work Profile</DialogTitle>
					<DialogDescription>
						Control how the AI understands {member.name}'s role, availability,
						and strengths.
					</DialogDescription>

					<form.AppForm>
						<form
							className="mt-4 space-y-4"
							onSubmit={getAppFormOnSubmit(form)}
						>
							<div className="grid gap-4 md:grid-cols-2">
								<form.AppField name="jobTitle">
									{(field) => <field.TextField label="Job title" />}
								</form.AppField>
								<form.AppField name="department">
									{(field) => <field.TextField label="Department" />}
								</form.AppField>
							</div>
							<form.AppField name="workDescription">
								{(field) => (
									<field.TextareaField
										label="Work description"
										placeholder="What this person usually owns or is best at"
									/>
								)}
							</form.AppField>
							<div className="grid gap-4 md:grid-cols-2">
								<form.AppField name="availabilityStatus">
									{(field) => (
										<field.SelectField
											label="Availability"
											options={[
												{ label: "Available", value: "available" },
												{ label: "Limited", value: "limited" },
												{ label: "Unavailable", value: "unavailable" },
											]}
										/>
									)}
								</form.AppField>
								<form.AppField name="assignmentEnabled">
									{(field) => (
										<field.SelectField
											label="AI assignment"
											options={[
												{ label: "Enabled", value: "true" },
												{ label: "Disabled", value: "false" },
											]}
										/>
									)}
								</form.AppField>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<form.AppField name="timezone">
									{(field) => (
										<field.TextField
											label="Timezone"
											placeholder="Europe/Amsterdam"
										/>
									)}
								</form.AppField>
								<form.AppField name="availabilityNotes">
									{(field) => (
										<field.TextField
											label="Availability notes"
											placeholder="Part-time, in meetings on Tuesdays, etc."
										/>
									)}
								</form.AppField>
							</div>
							<form.AppField name="strengths">
								{(field) => (
									<field.TextareaField
										description="Comma-separated"
										label="Strengths"
									/>
								)}
							</form.AppField>
							<form.AppField name="preferredTaskTypes">
								{(field) => (
									<field.TextareaField
										description="Comma-separated"
										label="Preferred task types"
									/>
								)}
							</form.AppField>
							<div className="grid gap-4 md:grid-cols-2">
								<form.AppField name="ownedDomains">
									{(field) => (
										<field.TextareaField
											description="Comma-separated"
											label="Owned domains"
										/>
									)}
								</form.AppField>
								<form.AppField name="avoids">
									{(field) => (
										<field.TextareaField
											description="Comma-separated"
											label="Avoids"
										/>
									)}
								</form.AppField>
							</div>
							<div className="flex justify-end">
								<form.SubmitButton submittingText="Saving..." type="submit">
									Save Profile
								</form.SubmitButton>
							</div>
						</form>
					</form.AppForm>
				</DialogContent>
			</Dialog>
		</>
	);
}
