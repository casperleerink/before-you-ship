import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Inbox, MessageSquare } from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
	const navigate = useNavigate();

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
						<Card key={item._id} size="sm">
							<CardHeader>
								<CardTitle className="line-clamp-3 text-sm">
									{item.content}
								</CardTitle>
								<CardAction>
									<Badge
										variant={
											item.status === "pending" ? "outline" : "secondary"
										}
									>
										{item.status}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardContent className="mt-auto space-y-3">
								<p className="text-muted-foreground text-xs">
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
		</div>
	);
}
