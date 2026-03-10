import { expect, test } from "@playwright/test";

import { readBootstrapState } from "./support/scenario";

const DOC_QUERY_PATTERN = /docId=/;

test("docs and project settings flows work end to end", async ({ page }) => {
	const state = await readBootstrapState();
	const projectPath = `/${state.scenario.orgSlug}/projects/${state.scenario.projectIds.primary}`;
	const settingsPath = `${projectPath}/settings`;
	const docsPath = `${projectPath}/docs`;
	const docTitle = `Playwright Doc ${Date.now()}`;
	const projectName = `Seeded Project ${Date.now()}`;
	const repoUrl = "https://gitlab.example.com/team/service.git";

	await page.goto(docsPath);
	await page.getByRole("button", { name: "New Doc" }).click();
	await page.getByLabel("Document title").fill(docTitle);
	await page.getByRole("button", { name: "Create" }).click();

	await expect(page).toHaveURL(DOC_QUERY_PATTERN);
	await expect(page.locator("input").first()).toHaveValue(docTitle);

	await page
		.locator(
			"textarea[placeholder='Write your document content in markdown...']"
		)
		.fill("# Playwright preview");
	await page.getByRole("button", { name: "Preview" }).click();
	await expect(page.getByText("Playwright preview")).toBeVisible();

	await page.goto(settingsPath);
	await page.getByLabel("Project name").fill(projectName);
	await page.getByLabel("Description").fill("Updated in Playwright");
	await page.getByRole("button", { name: "Save changes" }).click();
	await expect(page.getByLabel("Project name")).toHaveValue(projectName);

	await page.getByLabel("Repository URL").fill("not-a-url");
	await expect(page.getByText("Must be a valid URL")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Connect Repository" })
	).toBeDisabled();
	await expect(page.getByText("Must be a valid URL")).toBeVisible();

	await page.getByLabel("Repository URL").fill(repoUrl);
	await page.getByLabel("Access Token").fill("playwright-token");
	await page.getByRole("button", { name: "Connect Repository" }).click();
	await expect(
		page.getByRole("main").getByText("Repository connected").first()
	).toBeVisible();
	await expect(page.getByText(repoUrl)).toBeVisible();

	await page.getByRole("button", { name: "Disconnect" }).click();
	await expect(page.getByText("Connect by URL")).toBeVisible();
});
