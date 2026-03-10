import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthState } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function UserAvatar({ name }: { name: string }) {
	const initials = name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs">
			{initials}
		</div>
	);
}

export default function UserMenu({ compact }: { compact?: boolean }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user } = useAuthState();
	const { setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="User menu"
				className={cn(
					"flex w-full items-center gap-2 rounded-md p-1.5 text-left text-sm transition-colors hover:bg-accent/50",
					compact && "w-auto"
				)}
			>
				<UserAvatar name={user?.name ?? "?"} />
				{!compact && (
					<>
						<span className="min-w-0 flex-1 truncate font-medium text-sm">
							{user?.name}
						</span>
						<ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
					</>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="min-w-52 bg-card"
				side="top"
				sideOffset={8}
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="font-normal">
						<div className="flex items-center gap-2">
							<UserAvatar name={user?.name ?? "?"} />
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">{user?.name}</p>
								<p className="truncate text-muted-foreground text-xs">
									{user?.email}
								</p>
							</div>
						</div>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Sun className="h-4 w-4 dark:hidden" />
							<Moon className="hidden h-4 w-4 dark:block" />
							Theme
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem onClick={() => setTheme("light")}>
								<Sun className="h-4 w-4" />
								Light
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme("dark")}>
								<Moon className="h-4 w-4" />
								Dark
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme("system")}>
								<Monitor className="h-4 w-4" />
								System
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									queryClient.clear();
									navigate({
										to: "/sign-in",
									});
								},
							},
						});
					}}
					variant="destructive"
				>
					<LogOut className="h-4 w-4" />
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
