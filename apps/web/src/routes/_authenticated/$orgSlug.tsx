import { api } from "@project-manager/backend/convex/_generated/api";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { TriangleAlert } from "lucide-react";

import EmptyState from "@/components/empty-state";
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
				<EmptyState
					description="This organization doesn't exist or you don't have access to it."
					icon={TriangleAlert}
					title="Organization not found"
				/>
			</div>
		);
	}

	return (
		<OrgProvider org={org}>
			<Outlet />
		</OrgProvider>
	);
}
