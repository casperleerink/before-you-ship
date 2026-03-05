import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import EmptyState from "@/components/empty-state";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	CONVERSATION_STATUS_OPTIONS,
	type ConversationStatus,
	conversationStatusVariant,
} from "@/lib/conversation-utils";

type StatusFilter = ConversationStatus | "all";

const EMPTY_STATE_MESSAGES: Record<StatusFilter, string> = {
	all: "Start a conversation to refine ideas into tasks.",
	active: "No active conversations. Start one or check another tab.",
	completed: "No completed conversations yet.",
	abandoned: "No abandoned conversations.",
};

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/conversations/"
)({
	component: ConversationsPage,
});

function formatDate(timestamp: number) {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function ConversationsPage() {
	const { orgId: orgIdParam, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const conversations = useQuery(api.conversations.list, { projectId });
	const createConversation = useMutation(api.conversations.create);
	const updateStatus = useMutation(api.conversations.updateStatus);
	const navigate = useNavigate();
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

	const filteredConversations = useMemo(() => {
		if (!conversations) {
			return [];
		}
		if (statusFilter === "all") {
			return conversations;
		}
		return conversations.filter((c) => c.status === statusFilter);
	}, [conversations, statusFilter]);

	const counts = useMemo(() => {
		if (!conversations) {
			return { all: 0, active: 0, completed: 0, abandoned: 0 };
		}
		const result = {
			all: conversations.length,
			active: 0,
			completed: 0,
			abandoned: 0,
		};
		for (const c of conversations) {
			if (c.status in result) {
				result[c.status as ConversationStatus]++;
			}
		}
		return result;
	}, [conversations]);

	if (conversations === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const handleCreate = async () => {
		const conversationId = await createConversation({ projectId });
		navigate({
			to: "/organizations/$orgId/projects/$projectId/conversations/$conversationId",
			params: {
				orgId: orgIdParam,
				projectId: projectIdParam,
				conversationId,
			},
		});
	};

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Conversations</h1>
				<Button onClick={handleCreate} size="sm">
					<Plus className="mr-1 h-4 w-4" />
					New Conversation
				</Button>
			</div>

			<Tabs
				className="mb-4"
				onValueChange={(v) => setStatusFilter(v as StatusFilter)}
				value={statusFilter}
			>
				<TabsList>
					<TabsTrigger value="all">All ({counts.all})</TabsTrigger>
					{CONVERSATION_STATUS_OPTIONS.map((option) => (
						<TabsTrigger key={option.value} value={option.value}>
							{option.label} ({counts[option.value]})
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			{filteredConversations.length === 0 ? (
				<EmptyState
					description={EMPTY_STATE_MESSAGES[statusFilter]}
					icon={MessageSquare}
					title={
						statusFilter === "all"
							? "No conversations yet"
							: `No ${statusFilter} conversations`
					}
				/>
			) : (
				<div className="space-y-2">
					{filteredConversations.map((conversation) => (
						<button
							className="flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
							key={conversation._id}
							onClick={() =>
								navigate({
									to: "/organizations/$orgId/projects/$projectId/conversations/$conversationId",
									params: {
										orgId: orgIdParam,
										projectId: projectIdParam,
										conversationId: conversation._id,
									},
								})
							}
							type="button"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">
									{conversation.title ?? "Untitled conversation"}
								</p>
								<p className="text-muted-foreground text-xs">
									{formatDate(conversation.createdAt)}
								</p>
							</div>
							{/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper to stop propagation */}
							<div onClick={(e) => e.stopPropagation()} role="presentation">
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<button className="cursor-pointer" type="button">
												<Badge
													variant={conversationStatusVariant(
														conversation.status
													)}
												>
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
															conversationId:
																conversation._id as Id<"conversations">,
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
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
