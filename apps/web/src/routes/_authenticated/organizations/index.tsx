import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/organizations/")({
	component: OrganizationsRedirectPage,
});

function OrganizationsRedirectPage() {
	return <Navigate to="/" />;
}
