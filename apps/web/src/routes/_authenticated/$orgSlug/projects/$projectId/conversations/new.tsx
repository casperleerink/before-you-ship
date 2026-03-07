import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { ChatComposer } from "@/components/chat-composer";
import { ChatMessageList } from "@/components/chat-message-list";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/conversations/new"
)({
	component: NewConversationPage,
});

function NewConversationPage() {
	const { orgSlug, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const createWithMessage = useMutation(api.conversations.createWithMessage);
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (text: string) => {
		setIsLoading(true);
		try {
			const conversationId = await createWithMessage({
				projectId,
				prompt: text,
			});
			await navigate({
				params: {
					conversationId,
					orgSlug,
					projectId: projectIdParam,
				},
				to: "/$orgSlug/projects/$projectId/conversations/$conversationId",
			});
		} catch {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b px-6 py-3">
				<Button
					render={
						<Link
							params={{ orgSlug, projectId: projectIdParam }}
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
					New Conversation
				</h1>
			</header>

			<ChatMessageList
				messages={undefined}
				orgSlug={orgSlug}
				projectId={projectIdParam}
				threadId={null}
			/>

			<ChatComposer isBusy={isLoading} onSubmit={handleSubmit} />
		</div>
	);
}
