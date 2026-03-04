import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TriageQuickAddForm({
	projectId,
	onSuccess,
	layout = "inline",
}: {
	projectId: Id<"projects">;
	onSuccess: () => void;
	layout?: "inline" | "stacked";
}) {
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createItem = useMutation(api.triageItems.create);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			await createItem({ projectId, content: content.trim() });
			toast.success("Triage item added");
			setContent("");
			onSuccess();
		} catch {
			toast.error("Failed to add triage item");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (layout === "stacked") {
		return (
			<form className="space-y-2" onSubmit={handleSubmit}>
				<Input
					autoFocus
					onChange={(e) => setContent(e.target.value)}
					placeholder="Describe an idea or bug..."
					value={content}
				/>
				<div className="flex gap-2">
					<Button
						className="flex-1"
						disabled={!content.trim() || isSubmitting}
						size="sm"
						type="submit"
					>
						{isSubmitting ? "Adding..." : "Add"}
					</Button>
					<Button
						disabled={isSubmitting}
						onClick={onSuccess}
						size="sm"
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
				</div>
			</form>
		);
	}

	return (
		<form className="flex gap-2" onSubmit={handleSubmit}>
			<Input
				autoFocus
				className="flex-1"
				onChange={(e) => setContent(e.target.value)}
				placeholder="Describe an idea or bug..."
				value={content}
			/>
			<Button
				disabled={!content.trim() || isSubmitting}
				size="sm"
				type="submit"
			>
				{isSubmitting ? "Adding..." : "Add"}
			</Button>
			<Button
				disabled={isSubmitting}
				onClick={onSuccess}
				size="sm"
				type="button"
				variant="outline"
			>
				Cancel
			</Button>
		</form>
	);
}
