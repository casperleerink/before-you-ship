import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useHotkey } from "@tanstack/react-hotkeys";
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
import { useAppMutation } from "@/lib/convex-mutation";
import { getTriageItemDefaults, triageItemSchema } from "@/lib/form-schemas";

type TriageCaptureModalProps = {
	projectId: Id<"projects">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
} & (
	| { mode?: "create" }
	| { mode: "edit"; itemId: Id<"triageItems">; initialContent: string }
);

export default function TriageCaptureModal(props: TriageCaptureModalProps) {
	const { projectId, open, onOpenChange } = props;
	const isEdit = "mode" in props && props.mode === "edit";

	const { mutateAsync: createItem } = useAppMutation(api.triageItems.create);
	const { mutateAsync: updateItem } = useAppMutation(api.triageItems.update);

	const form = useAppForm({
		defaultValues: isEdit
			? { content: props.initialContent }
			: getTriageItemDefaults(),
		onSubmit: async ({ value }) => {
			try {
				const content = value.content.trim();
				if (isEdit) {
					await updateItem({ id: props.itemId, content });
					toast.success("Triage item updated");
				} else {
					await createItem({ projectId, content });
					toast.success("Triage item added");
				}
				form.reset();
				onOpenChange(false);
			} catch {
				toast.error(
					isEdit ? "Failed to update triage item" : "Failed to add triage item"
				);
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
				<DialogTitle>
					{isEdit ? "Edit Triage Item" : "Quick Add Triage"}
				</DialogTitle>
				<DialogDescription>
					{isEdit
						? "Update the triage item content."
						: "Submit an idea or bug report to be refined by AI."}
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
								submittingText={isEdit ? "Saving..." : "Adding..."}
								type="submit"
							>
								{isEdit ? "Save Changes" : "Add Item"}
							</form.SubmitButton>
						</div>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
