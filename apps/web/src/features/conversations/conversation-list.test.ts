import { expect, test } from "vitest";

import {
	countConversationsByStatus,
	filterConversations,
	getConversationEmptyState,
} from "./conversation-list";

const conversations = [
	{
		_id: "conversation_active",
		createdAt: 1,
		createdBy: "user_1",
		projectId: "project_1",
		status: "active",
		threadId: "thread_1",
		title: "Active work",
	},
	{
		_id: "conversation_done",
		createdAt: 2,
		createdBy: "user_1",
		projectId: "project_1",
		status: "completed",
		threadId: "thread_2",
		title: "Completed work",
	},
	{
		_id: "conversation_abandoned",
		createdAt: 3,
		createdBy: "user_1",
		projectId: "project_1",
		status: "abandoned",
		threadId: "thread_3",
		title: "Abandoned work",
	},
] as const;

test("filters conversations by requested status", () => {
	expect(filterConversations([...conversations], "all")).toEqual(conversations);
	expect(filterConversations([...conversations], "completed")).toEqual([
		conversations[1],
	]);
});

test("counts conversations per status without breaking on empty input", () => {
	expect(countConversationsByStatus([...conversations])).toEqual({
		abandoned: 1,
		active: 1,
		all: 3,
		completed: 1,
	});
	expect(countConversationsByStatus(undefined)).toEqual({
		abandoned: 0,
		active: 0,
		all: 0,
		completed: 0,
	});
});

test("returns the expected empty-state copy", () => {
	expect(getConversationEmptyState("all")).toEqual({
		description: "Start a conversation to refine ideas into tasks.",
		title: "No conversations yet",
	});
	expect(getConversationEmptyState("abandoned")).toEqual({
		description: "No abandoned conversations.",
		title: "No abandoned conversations",
	});
});
