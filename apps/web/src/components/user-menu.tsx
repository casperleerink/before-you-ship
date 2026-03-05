import { api } from "@project-manager/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

export default function UserMenu() {
	const navigate = useNavigate();
	const user = useQuery(api.auth.getCurrentUser);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				{user?.name}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="min-w-48 bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>My Account</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem className="truncate text-muted-foreground text-xs">
						{user?.email}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate({
											to: "/sign-in",
										});
									},
								},
							});
						}}
						variant="destructive"
					>
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
