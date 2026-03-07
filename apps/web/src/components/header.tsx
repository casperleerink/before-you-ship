import { Link, useMatch } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

import UserMenu from "./user-menu";

export default function Header() {
	const isProjectRoute = useMatch({
		from: "/_authenticated/$orgSlug/projects/$projectId",
		shouldThrow: false,
	});

	if (isProjectRoute) {
		return null;
	}

	return (
		<header className="border-border border-b">
			<div className="flex items-center justify-between px-6 py-3">
				<nav className="flex items-center gap-4 font-medium text-sm">
					<Authenticated>
						<Link to="/">Organizations</Link>
					</Authenticated>
					<Unauthenticated>
						<Link to="/sign-in">Sign In</Link>
					</Unauthenticated>
				</nav>
				<Authenticated>
					<UserMenu compact />
				</Authenticated>
			</div>
		</header>
	);
}
