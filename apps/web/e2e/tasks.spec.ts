import { expect, test } from "@playwright/test";

import { readBootstrapState } from "./support/scenario";

test("seeded tasks filter correctly, deep-link correctly, and persist updates", async ({
	page,
}) => {
	const state = await readBootstrapState();
	const blockerTitle = `Seed blocker ${state.runId}`;
	const blockedTitle = `Seed blocked ${state.runId}`;
	const tasksPath = `/${state.scenario.orgSlug}/projects/${state.scenario.projectIds.primary}/tasks`;

	await page.goto(tasksPath);
	await expect(page.getByText(blockerTitle)).toBeVisible();
	await expect(page.getByText(blockedTitle)).toBeVisible();

	await page.getByRole("button", { name: "Status" }).click();
	await page.getByRole("menuitemcheckbox", { name: "Ready" }).click();
	await page.keyboard.press("Escape");

	await page.getByRole("button", { name: "Risk" }).click();
	await page.getByRole("menuitemcheckbox", { name: "High" }).click();
	await page.keyboard.press("Escape");

	const blockerRow = page.locator("tr").filter({ hasText: blockerTitle });
	const blockedRow = page.locator("tr").filter({ hasText: blockedTitle });

	await expect(blockerRow).toBeVisible();
	await expect(blockedRow).toHaveCount(0);

	await blockerRow.click();
	await expect(page).toHaveURL(
		new RegExp(`taskId=${state.scenario.taskIds.blocker}`)
	);
	await expect(page.getByRole("heading", { name: blockerTitle })).toBeVisible();

	await page.getByRole("button", { name: "Ready" }).click();
	await page.getByRole("menuitemradio", { name: "Done" }).click();

	await page.getByRole("button", { name: "High" }).click();
	await page.getByRole("menuitemradio", { name: "Medium" }).click();

	await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
	await page.getByRole("button", { name: "Close" }).click();
	await page.getByRole("button", { name: "Clear" }).click();
	await expect(blockerRow).toContainText("Done");
	await expect(blockerRow).toContainText("Medium");

	await page.goto(`${tasksPath}?taskId=missing-task`);
	await expect
		.poll(() => new URL(page.url()).searchParams.get("taskId"))
		.toBeNull();
	await expect(page.getByText(blockerTitle)).toBeVisible();
});
