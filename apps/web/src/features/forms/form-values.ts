export function trimEmail(email: string) {
	return email.trim();
}

export function trimName(name: string) {
	return name.trim();
}

export function toOrganizationInput(name: string) {
	return {
		name: trimName(name),
	};
}

export function toInviteMemberInput(email: string, role: "admin" | "member") {
	return {
		email: trimEmail(email),
		role,
	};
}

export function toProjectCreateInput(values: {
	description: string;
	name: string;
	repoUrl: string;
}) {
	return {
		description: values.description.trim() || undefined,
		name: trimName(values.name),
		repoUrl: values.repoUrl.trim() || undefined,
	};
}

export function toProjectSettingsInput(values: {
	description: string;
	name: string;
}) {
	return {
		description: values.description.trim(),
		name: trimName(values.name),
	};
}

export function toSelfHostedRepoInput(values: {
	accessToken: string;
	repoUrl: string;
}) {
	return {
		accessToken: values.accessToken.trim() || undefined,
		repoUrl: values.repoUrl.trim(),
	};
}

export function toDocCreateInput(title: string) {
	return {
		title: trimName(title),
	};
}
