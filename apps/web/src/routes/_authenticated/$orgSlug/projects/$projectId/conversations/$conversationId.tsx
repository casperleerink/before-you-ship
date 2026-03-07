import { type UIMessage, useUIMessages } from "@convex-dev/agent/react";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { ChatComposer } from "@/components/chat-composer";
import { ChatMessageList } from "@/components/chat-message-list";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	conversationStatusVariant,
} from "@/lib/conversation-utils";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/conversations/$conversationId"
)({
	component: ConversationDetailPage,
});

function ConversationDetailPage() {
	const {
		conversationId: conversationIdParam,
		orgSlug,
		projectId,
	} = Route.useParams();
	const conversationId = conversationIdParam as Id<"conversations">;

	const conversation = useQuery(api.conversations.getById, {
		conversationId,
	});
	const sendMessage = useMutation(api.chat.sendMessage);
	const updateStatus = useMutation(api.conversations.updateStatus);

	const [isLoading, setIsLoading] = useState(false);

	const threadId = conversation?.threadId ?? null;

	const { results: messages } = useUIMessages(
		api.chat.listMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 50, stream: true }
	);

	const hasStreamingMessage = messages?.some(
		(message: UIMessage) => message.status === "streaming"
	);
	const isBusy = isLoading || !!hasStreamingMessage;

	if (conversation === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	if (!conversation) {
		return (
			<div className="p-6">
				<h1 className="font-bold text-2xl">Conversation not found</h1>
			</div>
		);
	}

	const handleSubmit = async (text: string) => {
		if (!threadId) {
			return;
		}

		setIsLoading(true);
		try {
			await sendMessage({ prompt: text, threadId });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b px-6 py-3">
				<Button asChild size="icon-sm" variant="ghost">
					<Link
						params={{ orgSlug, projectId }}
						search={{ status: "active" }}
						to="/$orgSlug/projects/$projectId/conversations"
					>
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<h1 className="min-w-0 flex-1 truncate font-semibold text-lg">
					{conversation.title ?? "Untitled conversation"}
				</h1>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<button className="cursor-pointer" type="button">
								<Badge variant={conversationStatusVariant(conversation.status)}>
									{conversation.status}
								</Badge>
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
									if (option && option.value !== conversation.status) {
										updateStatus({
											conversationId,
											status: option.value,
										});
									}
								}}
								value={conversation.status}
							>
								{CONVERSATION_STATUS_OPTIONS.map((option) => (
									<DropdownMenuRadioItem
										key={option.value}
										value={option.value}
									>
										{option.label}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			<ChatMessageList
				messages={messages}
				orgSlug={orgSlug}
				projectId={projectId}
				sendMessage={sendMessage}
				threadId={threadId}
			/>

			<ChatComposer isBusy={isBusy} onSubmit={handleSubmit} />
		</div>
	);
}
