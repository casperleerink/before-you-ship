import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { getAppFormOnSubmit, useAppForm } from "@/lib/app-form";
import { getTriageItemDefaults, triageItemSchema } from "@/lib/form-schemas";

export default function TriageCaptureModal({
	projectId,
	open,
	onOpenChange,
}: {
	projectId: Id<"projects">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const createItem = useMutation(api.triageItems.create);
	const form = useAppForm({
		defaultValues: getTriageItemDefaults(),
		onSubmit: async ({ value }) => {
			try {
				await createItem({ projectId, content: value.content.trim() });
				toast.success("Triage item added");
				form.reset();
				onOpenChange(false);
			} catch {
				toast.error("Failed to add triage item");
			}
		},
		validators: {
			onChange: triageItemSchema,
			onSubmit: triageItemSchema,
		},
	});

	useHotkey(
		"Mod+Enter",
		() => {
			form.handleSubmit();
		},
		{ enabled: open }
	);

	useEffect(() => {
		if (open) {
			form.reset();
		}
	}, [form, open]);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogTitle>Quick Add Triage</DialogTitle>
				<DialogDescription>
					Submit an idea or bug report to be refined by AI.
				</DialogDescription>
				<form.AppForm>
					<form className="mt-4 space-y-4" onSubmit={getAppFormOnSubmit(form)}>
						<form.AppField name="content">
							{(field) => (
								<field.TextareaField
									autoFocus
									label="Triage item"
									placeholder="Describe an idea or bug..."
									rows={4}
								/>
							)}
						</form.AppField>
						<div className="flex justify-end gap-2">
							<Button
								onClick={() => onOpenChange(false)}
								size="sm"
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
							<form.SubmitButton
								size="sm"
								submittingText="Adding..."
								type="submit"
							>
								Add Item
							</form.SubmitButton>
						</div>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
