export const GITHUB_API_URL = "https://api.github.com";

export function getConvexSiteUrl(): string {
	const url = process.env.CONVEX_SITE_URL;
	if (!url) {
		throw new Error("CONVEX_SITE_URL must be set");
	}
	return url;
}

export function generateRandomHex(bytes = 32): string {
	const array = new Uint8Array(bytes);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
