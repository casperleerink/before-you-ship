export type AvailabilityBadgeVariant = "destructive" | "outline" | "secondary";

export type OrgDashboardTab = "members" | "my-tasks" | "projects" | "settings";
export type OrgRole = "admin" | "member" | "owner";

export interface MemberAvailabilityProfile {
	assignmentEnabled: boolean;
	availabilityStatus: "available" | "limited" | "unavailable";
}

export interface WorkProfileSummary {
	department?: string;
	ownedDomains?: string[];
	strengths?: string[];
	workDescription?: string;
}

export function getOrgDashboardActiveTab(
	requestedTab: OrgDashboardTab,
	role: OrgRole
) {
	if (requestedTab === "settings" && role !== "owner") {
		return "projects";
	}

	return requestedTab;
}

export function createSlugPreview(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function getAvailabilityBadgeVariant(
	profile?: MemberAvailabilityProfile
) {
	if (!profile) {
		return "outline";
	}
	if (profile.availabilityStatus === "unavailable") {
		return "destructive";
	}
	if (profile.availabilityStatus === "limited") {
		return "secondary";
	}

	return "outline";
}

export function formatWorkProfile(profile?: WorkProfileSummary) {
	if (!profile) {
		return "No work profile configured";
	}

	const parts = [
		profile.department,
		profile.workDescription,
		profile.ownedDomains?.[0] ? `Owns ${profile.ownedDomains[0]}` : undefined,
		profile.strengths?.[0] ? `Strong in ${profile.strengths[0]}` : undefined,
	].filter((part): part is string => Boolean(part));

	return parts[0] ?? "Profile needs more detail";
}
