import { google } from "@ai-sdk/google";
import { Agent } from "@convex-dev/agent";

import { components } from "./_generated/api";

export const languageModel = google("gemini-2.5-flash");

export const chatAgent = new Agent(components.agent, {
	name: "Chat Agent",
	languageModel,
	instructions:
		"You are a helpful AI assistant. Be concise and friendly in your responses.",
});
