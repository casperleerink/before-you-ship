import type { UIMessage } from "@convex-dev/agent/react";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useEffect, useRef } from "react";

import { DocCard } from "@/components/doc-card";
import MessageContent from "@/components/message-content";
import { PlanCard } from "@/components/plan-card";
import { ToolActivityIndicator } from "@/components/tool-activity-indicator";
import { cn } from "@/lib/utils";

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
	sendMessage?: (args: { threadId: string; prompt: string }) => void;
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
				className={cn(isUser && "rounded-lg bg-primary/10 p-3")}
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
		type !== "tool-createDoc" &&
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
						if (threadId && sendMessage) {
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

	if (
		type === "tool-createDoc" &&
		"state" in part &&
		part.state === "output-available"
	) {
		const toolPart = part as {
			toolCallId: string;
			output: { docId: string };
		};

		return (
			<div className="mt-1" key={toolPart.toolCallId}>
				<DocCard
					docId={toolPart.output.docId as Id<"docs">}
					orgSlug={orgSlug}
					projectId={projectId}
				/>
			</div>
		);
	}

	return null;
}

export function ChatMessageList({
	messages,
	threadId,
	sendMessage,
	orgSlug,
	projectId,
}: {
	messages: UIMessage[] | undefined;
	threadId: string | null;
	sendMessage?: (args: { threadId: string; prompt: string }) => void;
	orgSlug: string;
	projectId: string;
}) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages update
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (container) {
			container.scrollTo({
				top: container.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [messages]);

	return (
		<div
			className="flex-1 space-y-5 overflow-y-auto px-6 py-4"
			ref={scrollContainerRef}
		>
			{!messages || messages.length === 0 ? (
				<div className="mt-8 text-center text-muted-foreground">
					Start the conversation by sending a message.
				</div>
			) : (
				messages.map((message: UIMessage) => {
					const isUser = message.role === "user";
					return (
						<div
							className={cn(
								"space-y-2",
								isUser && "ml-auto flex w-[85%] justify-end"
							)}
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
		</div>
	);
}
