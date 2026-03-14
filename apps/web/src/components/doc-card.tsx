import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, FileText } from "lucide-react";

import MessageContent from "@/components/message-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocCardProps {
	docId: Id<"docs">;
	orgSlug: string;
	projectId: string;
}

export function DocCard({ docId, orgSlug, projectId }: DocCardProps) {
	const { data: doc } = useQuery(convexQuery(api.docs.getById, { docId }));

	if (doc === undefined) {
		return (
			<Card size="sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-4 w-4" />
						Loading document...
					</CardTitle>
				</CardHeader>
			</Card>
		);
	}

	if (!doc) {
		return null;
	}

	const preview =
		doc.content.length > 500 ? `${doc.content.slice(0, 500)}...` : doc.content;

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<FileText className="h-4 w-4" />
						{doc.title}
					</span>
					<Link
						className="inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
						params={{ orgSlug, projectId }}
						search={{ docId: doc._id }}
						to="/$orgSlug/projects/$projectId/docs"
					>
						<ExternalLink className="h-3 w-3" />
						View document
					</Link>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="max-h-48 overflow-hidden text-sm">
					<MessageContent isStreaming={false} text={preview} />
				</div>
			</CardContent>
		</Card>
	);
}
