import { api } from "@project-manager/backend/convex/_generated/api";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import Loader from "@/components/loader";
import { OrgProvider } from "@/lib/org-context";

export const Route = createFileRoute("/_authenticated/$orgSlug")({
	component: OrgLayout,
});

function OrgLayout() {
	const { orgSlug } = Route.useParams();
	const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });

	if (org === undefined) {
		return <Loader />;
	}

	if (!org) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<h1 className="font-bold text-2xl">Organization not found</h1>
			</div>
		);
	}

	return (
		<OrgProvider org={org}>
			<Outlet />
		</OrgProvider>
	);
}
