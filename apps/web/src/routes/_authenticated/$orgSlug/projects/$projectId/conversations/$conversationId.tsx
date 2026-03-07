import { type UIMessage, useUIMessages } from "@convex-dev/agent/react";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowUp, Plus } from "lucide-react";
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
	orgSlug,
	projectId,
}: {
	part: UIMessage["parts"][number];
	partIndex: number;
	isUser: boolean;
	threadId: string | null;
	sendMessage: (args: { threadId: string; prompt: string }) => void;
	orgSlug: string;
	projectId: string;
}) {
	const type = part.type as string;

	if (type === "text") {
		const textPart = part as { state?: string; text: string };
		if (!textPart.text) {
			return null;
		}

		return (
			<div
				className={isUser ? "rounded-lg bg-primary/10 p-3" : ""}
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
		const toolPart = part as {
			state: string;
			toolCallId: string;
		};

		return (
			<div key={toolPart.toolCallId}>
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
		const toolPart = part as {
			toolCallId: string;
			output: { planId: string };
		};

		return (
			<div className="mt-1" key={toolPart.toolCallId}>
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
					orgSlug={orgSlug}
					planId={toolPart.output.planId as Id<"plans">}
					projectId={projectId}
				/>
			</div>
		);
	}

	return null;
}

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/conversations/$conversationId"
)({
	component: ConversationDetailPage,
});

function ChatComposer({
	onSubmit,
	isBusy,
}: {
	onSubmit: (text: string) => void;
	isBusy: boolean;
}) {
	const [input, setInput] = useState("");
	const canSubmit = !!input.trim() && !isBusy;

	const handleSubmit = () => {
		const text = input.trim();
		if (!text || isBusy) {
			return;
		}
		onSubmit(text);
		setInput("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<div className="px-4 pb-4">
			<div className="rounded-xl border border-border bg-card shadow-sm">
				<textarea
					className="max-h-[200px] w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
					disabled={isBusy}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Ask the AI to refine this into a plan..."
					rows={2}
					value={input}
				/>
				<div className="flex items-center justify-between px-3 pb-2">
					<Button disabled size="icon-sm" variant="ghost">
						<Plus className="h-4 w-4" />
						<span className="sr-only">Attach</span>
					</Button>
					<Button
						className="rounded-full"
						disabled={!canSubmit}
						onClick={handleSubmit}
						size="icon-sm"
					>
						<ArrowUp className="h-4 w-4" />
						<span className="sr-only">Send message</span>
					</Button>
				</div>
			</div>
		</div>
	);
}

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
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const threadId = conversation?.threadId ?? null;

	const { results: messages } = useUIMessages(
		api.chat.listMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 50, stream: true }
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages update
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

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
				<Link
					className="text-muted-foreground hover:text-foreground"
					params={{ orgSlug, projectId }}
					search={{ status: "active" }}
					to="/$orgSlug/projects/$projectId/conversations"
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

			<div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
				{!messages || messages.length === 0 ? (
					<div className="mt-8 text-center text-muted-foreground">
						Start the conversation by sending a message.
					</div>
				) : (
					messages.map((message: UIMessage) => {
						const isUser = message.role === "user";
						return (
							<div
								className={`space-y-2 ${isUser ? "ml-auto flex w-[85%] justify-end" : ""}`}
								key={message.key}
							>
								{message.parts?.map((part, index) => (
									<MessagePartRenderer
										isUser={isUser}
										key={
											"toolCallId" in part
												? (part as { toolCallId: string }).toolCallId
												: `part-${index}`
										}
										orgSlug={orgSlug}
										part={part}
										partIndex={index}
										projectId={projectId}
										sendMessage={sendMessage}
										threadId={threadId}
									/>
								))}
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			<ChatComposer isBusy={isBusy} onSubmit={handleSubmit} />
		</div>
	);
}
