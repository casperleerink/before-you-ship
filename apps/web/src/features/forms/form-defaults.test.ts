import { expect, test } from "vitest";

import {
	getDocCreateDefaults,
	getInviteMemberDefaults,
	getMemberProfileFormDefaults,
	getOrganizationNameDefaults,
	getProjectFormDefaults,
	getProjectMemberAssignmentFormDefaults,
	getProjectSettingsDefaults,
	getSelfHostedRepoDefaults,
	getSignInFormDefaults,
	getSignUpFormDefaults,
	inviteMemberSchema,
	organizationNameSchema,
	projectFormSchema,
	selfHostedRepoSchema,
	signInFormSchema,
	signUpFormSchema,
} from "@/lib/form-schemas";

import {
	toDocCreateInput,
	toInviteMemberInput,
	toOrganizationInput,
	toProjectCreateInput,
	toProjectSettingsInput,
	toSelfHostedRepoInput,
} from "./form-values";

test("returns stable default values for frontend forms", () => {
	expect(getSignInFormDefaults()).toEqual({ email: "", password: "" });
	expect(getSignUpFormDefaults()).toEqual({
		email: "",
		name: "",
		password: "",
	});
	expect(getOrganizationNameDefaults("Acme")).toEqual({ name: "Acme" });
	expect(getInviteMemberDefaults()).toEqual({ email: "", role: "member" });
	expect(getProjectFormDefaults()).toEqual({
		description: "",
		name: "",
		repoUrl: "",
	});
	expect(getProjectSettingsDefaults()).toEqual({
		description: "",
		name: "",
	});
	expect(getSelfHostedRepoDefaults()).toEqual({
		accessToken: "",
		repoUrl: "",
	});
	expect(getDocCreateDefaults()).toEqual({ title: "" });
});

test("hydrates member and assignment form defaults with safe fallbacks", () => {
	expect(
		getMemberProfileFormDefaults({
			assignmentEnabled: false,
			availabilityStatus: "limited",
			department: "Support",
		})
	).toMatchObject({
		assignmentEnabled: "false",
		availabilityStatus: "limited",
		department: "Support",
	});
	expect(
		getProjectMemberAssignmentFormDefaults({
			eligibleForAssignment: false,
			projectRoleLabel: "QA",
		})
	).toMatchObject({
		eligibleForAssignment: "false",
		projectRoleLabel: "QA",
	});
});

test("validates schema-backed forms", () => {
	expect(
		signInFormSchema.safeParse({
			email: "person@example.com",
			password: "password123",
		}).success
	).toBe(true);
	expect(
		signUpFormSchema.safeParse({
			email: "person@example.com",
			name: "Pat",
			password: "password123",
		}).success
	).toBe(true);
	expect(
		organizationNameSchema.safeParse({
			name: "   ",
		}).success
	).toBe(false);
	expect(
		inviteMemberSchema.safeParse({
			email: "teammate@example.com",
			role: "member",
		}).success
	).toBe(true);
	expect(
		projectFormSchema.safeParse({
			description: "",
			name: "Project One",
			repoUrl: "",
		}).success
	).toBe(true);
	expect(
		selfHostedRepoSchema.safeParse({
			accessToken: "",
			repoUrl: "https://github.com/acme/repo",
		}).success
	).toBe(true);
});

test("prepares trimmed submit payloads for forms with user input", () => {
	expect(toOrganizationInput("  Acme  ")).toEqual({ name: "Acme" });
	expect(toInviteMemberInput("  person@example.com  ", "admin")).toEqual({
		email: "person@example.com",
		role: "admin",
	});
	expect(
		toProjectCreateInput({
			description: "  Project description  ",
			name: "  Mobile app  ",
			repoUrl: "  https://github.com/acme/mobile  ",
		})
	).toEqual({
		description: "Project description",
		name: "Mobile app",
		repoUrl: "https://github.com/acme/mobile",
	});
	expect(
		toProjectSettingsInput({
			description: "  Updated description  ",
			name: "  Platform  ",
		})
	).toEqual({
		description: "Updated description",
		name: "Platform",
	});
	expect(
		toSelfHostedRepoInput({
			accessToken: "  secret-token  ",
			repoUrl: "  https://gitlab.example.com/acme/platform.git  ",
		})
	).toEqual({
		accessToken: "secret-token",
		repoUrl: "https://gitlab.example.com/acme/platform.git",
	});
	expect(toDocCreateInput("  Runbook  ")).toEqual({ title: "Runbook" });
});
