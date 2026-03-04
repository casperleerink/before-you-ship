import { api } from "@project-manager/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const privateData = useQuery(api.privateData.get);

	return (
		<div className="container mx-auto max-w-3xl px-4 py-8">
			<h1 className="font-bold text-2xl">Dashboard</h1>
			<p className="mt-4 text-muted-foreground">
				privateData: {privateData?.message}
			</p>
		</div>
	);
}
