import { useState } from "react";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	STATUS_OPTIONS,
	statusLabel,
	statusVariant,
	type TaskStatus,
} from "@/lib/task-utils";

export function FieldLabel({ children }: { children: React.ReactNode }) {
	return (
		<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
			{children}
		</span>
	);
}

export function BadgeField({
	label,
	value,
	variant,
}: {
	label: string;
	value: string;
	variant: BadgeVariant;
}) {
	return (
		<div className="flex flex-col gap-1">
			<FieldLabel>{label}</FieldLabel>
			<Badge variant={variant}>{value}</Badge>
		</div>
	);
}

export function FilterDropdown<T extends string>({
	label,
	options,
	selected,
	onToggle,
}: {
	label: string;
	options: { value: T; label: string }[];
	selected: Set<T>;
	onToggle: (value: T) => void;
}) {
	const hasSelection = selected.size > 0;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="sm" variant={hasSelection ? "default" : "outline"}>
						{label}
						{hasSelection && (
							<span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 font-mono text-xs">
								{selected.size}
							</span>
						)}
					</Button>
				}
			/>
			<DropdownMenuContent>
				<DropdownMenuLabel>{label}</DropdownMenuLabel>
				{options.map((option) => (
					<DropdownMenuCheckboxItem
						checked={selected.has(option.value)}
						key={option.value}
						onSelect={(e) => {
							e.preventDefault();
							onToggle(option.value);
						}}
					>
						{option.label}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function useSetToggle<T>() {
	const [set, setSet] = useState<Set<T>>(new Set());
	const toggle = (value: T) => {
		setSet((prev) => {
			const next = new Set(prev);
			if (next.has(value)) {
				next.delete(value);
			} else {
				next.add(value);
			}
			return next;
		});
	};
	const clear = () => setSet(new Set());
	return [set, toggle, clear] as const;
}

export function StatusDropdown({
	status,
	onStatusChange,
}: {
	status: TaskStatus;
	onStatusChange: (status: TaskStatus) => void;
}) {
	return (
		<div className="flex flex-col gap-1">
			<FieldLabel>Status</FieldLabel>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button className="w-fit cursor-pointer" type="button">
							<Badge variant={statusVariant(status)}>
								{statusLabel(status)}
							</Badge>
						</button>
					}
				/>
				<DropdownMenuContent>
					<DropdownMenuLabel>Status</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						onValueChange={(value) => {
							const option = STATUS_OPTIONS.find((o) => o.value === value);
							if (option) {
								onStatusChange(option.value);
							}
						}}
						value={status}
					>
						{STATUS_OPTIONS.map((option) => (
							<DropdownMenuRadioItem key={option.value} value={option.value}>
								{option.label}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
