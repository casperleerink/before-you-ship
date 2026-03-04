import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Sheet({ ...props }: Dialog.Root.Props) {
	return <Dialog.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: Dialog.Trigger.Props) {
	return <Dialog.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetPortal({ ...props }: Dialog.Portal.Props) {
	return <Dialog.Portal data-slot="sheet-portal" {...props} />;
}

function SheetBackdrop({ className, ...props }: Dialog.Backdrop.Props) {
	return (
		<Dialog.Backdrop
			className={cn(
				"data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in",
				className
			)}
			data-slot="sheet-backdrop"
			{...props}
		/>
	);
}

function SheetClose({ className, ...props }: Dialog.Close.Props) {
	return (
		<Dialog.Close
			className={cn(
				"absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
				className
			)}
			data-slot="sheet-close"
			{...props}
		>
			<XIcon className="size-4" />
			<span className="sr-only">Close</span>
		</Dialog.Close>
	);
}

function SheetContent({ className, children, ...props }: Dialog.Popup.Props) {
	return (
		<SheetPortal>
			<SheetBackdrop />
			<Dialog.Popup
				className={cn(
					"fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col gap-4 border-l bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out data-closed:translate-x-full data-open:translate-x-0 data-closed:animate-out data-open:animate-in",
					className
				)}
				data-slot="sheet-content"
				{...props}
			>
				{children}
				<SheetClose />
			</Dialog.Popup>
		</SheetPortal>
	);
}

function SheetTitle({ className, ...props }: Dialog.Title.Props) {
	return (
		<Dialog.Title
			className={cn("font-semibold text-lg", className)}
			data-slot="sheet-title"
			{...props}
		/>
	);
}

function SheetDescription({ className, ...props }: Dialog.Description.Props) {
	return (
		<Dialog.Description
			className={cn("text-muted-foreground text-sm", className)}
			data-slot="sheet-description"
			{...props}
		/>
	);
}

function SheetHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("flex flex-col gap-1.5", className)}
			data-slot="sheet-header"
			{...props}
		/>
	);
}

function SheetBody({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("flex-1 overflow-y-auto", className)}
			data-slot="sheet-body"
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetTrigger,
	SheetPortal,
	SheetBackdrop,
	SheetClose,
	SheetContent,
	SheetTitle,
	SheetDescription,
	SheetHeader,
	SheetBody,
};
