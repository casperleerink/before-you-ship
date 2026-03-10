import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./support/auth";

const SIGN_IN_URL_PATTERN = /\/sign-in$/;

test.use({ storageState: { cookies: [], origins: [] } });

test("unauthenticated access redirects to sign-in", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL(SIGN_IN_URL_PATTERN);
	await expect(
		page.getByRole("heading", { name: "Welcome Back" })
	).toBeVisible();
});

test("sign up, sign out, and sign back in", async ({ page }) => {
	const runId = Date.now().toString();
	const email = `playwright-auth-${runId}@example.com`;
	const name = `Playwright Auth ${runId}`;
	const password = `Playwright-${runId}!`;
	const organizationName = `Auth Org ${runId}`;

	await page.goto("/sign-in");
	await page.getByRole("button", { name: "Need an account? Sign Up" }).click();
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign Up" }).click();

	await expect(
		page.getByRole("heading", { name: "Select Organization" })
	).toBeVisible();

	await page.getByLabel("Organization Name").fill(organizationName);
	await page.getByRole("button", { name: "Create Organization" }).click();

	await expect(
		page.getByRole("heading", { name: organizationName })
	).toBeVisible();

	await signOut(page);
	await signIn(page, { email, password });

	await expect(
		page.getByRole("heading", { name: "Select Organization" })
	).toBeVisible();
});
