import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { organizationBySlugQuery } from "@/lib/convex-query-options";
import { OrgProvider } from "@/lib/org-context";

export const Route = createFileRoute("/_authenticated/$orgSlug")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			organizationBySlugQuery(params.orgSlug)
		);
	},
	component: OrgLayout,
});

function OrgLayout() {
	const { orgSlug } = Route.useParams();
	const { data: org, isPending } = useQuery(organizationBySlugQuery(orgSlug));

	if (isPending) {
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
