import type { Doc } from "@project-manager/backend/convex/_generated/dataModel";
import type { BadgeVariant } from "@/components/ui/badge";

export type ConversationStatus = Doc<"conversations">["status"];

export const CONVERSATION_STATUS_OPTIONS: {
	value: ConversationStatus;
	label: string;
}[] = [
	{ value: "active", label: "Active" },
	{ value: "completed", label: "Completed" },
	{ value: "abandoned", label: "Abandoned" },
];

export function conversationStatusVariant(
	status: ConversationStatus
): BadgeVariant {
	switch (status) {
		case "active":
			return "default";
		case "completed":
			return "secondary";
		default:
			return "outline";
	}
}
