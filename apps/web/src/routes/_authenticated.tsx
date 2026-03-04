import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";

import Loader from "@/components/loader";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
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

	return <Outlet />;
}
