import { readFile } from "node:fs/promises";

import { bootstrapStatePath } from "./paths";

export interface E2EBootstrapState {
	member: {
		email: string;
		name: string;
		password: string;
	};
	owner: {
		email: string;
		name: string;
		password: string;
	};
	runId: string;
	scenario: {
		conversationIds: {
			abandoned: string;
			active: string;
			completed: string;
			secondary: string;
		};
		docId: string;
		orgSlug: string;
		projectIds: {
			primary: string;
			secondary: string;
		};
		taskIds: {
			blocked: string;
			blocker: string;
			secondary: string;
		};
		triageItemId: string;
	};
}

export async function readBootstrapState() {
	const content = await readFile(bootstrapStatePath, "utf8");
	return JSON.parse(content) as E2EBootstrapState;
}
