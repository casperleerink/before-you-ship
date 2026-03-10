import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

import { signIn } from "./support/auth";
import {
	authDir,
	bootstrapStatePath,
	memberStorageStatePath,
	ownerStorageStatePath,
} from "./support/paths";
import type { E2EBootstrapState } from "./support/scenario";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_API_READY_TIMEOUT_MS = 90_000;
const E2E_API_RETRY_DELAY_MS = 2000;

function loadE2EEnvFiles() {
	loadDotenv({ path: path.resolve(__dirname, "../.env") });
	loadDotenv({
		path: path.resolve(__dirname, "../../../packages/backend/.env.local"),
	});
}

function getBaseUrl(config: FullConfig) {
	const configuredBaseUrl = config.projects[0]?.use.baseURL;
	if (typeof configuredBaseUrl !== "string" || configuredBaseUrl.length === 0) {
		throw new Error("Playwright baseURL must be configured");
	}
	return configuredBaseUrl;
}

function getE2EApiBaseUrl() {
	const apiBaseUrl =
		process.env.PLAYWRIGHT_E2E_API_URL ??
		process.env.VITE_CONVEX_SITE_URL ??
		process.env.CONVEX_SITE_URL;
	if (!apiBaseUrl) {
		throw new Error(
			"Playwright E2E API base URL must be configured via PLAYWRIGHT_E2E_API_URL, VITE_CONVEX_SITE_URL, or CONVEX_SITE_URL"
		);
	}
	return apiBaseUrl;
}

async function readResponseBody(response: Response) {
	const bodyText = await response.text();
	try {
		return JSON.stringify(JSON.parse(bodyText), null, 2);
	} catch {
		return bodyText;
	}
}

async function postJson(baseURL: string, path: string, init: RequestInit) {
	const response = await fetch(`${baseURL}${path}`, init);
	if (!response.ok) {
		throw new Error(
			`${path} failed with ${response.status}:\n${await readResponseBody(response)}`
		);
	}

	return response;
}

function sleep(durationMs: number) {
	return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function isRetryableE2EApiError(error: unknown) {
	if (!(error instanceof Error)) {
		return false;
	}

	return (
		error.message.includes("failed with 404") ||
		error.message.includes("failed with 502") ||
		error.message.includes("failed with 503") ||
		error.message.includes("fetch failed")
	);
}

async function postJsonWithRetry(
	baseURL: string,
	requestPath: string,
	init: RequestInit
) {
	const deadline = Date.now() + E2E_API_READY_TIMEOUT_MS;
	let lastError: unknown;

	while (Date.now() < deadline) {
		try {
			return await postJson(baseURL, requestPath, init);
		} catch (error) {
			lastError = error;
			if (!isRetryableE2EApiError(error)) {
				throw error;
			}
		}

		await sleep(E2E_API_RETRY_DELAY_MS);
	}

	throw lastError instanceof Error
		? lastError
		: new Error(`Timed out waiting for ${requestPath} to become ready`);
}

function getE2EHeaders(extraHeaders: Record<string, string> = {}) {
	const secret = process.env.CONVEX_E2E_SECRET;
	return {
		...(secret ? { "x-e2e-secret": secret } : {}),
		...extraHeaders,
	};
}

export default async function globalSetup(config: FullConfig) {
	loadE2EEnvFiles();

	const baseURL = getBaseUrl(config);
	const e2eApiBaseUrl = getE2EApiBaseUrl();

	await mkdir(authDir, { recursive: true });

	await postJsonWithRetry(e2eApiBaseUrl, "/api/e2e/reset", {
		headers: getE2EHeaders(),
		method: "POST",
	});

	const runId =
		process.env.PLAYWRIGHT_E2E_RUN_ID ??
		`playwright-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const bootstrapResponse = await postJsonWithRetry(
		e2eApiBaseUrl,
		"/api/e2e/bootstrap",
		{
			body: JSON.stringify({ runId }),
			headers: getE2EHeaders({
				"content-type": "application/json",
			}),
			method: "POST",
		}
	);
	const bootstrapState = (await bootstrapResponse.json()) as E2EBootstrapState;

	await writeFile(
		bootstrapStatePath,
		JSON.stringify(bootstrapState, null, 2),
		"utf8"
	);

	const browser = await chromium.launch();

	const ownerContext = await browser.newContext({ baseURL });
	const ownerPage = await ownerContext.newPage();
	await signIn(ownerPage, bootstrapState.owner, baseURL);
	await ownerContext.storageState({ path: ownerStorageStatePath });
	await ownerContext.close();

	const memberContext = await browser.newContext({ baseURL });
	const memberPage = await memberContext.newPage();
	await signIn(memberPage, bootstrapState.member, baseURL);
	await memberContext.storageState({ path: memberStorageStatePath });
	await memberContext.close();

	await browser.close();
}
