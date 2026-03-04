import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";

import Loader from "@/components/loader";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading) {
			if (isAuthenticated) {
				navigate({ to: "/dashboard" });
			} else {
				navigate({ to: "/sign-in" });
			}
		}
	}, [isAuthenticated, isLoading, navigate]);

	return <Loader />;
}
