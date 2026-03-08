import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { User, X } from "lucide-react";

import { FieldLabel } from "@/components/task-fields";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AssigneeDropdown({
	assigneeId,
	label = "Assignee",
	members,
	onAssigneeChange,
	onClearAssignee,
}: {
	assigneeId?: Id<"users">;
	label?: string;
	members: { _id: Id<"users">; name: string }[];
	onAssigneeChange: (userId: Id<"users">) => void;
	onClearAssignee: () => void;
}) {
	const assignee = assigneeId
		? members.find((member) => member._id === assigneeId)
		: null;

	return (
		<div className="flex flex-col gap-1">
			<FieldLabel>{label}</FieldLabel>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button className="w-fit cursor-pointer" type="button">
							{assignee ? (
								<Badge variant="outline">{assignee.name}</Badge>
							) : (
								<Badge variant="secondary">
									<User className="mr-1 size-3" />
									Unassigned
								</Badge>
							)}
						</button>
					}
				/>
				<DropdownMenuContent>
					<DropdownMenuGroup>
						<DropdownMenuLabel>{label}</DropdownMenuLabel>
						{members.map((member) => (
							<DropdownMenuItem
								key={member._id}
								onClick={() => onAssigneeChange(member._id)}
							>
								<span className="truncate">{member.name}</span>
								{member._id === assigneeId && (
									<span className="ml-auto text-muted-foreground text-xs">
										Current
									</span>
								)}
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
					{assigneeId && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onClearAssignee}>
								<X className="mr-1 size-3" />
								Unassign
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
