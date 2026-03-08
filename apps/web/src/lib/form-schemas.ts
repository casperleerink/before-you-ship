import { z } from "zod";

function requiredText(label: string) {
	return z
		.string()
		.refine((value) => value.trim().length > 0, `${label} is required`);
}

export const signInFormSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export function getSignInFormDefaults() {
	return {
		email: "",
		password: "",
	};
}

export const signUpFormSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	email: z.email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export function getSignUpFormDefaults() {
	return {
		email: "",
		name: "",
		password: "",
	};
}

export const organizationNameSchema = z.object({
	name: requiredText("Organization name"),
});

export function getOrganizationNameDefaults(name = "") {
	return {
		name,
	};
}

export const inviteMemberSchema = z.object({
	email: z.email("Invalid email address"),
	role: z.enum(["admin", "member"]),
});

export function getInviteMemberDefaults() {
	return {
		email: "",
		role: "member" as "admin" | "member",
	};
}

export const projectFormSchema = z.object({
	description: z.string(),
	name: requiredText("Project name"),
	repoUrl: z.string(),
});

export function getProjectFormDefaults(values?: {
	description?: string;
	name?: string;
	repoUrl?: string;
}) {
	return {
		description: values?.description ?? "",
		name: values?.name ?? "",
		repoUrl: values?.repoUrl ?? "",
	};
}

export const projectSettingsSchema = projectFormSchema.omit({ repoUrl: true });

export function getProjectSettingsDefaults(values?: {
	description?: string;
	name?: string;
}) {
	return {
		description: values?.description ?? "",
		name: values?.name ?? "",
	};
}

export const selfHostedRepoSchema = z.object({
	accessToken: z.string(),
	repoUrl: z
		.string()
		.min(1, "Repository URL is required")
		.url("Must be a valid URL"),
});

export function getSelfHostedRepoDefaults() {
	return {
		accessToken: "",
		repoUrl: "",
	};
}

export const azureDevOpsConnectionSchema = z.object({
	organizationUrl: z
		.string()
		.min(1, "Organization URL is required")
		.url("Must be a valid URL"),
	personalAccessToken: z.string().min(1, "Personal access token is required"),
});

export function getAzureDevOpsConnectionDefaults() {
	return {
		organizationUrl: "",
		personalAccessToken: "",
	};
}

export const triageItemSchema = z.object({
	content: requiredText("Content"),
});

export function getTriageItemDefaults() {
	return {
		content: "",
	};
}

export const docCreateSchema = z.object({
	title: requiredText("Document title"),
});

export function getDocCreateDefaults() {
	return {
		title: "",
	};
}

export const memberProfileFormSchema = z.object({
	assignmentEnabled: z.enum(["true", "false"]),
	availabilityNotes: z.string(),
	availabilityStatus: z.enum(["available", "limited", "unavailable"]),
	avoids: z.string(),
	department: z.string(),
	jobTitle: z.string(),
	ownedDomains: z.string(),
	preferredTaskTypes: z.string(),
	strengths: z.string(),
	timezone: z.string(),
	workDescription: z.string(),
});

export function getMemberProfileFormDefaults(values?: {
	assignmentEnabled?: boolean;
	availabilityNotes?: string;
	availabilityStatus?: "available" | "limited" | "unavailable";
	avoids?: string;
	department?: string;
	jobTitle?: string;
	ownedDomains?: string;
	preferredTaskTypes?: string;
	strengths?: string;
	timezone?: string;
	workDescription?: string;
}) {
	return {
		assignmentEnabled: values?.assignmentEnabled === false ? "false" : "true",
		availabilityNotes: values?.availabilityNotes ?? "",
		availabilityStatus: values?.availabilityStatus ?? "available",
		avoids: values?.avoids ?? "",
		department: values?.department ?? "",
		jobTitle: values?.jobTitle ?? "",
		ownedDomains: values?.ownedDomains ?? "",
		preferredTaskTypes: values?.preferredTaskTypes ?? "",
		strengths: values?.strengths ?? "",
		timezone: values?.timezone ?? "",
		workDescription: values?.workDescription ?? "",
	};
}

export const projectMemberAssignmentFormSchema = z.object({
	eligibleForAssignment: z.enum(["true", "false"]),
	notesForAI: z.string(),
	ownedAreas: z.string(),
	ownedSystems: z.string(),
	projectRoleLabel: z.string(),
});

export function getProjectMemberAssignmentFormDefaults(values?: {
	eligibleForAssignment?: boolean;
	notesForAI?: string;
	ownedAreas?: string;
	ownedSystems?: string;
	projectRoleLabel?: string;
}) {
	return {
		eligibleForAssignment:
			values?.eligibleForAssignment === false ? "false" : "true",
		notesForAI: values?.notesForAI ?? "",
		ownedAreas: values?.ownedAreas ?? "",
		ownedSystems: values?.ownedSystems ?? "",
		projectRoleLabel: values?.projectRoleLabel ?? "",
	};
}
