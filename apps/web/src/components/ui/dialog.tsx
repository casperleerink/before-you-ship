import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Dialog({ ...props }: BaseDialog.Root.Props) {
	return <BaseDialog.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: BaseDialog.Trigger.Props) {
	return <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: BaseDialog.Portal.Props) {
	return <BaseDialog.Portal data-slot="dialog-portal" {...props} />;
}

function DialogBackdrop({ className, ...props }: BaseDialog.Backdrop.Props) {
	return (
		<BaseDialog.Backdrop
			className={cn(
				"data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in data-closed:fill-mode-forwards",
				className
			)}
			data-slot="dialog-backdrop"
			{...props}
		/>
	);
}

function DialogClose({ className, ...props }: BaseDialog.Close.Props) {
	return (
		<BaseDialog.Close
			className={cn(
				"absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
				className
			)}
			data-slot="dialog-close"
			{...props}
		>
			<XIcon className="size-4" />
			<span className="sr-only">Close</span>
		</BaseDialog.Close>
	);
}

function DialogContent({
	className,
	children,
	...props
}: BaseDialog.Popup.Props) {
	return (
		<DialogPortal>
			<DialogBackdrop />
			<BaseDialog.Popup
				className={cn(
					"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg duration-200 data-closed:animate-out data-open:animate-in data-closed:fill-mode-forwards",
					className
				)}
				data-slot="dialog-content"
				{...props}
			>
				{children}
				<DialogClose />
			</BaseDialog.Popup>
		</DialogPortal>
	);
}

function DialogTitle({ className, ...props }: BaseDialog.Title.Props) {
	return (
		<BaseDialog.Title
			className={cn("font-semibold text-lg", className)}
			data-slot="dialog-title"
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: BaseDialog.Description.Props) {
	return (
		<BaseDialog.Description
			className={cn("text-muted-foreground text-sm", className)}
			data-slot="dialog-description"
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogTrigger,
	DialogPortal,
	DialogBackdrop,
	DialogClose,
	DialogContent,
	DialogTitle,
	DialogDescription,
};
