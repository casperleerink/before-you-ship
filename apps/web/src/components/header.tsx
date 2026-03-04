import { Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex items-center gap-4 text-lg">
					<Authenticated>
						<Link to="/organizations">Organizations</Link>
					</Authenticated>
					<Unauthenticated>
						<Link to="/sign-in">Sign In</Link>
					</Unauthenticated>
				</nav>
				<div className="flex items-center gap-2">
					<Authenticated>
						<UserMenu />
					</Authenticated>
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}
