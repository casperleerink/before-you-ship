import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import Loader from "@/components/loader";
import { useAuthState } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
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

	return <Outlet />;
}
