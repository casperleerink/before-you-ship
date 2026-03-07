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
