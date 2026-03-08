import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ProjectColor {
	dark: string;
	light: string;
	name: string;
}

const PROJECT_COLORS: ProjectColor[] = [
	{ name: "blue", light: "oklch(0.55 0.24 260)", dark: "oklch(0.65 0.22 260)" },
	{
		name: "violet",
		light: "oklch(0.55 0.24 290)",
		dark: "oklch(0.65 0.22 290)",
	},
	{
		name: "emerald",
		light: "oklch(0.55 0.2 160)",
		dark: "oklch(0.65 0.19 160)",
	},
	{
		name: "amber",
		light: "oklch(0.65 0.2 80)",
		dark: "oklch(0.75 0.18 80)",
	},
	{ name: "rose", light: "oklch(0.55 0.24 15)", dark: "oklch(0.65 0.22 15)" },
	{ name: "cyan", light: "oklch(0.55 0.15 200)", dark: "oklch(0.65 0.15 200)" },
	{ name: "pink", light: "oklch(0.55 0.24 330)", dark: "oklch(0.65 0.22 330)" },
	{ name: "teal", light: "oklch(0.55 0.15 180)", dark: "oklch(0.65 0.15 180)" },
];

function hashName(name: string): number {
	let hash = 0;
	for (const char of name) {
		hash = hash * 31 + char.charCodeAt(0);
	}
	return Math.abs(hash);
}

export function getProjectColor(name: string): ProjectColor {
	return PROJECT_COLORS[hashName(name) % PROJECT_COLORS.length];
}

export function ProjectDot({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	const { resolvedTheme } = useTheme();
	const color = getProjectColor(name);

	return (
		<div
			className={cn("h-2.5 w-2.5 shrink-0 rounded-full", className)}
			style={{
				backgroundColor: resolvedTheme === "dark" ? color.dark : color.light,
			}}
		/>
	);
}
