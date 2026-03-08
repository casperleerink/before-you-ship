import { type UIMessage, useUIMessages } from "@convex-dev/agent/react";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { ChatComposer } from "@/components/chat-composer";
import { ChatMessageList } from "@/components/chat-message-list";
import { ConversationStatusDropdown } from "@/components/conversation-status-dropdown";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { useAppMutation } from "@/lib/convex-mutation";
import { conversationByIdQuery } from "@/lib/convex-query-options";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/conversations/$conversationId"
)({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			conversationByIdQuery(params.conversationId as Id<"conversations">)
		);
	},
	component: ConversationDetailPage,
});

function ConversationDetailPage() {
	const {
		conversationId: conversationIdParam,
		orgSlug,
		projectId,
	} = Route.useParams();
	const conversationId = conversationIdParam as Id<"conversations">;

	const { data: conversation, isPending } = useQuery(
		conversationByIdQuery(conversationId)
	);
	const { mutateAsync: sendMessage } = useAppMutation(api.chat.sendMessage);

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

	if (isPending) {
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
				<Button
					render={
						<Link
							params={{ orgSlug, projectId }}
							search={{ status: "active" }}
							to="/$orgSlug/projects/$projectId/conversations"
						/>
					}
					size="icon-sm"
					variant="ghost"
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<h1 className="min-w-0 flex-1 truncate font-semibold text-lg">
					{conversation.title ?? "Untitled conversation"}
				</h1>
				<ConversationStatusDropdown
					conversationId={conversationId}
					status={conversation.status}
				/>
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
