import { expect, test } from "@playwright/test";

import { readBootstrapState } from "./support/scenario";

const CONVERSATION_URL_PATTERN = /\/conversations\/.+$/;

test("create a triage item, convert it to a conversation, and keep the back-link", async ({
	page,
}) => {
	const state = await readBootstrapState();
	const projectPath = `/${state.scenario.orgSlug}/projects/${state.scenario.projectIds.primary}`;
	const triagePath = `${projectPath}/triage`;
	const triageContent = `Playwright triage ${Date.now()}`;

	await page.goto(triagePath);
	await page.getByRole("button", { name: "Quick add triage item" }).click();
	await page.getByLabel("Triage item").fill(triageContent);
	await page.getByRole("button", { name: "Add Item" }).click();

	const triageCard = page
		.getByTestId("triage-item-card")
		.filter({ hasText: triageContent });

	await expect(triageCard).toBeVisible();
	await triageCard.getByRole("button", { name: "Start conversation" }).click();

	await expect(page).toHaveURL(CONVERSATION_URL_PATTERN);
	const conversationUrl = page.url();
	await expect(page.getByText(triageContent)).toBeVisible();

	await page.goto(triagePath);
	await expect(triageCard).toBeVisible();
	await triageCard.getByRole("button", { name: "View conversation" }).click();
	await expect(page).toHaveURL(conversationUrl);
});
