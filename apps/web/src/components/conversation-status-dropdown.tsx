import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	CONVERSATION_STATUS_OPTIONS,
	type ConversationStatus,
	conversationStatusVariant,
} from "@/lib/conversation-utils";
import { useAppMutation } from "@/lib/convex-mutation";

export function ConversationStatusDropdown({
	conversationId,
	status,
}: {
	conversationId: Id<"conversations">;
	status: ConversationStatus;
}) {
	const { mutate: updateStatus } = useAppMutation(
		api.conversations.updateStatus
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button className="cursor-pointer" type="button">
						<Badge variant={conversationStatusVariant(status)}>{status}</Badge>
					</button>
				}
			/>
			<DropdownMenuContent>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Status</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						onValueChange={(value) => {
							const option = CONVERSATION_STATUS_OPTIONS.find(
								(entry) => entry.value === value
							);
							if (option && option.value !== status) {
								updateStatus({ conversationId, status: option.value });
							}
						}}
						value={status}
					>
						{CONVERSATION_STATUS_OPTIONS.map((option) => (
							<DropdownMenuRadioItem key={option.value} value={option.value}>
								{option.label}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
