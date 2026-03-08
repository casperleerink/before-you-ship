import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";

export function organizationBySlugQuery(slug: string) {
	return convexQuery(api.organizations.getBySlug, { slug });
}

export function projectByIdQuery(projectId: Id<"projects">) {
	return convexQuery(api.projects.getById, { projectId });
}

export function conversationByIdQuery(conversationId: Id<"conversations">) {
	return convexQuery(api.conversations.getById, { conversationId });
}
