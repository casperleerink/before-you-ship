import { Link, useMatch } from "@tanstack/react-router";
import { useAuthState } from "@/lib/auth";

import UserMenu from "./user-menu";

export default function Header() {
	const { isAuthenticated } = useAuthState();
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
					{isAuthenticated ? (
						<Link to="/">Organizations</Link>
					) : (
						<Link to="/sign-in">Sign In</Link>
					)}
				</nav>
				{isAuthenticated ? <UserMenu compact /> : null}
			</div>
		</header>
	);
}
