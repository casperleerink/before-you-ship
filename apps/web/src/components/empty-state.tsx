import type { LucideIcon } from "lucide-react";

export default function EmptyState({
	icon: Icon,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<div className="py-12 text-center text-muted-foreground">
			<Icon className="mx-auto mb-4 h-12 w-12 opacity-50" />
			<p className="text-lg">{title}</p>
			<p className="mt-1 text-sm">{description}</p>
		</div>
	);
}
