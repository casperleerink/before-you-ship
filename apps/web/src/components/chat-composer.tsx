import { ArrowUp, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ChatComposer({
	onSubmit,
	isBusy,
}: {
	onSubmit: (text: string) => void;
	isBusy: boolean;
}) {
	const [input, setInput] = useState("");
	const canSubmit = !!input.trim() && !isBusy;

	const handleSubmit = () => {
		const text = input.trim();
		if (!text || isBusy) {
			return;
		}
		onSubmit(text);
		setInput("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<div className="px-4 pb-4">
			<div className="rounded-xl border border-border bg-card shadow-sm">
				<textarea
					autoFocus
					className="max-h-[200px] w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
					disabled={isBusy}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Explain your idea..."
					rows={2}
					value={input}
				/>
				<div className="flex items-center justify-between px-3 pb-2">
					<Button disabled size="icon-sm" variant="ghost">
						<Plus className="h-4 w-4" />
						<span className="sr-only">Attach</span>
					</Button>
					<Button
						className="rounded-full"
						disabled={!canSubmit}
						onClick={handleSubmit}
						size="icon-sm"
					>
						<ArrowUp className="h-4 w-4" />
						<span className="sr-only">Send message</span>
					</Button>
				</div>
			</div>
		</div>
	);
}
