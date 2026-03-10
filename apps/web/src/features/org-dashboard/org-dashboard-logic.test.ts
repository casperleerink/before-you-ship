import { expect, test } from "vitest";

import {
	createSlugPreview,
	formatWorkProfile,
	getAvailabilityBadgeVariant,
	getOrgDashboardActiveTab,
} from "./org-dashboard-logic";

test("coerces the active tab away from owner-only settings", () => {
	expect(getOrgDashboardActiveTab("settings", "member")).toBe("projects");
	expect(getOrgDashboardActiveTab("settings", "owner")).toBe("settings");
});

test("builds a stable slug preview from user input", () => {
	expect(createSlugPreview("  Product Ops / Platform  ")).toBe(
		"product-ops-platform"
	);
	expect(createSlugPreview("$$$")).toBe("");
});

test("formats work profile summaries with sensible fallbacks", () => {
	expect(
		formatWorkProfile({
			department: "Design",
			ownedDomains: ["Mobile"],
		})
	).toBe("Design");
	expect(formatWorkProfile({ strengths: ["Triage"] })).toBe("Strong in Triage");
	expect(formatWorkProfile()).toBe("No work profile configured");
});

test("maps availability state to badge variants", () => {
	expect(getAvailabilityBadgeVariant()).toBe("outline");
	expect(
		getAvailabilityBadgeVariant({
			assignmentEnabled: true,
			availabilityStatus: "limited",
		})
	).toBe("secondary");
	expect(
		getAvailabilityBadgeVariant({
			assignmentEnabled: true,
			availabilityStatus: "unavailable",
		})
	).toBe("destructive");
});
