import { expect, type Page } from "@playwright/test";

const SIGN_IN_URL_PATTERN = /\/sign-in$/;

export async function signIn(
	page: Page,
	credentials: { email: string; password: string },
	baseURL = ""
) {
	await page.goto(`${baseURL}/sign-in`);
	await page.getByLabel("Email").fill(credentials.email);
	await page.getByLabel("Password").fill(credentials.password);
	await page.getByRole("button", { name: "Sign In" }).click();
	await page.waitForURL((url) => url.pathname !== "/sign-in");
}

export async function signOut(page: Page) {
	await page.getByRole("button", { name: "User menu" }).click();
	await page.getByRole("menuitem", { name: "Sign Out" }).click();
	await expect(page).toHaveURL(SIGN_IN_URL_PATTERN);
}
