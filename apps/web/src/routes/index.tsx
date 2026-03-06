import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import Loader from "@/components/loader";
import OrgHome from "@/components/org-home";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!(isLoading || isAuthenticated)) {
			navigate({ to: "/sign-in" });
		}
	}, [isAuthenticated, isLoading, navigate]);

	if (isLoading) {
		return <Loader />;
	}

	if (!isAuthenticated) {
		return null;
	}

	return (
		<OrgHome
			onOpenOrg={(orgSlug) =>
				navigate({
					params: { orgSlug },
					search: { tab: "projects" },
					to: "/$orgSlug",
				})
			}
		/>
	);
}
