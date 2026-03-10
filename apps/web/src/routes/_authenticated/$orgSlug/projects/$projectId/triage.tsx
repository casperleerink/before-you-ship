import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Archive,
	ArrowRight,
	Inbox,
	MessageSquare,
	MoreVertical,
	Pencil,
} from "lucide-react";
import { useState } from "react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import TriageCaptureModal from "@/components/triage-capture-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppMutation } from "@/lib/convex-mutation";
import { formatRelativeTime } from "@/lib/utils";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/triage"
)({
	component: TriagePage,
});

function TriagePage() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const { data: items } = useQuery(
		convexQuery(api.triageItems.list, { projectId })
	);
	const { mutateAsync: createFromTriageItem } = useAppMutation(
		api.conversations.createFromTriageItem
	);
	const { mutate: archiveTriageItem } = useAppMutation(api.triageItems.archive);
	const navigate = useNavigate();

	const [editingItem, setEditingItem] = useState<{
		id: Id<"triageItems">;
		content: string;
	} | null>(null);

	if (items === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const navigateToConversation = (conversationId: Id<"conversations">) => {
		navigate({
			params: {
				conversationId,
				orgSlug,
				projectId: projectIdParam,
			},
			to: "/$orgSlug/projects/$projectId/conversations/$conversationId",
		});
	};

	const handlePendingClick = async (triageItemId: Id<"triageItems">) => {
		const conversationId = await createFromTriageItem({ triageItemId });
		navigateToConversation(conversationId);
	};

	return (
		<div className="p-6">
			<div className="mb-4">
				<h1 className="font-bold text-2xl">Triage</h1>
			</div>

			{items.length === 0 ? (
				<EmptyState
					description="Submit ideas and bug reports to be refined by AI. Use the + button or press Cmd+J."
					icon={Inbox}
					title="No triage items yet"
				/>
			) : (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<Card data-testid="triage-item-card" key={item._id} size="sm">
							<CardHeader className="gap-x-3">
								<CardTitle className="line-clamp-3 text-sm">
									{item.content}
								</CardTitle>
								<CardAction>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={<Button size="icon-xs" variant="ghost" />}
										>
											<MoreVertical className="h-3.5 w-3.5" />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={() =>
													setEditingItem({
														id: item._id,
														content: item.content,
													})
												}
											>
												<Pencil className="mr-2 h-3.5 w-3.5" />
												Edit
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={() => archiveTriageItem({ id: item._id })}
												variant="destructive"
											>
												<Archive className="mr-2 h-3.5 w-3.5" />
												Archive
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</CardAction>
							</CardHeader>
							<CardContent className="mt-auto space-y-3">
								<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
									<Badge
										variant={
											item.status === "pending" ? "outline" : "secondary"
										}
									>
										{item.status}
									</Badge>
									{item.createdByUser.name} &middot;{" "}
									{formatRelativeTime(item.createdAt)}
								</p>
								{item.status === "pending" && (
									<Button
										className="w-full"
										onClick={() => {
											handlePendingClick(item._id).catch(() => {
												// Keep user on current screen if conversion fails
											});
										}}
										size="sm"
										variant="subtle"
									>
										Start conversation
										<ArrowRight className="h-3.5 w-3.5" />
									</Button>
								)}
								{item.status === "converted" && item.conversationId && (
									<Button
										className="w-full"
										onClick={() =>
											navigateToConversation(
												item.conversationId as Id<"conversations">
											)
										}
										size="sm"
										variant="subtle"
									>
										<MessageSquare className="h-3.5 w-3.5" />
										View conversation
									</Button>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{editingItem && (
				<TriageCaptureModal
					initialContent={editingItem.content}
					itemId={editingItem.id}
					mode="edit"
					onOpenChange={(open) => {
						if (!open) {
							setEditingItem(null);
						}
					}}
					open
					projectId={projectId}
				/>
			)}
		</div>
	);
}
