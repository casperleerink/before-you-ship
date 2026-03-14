import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

/** Org dashboard – Projects tab */
export function ProjectCardsSkeleton({ count = 3 }: { count?: number }) {
	return (
		<div className="grid gap-3">
			{Array.from({ length: count }, (_, i) => (
				<Card className="transition-colors" key={`skeleton-${i}`}>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Skeleton className="h-3 w-3 rounded-full" />
							<Skeleton className="h-5 w-40" />
						</div>
						<Skeleton className="mt-1 h-4 w-28" />
					</CardHeader>
				</Card>
			))}
		</div>
	);
}

/** Org dashboard – Members tab */
export function MembersTableSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div className="space-y-8">
			<div>
				<Skeleton className="mb-3 h-6 w-32" />
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Access Role</TableHead>
							<TableHead>Work Profile</TableHead>
							<TableHead>Availability</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: rows }, (_, i) => (
							<TableRow key={`skeleton-${i}`}>
								<TableCell>
									<Skeleton className="h-4 w-24" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-36" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-16 rounded-full" />
								</TableCell>
								<TableCell>
									<div className="space-y-1">
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-3 w-36" />
									</div>
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-20 rounded-full" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

/** My Tasks tab – ranked task queue */
export function TaskQueueSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="space-y-2">
			{Array.from({ length: count }, (_, i) => (
				<div
					className="flex w-full flex-col gap-2 rounded-xl border border-l-[3px] border-l-transparent p-4"
					key={`skeleton-${i}`}
				>
					<div className="flex items-center gap-2">
						<Skeleton className="size-2.5 shrink-0 rounded-full" />
						<Skeleton className="h-5 w-56" />
					</div>
					<Skeleton className="h-4 w-full max-w-sm" />
					<Skeleton className="h-3.5 w-40" />
				</div>
			))}
		</div>
	);
}

/** Project dashboard – 4 summary cards */
export function DashboardCardsSkeleton() {
	return (
		<div className="p-6">
			<Skeleton className="mb-6 h-8 w-32" />
			<div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
				{Array.from({ length: 4 }, (_, i) => (
					<Card key={`skeleton-${i}`} size="sm">
						<CardHeader>
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 rounded" />
								<Skeleton className="h-4 w-20" />
							</div>
						</CardHeader>
						<CardContent>
							<Skeleton className="mb-1 h-8 w-12" />
							<Skeleton className="h-3 w-24" />
						</CardContent>
					</Card>
				))}
			</div>

			<Skeleton className="mb-4 h-6 w-36" />
			<ActivityListSkeleton count={5} />
		</div>
	);
}

/** Conversation cards grid */
export function ConversationCardsSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<Skeleton className="h-8 w-40" />
				<Skeleton className="h-8 w-36 rounded-md" />
			</div>
			<Skeleton className="mb-4 h-9 w-80 rounded-md" />
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: count }, (_, i) => (
					<Card key={`skeleton-${i}`} size="sm">
						<CardHeader>
							<Skeleton className="h-4 w-full max-w-[200px]" />
							<Skeleton className="h-5 w-16 rounded-full" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-3 w-32" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

/** Conversation detail – header + chat messages */
export function ConversationDetailSkeleton() {
	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b px-6 py-3">
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-6 w-64" />
				<Skeleton className="ml-auto h-6 w-20 rounded-full" />
			</header>
			<div className="flex-1 space-y-4 p-6">
				{/* User message */}
				<div className="ml-8 flex flex-col items-end gap-1">
					<Skeleton className="h-16 w-3/4 rounded-lg" />
				</div>
				{/* Assistant message */}
				<div className="mr-8 flex flex-col gap-1">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-32 w-full rounded-lg" />
				</div>
				{/* User message */}
				<div className="ml-8 flex flex-col items-end gap-1">
					<Skeleton className="h-12 w-2/3 rounded-lg" />
				</div>
			</div>
		</div>
	);
}

/** Triage cards grid */
export function TriageCardsSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="p-6">
			<Skeleton className="mb-4 h-8 w-24" />
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: count }, (_, i) => (
					<Card key={`skeleton-${i}`} size="sm">
						<CardHeader>
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</CardHeader>
						<CardContent className="mt-auto space-y-3">
							<div className="flex items-center gap-1.5">
								<Skeleton className="h-5 w-16 rounded-full" />
								<Skeleton className="h-3 w-32" />
							</div>
							<Skeleton className="h-8 w-full rounded-md" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

/** Tasks table */
export function TasksTableSkeleton({ rows = 6 }: { rows?: number }) {
	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<Skeleton className="h-8 w-20" />
			</div>
			<div className="mb-4 flex items-center gap-2">
				<Skeleton className="h-8 w-64 rounded-md" />
				<Skeleton className="h-8 w-20 rounded-md" />
				<Skeleton className="h-8 w-16 rounded-md" />
				<Skeleton className="h-8 w-24 rounded-md" />
				<Skeleton className="h-8 w-16 rounded-md" />
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead className="w-[100px]">Status</TableHead>
							<TableHead className="w-[100px]">Urgency</TableHead>
							<TableHead className="w-[80px]">Risk</TableHead>
							<TableHead className="w-[100px]">Complexity</TableHead>
							<TableHead className="w-[80px]">Effort</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: rows }, (_, i) => (
							<TableRow key={`skeleton-${i}`}>
								<TableCell>
									<Skeleton className="h-4 w-48" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-16 rounded-full" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-16 rounded-full" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-12 rounded-full" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-16 rounded-full" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-12 rounded-full" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

/** Activity timeline items */
export function ActivityListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<div className="space-y-0">
			{Array.from({ length: count }, (_, i) => (
				<div className="relative flex gap-4" key={`skeleton-${i}`}>
					{i < count - 1 && (
						<div className="absolute top-6 bottom-0 left-3 w-px bg-border" />
					)}
					<Skeleton className="relative z-10 h-6 w-6 shrink-0 rounded-full" />
					<div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-48" />
							<Skeleton className="ml-auto h-3 w-16" />
						</div>
						<Skeleton className="h-3 w-32" />
					</div>
				</div>
			))}
		</div>
	);
}

/** Plan card loading */
export function PlanCardSkeleton() {
	return (
		<Card size="sm">
			<CardHeader>
				<div className="flex items-center gap-2">
					<Skeleton className="h-4 w-4" />
					<Skeleton className="h-5 w-32" />
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{Array.from({ length: 3 }, (_, i) => (
					<div className="space-y-2 py-3" key={`skeleton-${i}`}>
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-5 w-20 rounded-full" />
						<Skeleton className="h-3 w-full max-w-xs" />
						<div className="flex gap-1.5">
							<Skeleton className="h-5 w-16 rounded-full" />
							<Skeleton className="h-5 w-20 rounded-full" />
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
