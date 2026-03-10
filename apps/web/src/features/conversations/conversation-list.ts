import type { ConversationStatus } from "@/lib/conversation-utils";

export type StatusFilter = ConversationStatus | "all";

const EMPTY_STATE_MESSAGES: Record<StatusFilter, string> = {
	all: "Start a conversation to refine ideas into tasks.",
	active: "No active conversations. Start one or check another tab.",
	abandoned: "No abandoned conversations.",
	completed: "No completed conversations yet.",
};

interface ConversationLike {
	status: ConversationStatus;
}

export function filterConversations<T extends ConversationLike>(
	conversations: T[] | undefined,
	status: StatusFilter
) {
	if (!conversations) {
		return [];
	}
	if (status === "all") {
		return conversations;
	}

	return conversations.filter((conversation) => conversation.status === status);
}

export function countConversationsByStatus<T extends ConversationLike>(
	conversations: T[] | undefined
) {
	const counts: Record<StatusFilter, number> = {
		all: conversations?.length ?? 0,
		active: 0,
		abandoned: 0,
		completed: 0,
	};

	for (const conversation of conversations ?? []) {
		if (conversation.status in counts) {
			counts[conversation.status as ConversationStatus] += 1;
		}
	}

	return counts;
}

export function getConversationEmptyState(status: StatusFilter) {
	return {
		description: EMPTY_STATE_MESSAGES[status],
		title:
			status === "all" ? "No conversations yet" : `No ${status} conversations`,
	};
}
