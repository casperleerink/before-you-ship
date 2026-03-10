import { expect, test } from "@playwright/test";

import { readBootstrapState } from "./support/scenario";

function createTaskButtonNamePattern(taskTitle: string) {
	return new RegExp(taskTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

test("project filtering narrows the ranked queue and task sheets survive deep links", async ({
	page,
}) => {
	const state = await readBootstrapState();
	const blockerTitle = `Seed blocker ${state.runId}`;
	const secondaryProjectName = `E2E Ops ${state.runId}`;
	const secondaryTaskTitle = `Seed secondary ${state.runId}`;
	const myTasksPath = `/${state.scenario.orgSlug}?tab=my-tasks`;
	const blockerTaskButton = page
		.getByRole("button", {
			name: createTaskButtonNamePattern(blockerTitle),
		})
		.first();
	const secondaryTaskButton = page
		.getByRole("button", {
			name: createTaskButtonNamePattern(secondaryTaskTitle),
		})
		.first();

	await page.goto(myTasksPath);
	await expect(blockerTaskButton).toBeVisible();
	await expect(secondaryTaskButton).toBeVisible();

	await page.getByRole("button", { exact: true, name: "Project" }).click();
	await page
		.getByRole("menuitemcheckbox", { name: secondaryProjectName })
		.click();
	await page.keyboard.press("Escape");

	await expect(secondaryTaskButton).toBeVisible();
	await expect(blockerTaskButton).toHaveCount(0);

	await secondaryTaskButton.click();
	await expect(page).toHaveURL(
		new RegExp(`taskId=${state.scenario.taskIds.secondary}`)
	);
	await expect(
		page.getByRole("heading", { name: secondaryTaskTitle })
	).toBeVisible();

	await page.reload();
	await expect(
		page.getByRole("heading", { name: secondaryTaskTitle })
	).toBeVisible();
});
