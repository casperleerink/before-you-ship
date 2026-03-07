import { cn } from "@/lib/utils";

const PROJECT_COLORS = [
	"bg-blue-500",
	"bg-violet-500",
	"bg-emerald-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-cyan-500",
	"bg-pink-500",
	"bg-teal-500",
];

export function ProjectDot({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	let hash = 0;
	for (const char of name) {
		hash = hash * 31 + char.charCodeAt(0);
	}
	const color = PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];

	return (
		<div
			className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color, className)}
		/>
	);
}
