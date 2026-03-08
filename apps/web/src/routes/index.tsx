import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import Loader from "@/components/loader";
import OrgHome from "@/components/org-home";
import { useAuthState } from "@/lib/auth";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { isAuthenticated, isPending } = useAuthState();
	const navigate = useNavigate();

	useEffect(() => {
		if (!(isPending || isAuthenticated)) {
			navigate({ to: "/sign-in" });
		}
	}, [isAuthenticated, isPending, navigate]);

	if (isPending) {
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
