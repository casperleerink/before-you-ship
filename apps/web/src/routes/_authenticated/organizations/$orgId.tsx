import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import Loader from "@/components/loader";

export const Route = createFileRoute("/_authenticated/organizations/$orgId")({
	component: OrgDashboardPage,
});

function OrgDashboardPage() {
	const { orgId } = Route.useParams();
	const org = useQuery(api.organizations.getById, {
		orgId: orgId as Id<"organizations">,
	});

	if (org === undefined) {
		return <Loader />;
	}

	if (!org) {
		return (
			<div className="container mx-auto max-w-3xl px-4 py-8">
				<h1 className="font-bold text-2xl">Organization not found</h1>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-3xl px-4 py-8">
			<h1 className="font-bold text-2xl">{org.name}</h1>
			<p className="mt-2 text-muted-foreground">Role: {org.role}</p>
			<p className="mt-4 text-muted-foreground">
				Projects will appear here once the projects feature is implemented.
			</p>
		</div>
	);
}
