import { expect, test } from "@playwright/test";

import { memberStorageStatePath } from "./support/paths";
import { readBootstrapState } from "./support/scenario";

const PROJECT_URL_PATTERN = /\/projects\/.+$/;

test("create an organization and project, then land on the project dashboard", async ({
	page,
}) => {
	const runId = Date.now().toString();
	const organizationName = `Playwright Org ${runId}`;
	const projectName = `Playwright Project ${runId}`;

	await page.goto("/");
	await expect(
		page.getByRole("heading", { name: "Select Organization" })
	).toBeVisible();

	await page.getByLabel("Organization Name").fill(organizationName);
	await page.getByRole("button", { name: "Create Organization" }).click();

	await expect(
		page.getByRole("heading", { name: organizationName })
	).toBeVisible();

	await page.getByRole("button", { name: "New Project" }).click();
	await page.getByLabel("Project Name").fill(projectName);
	await page.getByLabel("Description").fill("Playwright project creation flow");
	await page
		.getByLabel("Repository URL")
		.fill("https://github.com/example/playwright-project");
	await page.getByRole("button", { name: "Create Project" }).click();

	await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
	await expect(page.getByText(projectName)).toBeVisible();
	await expect(page).toHaveURL(PROJECT_URL_PATTERN);
});

test.describe("member access", () => {
	test.use({ storageState: memberStorageStatePath });

	test("non-owners cannot reach organization settings", async ({ page }) => {
		const state = await readBootstrapState();

		await page.goto(`/${state.scenario.orgSlug}?tab=settings`);

		await expect(
			page.getByRole("heading", {
				name: `E2E Org ${state.runId}`,
			})
		).toBeVisible();
		await expect(page.getByText("Organization Settings")).toHaveCount(0);
		await expect(
			page.locator(
				`a[href='/${state.scenario.orgSlug}/projects/${state.scenario.projectIds.primary}']`
			)
		).toBeVisible();
	});
});
