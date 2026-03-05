import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";

function createLanguageModel() {
	const provider = process.env.AI_PROVIDER ?? "google";
	switch (provider) {
		case "anthropic":
			return anthropic("claude-haiku-4-5");
		case "google":
			return google("gemini-2.5-flash");
		default:
			throw new Error(
				`Unknown AI_PROVIDER "${provider}". Expected "google" or "anthropic".`
			);
	}
}

export const languageModel = createLanguageModel();

export const chatAgent = new Agent(components.agent, {
	name: "Chat Agent",
	languageModel,
	instructions:
		"You are a helpful AI assistant. Be concise and friendly in your responses.",
});
