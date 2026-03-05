import { type UIMessage, useUIMessages } from "@convex-dev/agent/react";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Loader from "@/components/loader";
import MessageContent from "@/components/message-content";
import { PlanCard } from "@/components/plan-card";
import { ToolActivityIndicator } from "@/components/tool-activity-indicator";
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
import { Input } from "@/components/ui/input";
import {
	CONVERSATION_STATUS_OPTIONS,
	conversationStatusVariant,
} from "@/lib/conversation-utils";

function MessagePartRenderer({
	part,
	partIndex,
	isUser,
	threadId,
	sendMessage,
	orgIdParam,
	projectIdParam,
}: {
	part: UIMessage["parts"][number];
	partIndex: number;
	isUser: boolean;
	threadId: string | null;
	sendMessage: (args: { threadId: string; prompt: string }) => void;
	orgIdParam: string;
	projectIdParam: string;
}) {
	const type = part.type as string;

	if (type === "text") {
		const textPart = part as unknown as { text: string; state?: string };
		if (!textPart.text) {
			return null;
		}
		return (
			<div
				className={`mb-2 rounded-lg p-3 ${
					isUser ? "ml-8 bg-primary/10" : "mr-8 bg-secondary/20"
				}`}
				key={`text-${partIndex}`}
			>
				<MessageContent
					isStreaming={textPart.state === "streaming"}
					text={textPart.text}
				/>
			</div>
		);
	}

	if (
		type.startsWith("tool-") &&
		type !== "tool-proposePlan" &&
		"state" in part
	) {
		const toolPart = part as unknown as {
			toolCallId: string;
			state: string;
		};
		return (
			<div className="mr-8 mb-2" key={toolPart.toolCallId}>
				<ToolActivityIndicator
					state={toolPart.state}
					toolName={type.replace("tool-", "")}
				/>
			</div>
		);
	}

	if (
		type === "tool-proposePlan" &&
		"state" in part &&
		part.state === "output-available"
	) {
		const toolPart = part as unknown as {
			toolCallId: string;
			output: { planId: string; taskCount: number };
		};
		return (
			<div className="mt-2 mr-8 mb-2" key={toolPart.toolCallId}>
				<PlanCard
					onRequestChanges={() => {
						if (threadId) {
							sendMessage({
								threadId,
								prompt:
									"I'd like to request changes to the proposed plan. Please ask me what I'd like to change.",
							});
						}
					}}
					orgId={orgIdParam}
					planId={toolPart.output.planId as Id<"plans">}
					projectId={projectIdParam}
				/>
			</div>
		);
	}

	return null;
}

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/conversations/$conversationId"
)({
	component: ConversationDetailPage,
});

function ConversationDetailPage() {
	const {
		orgId: orgIdParam,
		projectId: projectIdParam,
		conversationId: conversationIdParam,
	} = Route.useParams();
	const conversationId = conversationIdParam as Id<"conversations">;

	const conversation = useQuery(api.conversations.getById, {
		conversationId,
	});
	const sendMessage = useMutation(api.chat.sendMessage);
	const updateStatus = useMutation(api.conversations.updateStatus);

	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const threadId = conversation?.threadId ?? null;

	const { results: messages } = useUIMessages(
		api.chat.listMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 50, stream: true }
	);

	const messageCount = messages?.length ?? 0;
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when message count changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messageCount]);

	const hasStreamingMessage = messages?.some(
		(m: UIMessage) => m.status === "streaming"
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

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const text = input.trim();
		if (!text || isBusy || !threadId) {
			return;
		}

		setIsLoading(true);
		setInput("");

		try {
			await sendMessage({ threadId, prompt: text });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b px-6 py-3">
				<Link
					className="text-muted-foreground hover:text-foreground"
					params={{
						orgId: orgIdParam,
						projectId: projectIdParam,
					}}
					to="/organizations/$orgId/projects/$projectId/conversations"
				>
					<ArrowLeft className="h-4 w-4" />
				</Link>
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
										(o) => o.value === value
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

			<div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
				{!messages || messages.length === 0 ? (
					<div className="mt-8 text-center text-muted-foreground">
						Start the conversation by sending a message.
					</div>
				) : (
					messages.map((message: UIMessage) => {
						const isUser = message.role === "user";
						return (
							<div key={message.key}>
								<p
									className={`mb-1 font-semibold text-sm ${isUser ? "ml-8" : "mr-8"}`}
								>
									{isUser ? "You" : "AI Assistant"}
								</p>
								{message.parts?.map((part, index) => (
									<MessagePartRenderer
										isUser={isUser}
										key={
											"toolCallId" in part
												? (part as unknown as { toolCallId: string }).toolCallId
												: `part-${index}`
										}
										orgIdParam={orgIdParam}
										part={part}
										partIndex={index}
										projectIdParam={projectIdParam}
										sendMessage={sendMessage}
										threadId={threadId}
									/>
								))}
							</div>
						);
					})
				)}
				{isLoading && !hasStreamingMessage && (
					<div className="mr-8 rounded-lg bg-secondary/20 p-3">
						<p className="mb-1 font-semibold text-sm">AI Assistant</p>
						<div className="flex items-center gap-2 text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span>Thinking...</span>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			<form
				className="flex items-center gap-2 border-t px-6 py-3"
				onSubmit={handleSubmit}
			>
				<Input
					autoComplete="off"
					autoFocus
					className="flex-1"
					disabled={isBusy}
					name="prompt"
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type your message..."
					value={input}
				/>
				<Button disabled={isBusy || !input.trim()} size="icon" type="submit">
					{isBusy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send size={18} />
					)}
				</Button>
			</form>
		</div>
	);
}
