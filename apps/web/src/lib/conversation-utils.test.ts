import { expect, test } from "vitest";

import {
	CONVERSATION_STATUS_OPTIONS,
	conversationStatusVariant,
} from "./conversation-utils";

test("maps conversation statuses to stable options and badge variants", () => {
	expect(CONVERSATION_STATUS_OPTIONS.map((option) => option.value)).toEqual([
		"active",
		"completed",
		"abandoned",
	]);
	expect(conversationStatusVariant("active")).toBe("default");
	expect(conversationStatusVariant("completed")).toBe("secondary");
	expect(conversationStatusVariant("abandoned")).toBe("outline");
});
