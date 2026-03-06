import { Brain, Gauge, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	STATUS_OPTIONS,
	statusLabel,
	statusVariant,
	type TaskLevel,
	type TaskStatus,
} from "@/lib/task-utils";
import { cn } from "@/lib/utils";

const levelIcons = {
	risk: ShieldAlert,
	complexity: Brain,
	effort: Gauge,
} as const;

const levelColorClasses: Record<TaskLevel, string> = {
	low: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
	medium:
		"bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
	high: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
};

type LevelCategory = keyof typeof levelIcons;

export function LevelBadge({
	type,
	level,
	showLabel = false,
}: {
	type: LevelCategory;
	level: TaskLevel;
	showLabel?: boolean;
}) {
	const Icon = levelIcons[type];
	const label = type.charAt(0).toUpperCase() + type.slice(1);
	return (
		<Badge className={cn(levelColorClasses[level])}>
			<Icon className="h-3 w-3" />
			{showLabel ? `${label}: ${level}` : level}
		</Badge>
	);
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
	return (
		<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
			{children}
		</span>
	);
}

export function LevelBadgeField({
	type,
	level,
}: {
	type: LevelCategory;
	level: TaskLevel;
}) {
	const label = type.charAt(0).toUpperCase() + type.slice(1);
	return (
		<div className="flex flex-col gap-1">
			<FieldLabel>{label}</FieldLabel>
			<LevelBadge level={level} type={type} />
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
				<DropdownMenuGroup>
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
				</DropdownMenuGroup>
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
					<DropdownMenuGroup>
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
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
