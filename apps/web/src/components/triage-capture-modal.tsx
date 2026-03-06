import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function TriageCaptureModal({
	projectId,
	open,
	onOpenChange,
}: {
	projectId: Id<"projects">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createItem = useMutation(api.triageItems.create);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!content.trim()) {
				return;
			}

			setIsSubmitting(true);
			try {
				await createItem({ projectId, content: content.trim() });
				toast.success("Triage item added");
				setIsSubmitting(false);
				onOpenChange(false);
			} catch {
				toast.error("Failed to add triage item");
				setIsSubmitting(false);
			}
		},
		[content, createItem, projectId, onOpenChange]
	);

	useEffect(() => {
		if (open) {
			setContent("");
			setIsSubmitting(false);
		}
	}, [open]);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogTitle>Quick Add Triage</DialogTitle>
				<DialogDescription>
					Submit an idea or bug report to be refined by AI.
				</DialogDescription>
				<form className="mt-4 space-y-4" onSubmit={handleSubmit}>
					<Input
						autoFocus
						onChange={(e) => setContent(e.target.value)}
						placeholder="Describe an idea or bug..."
						value={content}
					/>
					<div className="flex justify-end gap-2">
						<Button
							disabled={isSubmitting}
							onClick={() => onOpenChange(false)}
							size="sm"
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={!content.trim() || isSubmitting}
							size="sm"
							type="submit"
						>
							{isSubmitting ? "Adding..." : "Add Item"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
