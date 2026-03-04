import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/docs"
)({
	component: DocsPage,
});

function formatDate(timestamp: number) {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function DocEditor({
	doc,
	onClose,
}: {
	doc: Doc<"docs">;
	onClose: () => void;
}) {
	const updateDoc = useMutation(api.docs.update);
	const removeDoc = useMutation(api.docs.remove);
	const [title, setTitle] = useState(doc.title);
	const [content, setContent] = useState(doc.content);
	const [isPreview, setIsPreview] = useState(false);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const saveChanges = (updates: { title?: string; content?: string }) => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}
		saveTimeoutRef.current = setTimeout(() => {
			updateDoc({ docId: doc._id, ...updates });
		}, 500);
	};

	const handleTitleChange = (newTitle: string) => {
		setTitle(newTitle);
		saveChanges({ title: newTitle });
	};

	const handleContentChange = (newContent: string) => {
		setContent(newContent);
		saveChanges({ content: newContent });
	};

	const handleDelete = async () => {
		await removeDoc({ docId: doc._id });
		onClose();
	};

	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	return (
		<SheetContent className="sm:max-w-xl">
			<SheetHeader>
				<SheetTitle>
					<input
						className="w-full border-none bg-transparent font-bold text-xl outline-none focus:ring-0"
						onChange={(e) => handleTitleChange(e.target.value)}
						placeholder="Untitled document"
						type="text"
						value={title}
					/>
				</SheetTitle>
			</SheetHeader>
			<SheetBody>
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Button
								onClick={() => setIsPreview(false)}
								size="sm"
								variant={isPreview ? "outline" : "default"}
							>
								<Pencil className="mr-1 size-3" />
								Edit
							</Button>
							<Button
								onClick={() => setIsPreview(true)}
								size="sm"
								variant={isPreview ? "default" : "outline"}
							>
								Preview
							</Button>
						</div>
						<Button onClick={handleDelete} size="sm" variant="ghost">
							<Trash2 className="mr-1 size-3" />
							Delete
						</Button>
					</div>

					{isPreview ? (
						<div className="prose prose-sm max-w-none rounded-md border bg-muted/50 p-4 text-sm">
							{content ? (
								<Streamdown>{content}</Streamdown>
							) : (
								<p className="text-muted-foreground">Nothing to preview.</p>
							)}
						</div>
					) : (
						<textarea
							className="min-h-[400px] w-full resize-y rounded-md border bg-background p-3 font-mono text-sm outline-none focus:ring-1 focus:ring-ring"
							onChange={(e) => handleContentChange(e.target.value)}
							placeholder="Write your document content in markdown..."
							value={content}
						/>
					)}
				</div>
			</SheetBody>
		</SheetContent>
	);
}

function DocsPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const docs = useQuery(api.docs.list, { projectId });
	const createDoc = useMutation(api.docs.create);
	const [selectedDocId, setSelectedDocId] = useState<Id<"docs"> | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newTitle, setNewTitle] = useState("");

	if (docs === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = newTitle.trim();
		if (!trimmed) {
			return;
		}
		const docId = await createDoc({ projectId, title: trimmed });
		setNewTitle("");
		setShowCreateForm(false);
		setSelectedDocId(docId);
	};

	const selectedDoc = selectedDocId
		? (docs.find((d) => d._id === selectedDocId) ?? null)
		: null;

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Docs</h1>
				<Button onClick={() => setShowCreateForm(true)} size="sm">
					<Plus className="mr-1 h-4 w-4" />
					New Doc
				</Button>
			</div>

			{showCreateForm && (
				<form className="mb-4 flex gap-2" onSubmit={handleCreate}>
					<input
						autoFocus
						className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
						onChange={(e) => setNewTitle(e.target.value)}
						placeholder="Document title..."
						type="text"
						value={newTitle}
					/>
					<Button disabled={!newTitle.trim()} size="sm" type="submit">
						Create
					</Button>
					<Button
						onClick={() => {
							setShowCreateForm(false);
							setNewTitle("");
						}}
						size="sm"
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
				</form>
			)}

			{docs.length === 0 && !showCreateForm ? (
				<EmptyState
					description="Create documents to provide context for AI conversations."
					icon={FileText}
					title="No documents yet"
				/>
			) : (
				<div className="space-y-2">
					{docs.map((doc) => (
						<button
							className="flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
							key={doc._id}
							onClick={() => setSelectedDocId(doc._id)}
							type="button"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">{doc.title}</p>
								<p className="text-muted-foreground text-xs">
									Updated {formatDate(doc.updatedAt)}
								</p>
							</div>
							<FileText className="size-4 shrink-0 text-muted-foreground" />
						</button>
					))}
				</div>
			)}

			<Sheet
				onOpenChange={(open) => {
					if (!open) {
						setSelectedDocId(null);
					}
				}}
				open={selectedDocId !== null}
			>
				{selectedDoc && (
					<DocEditor
						doc={selectedDoc}
						key={selectedDoc._id}
						onClose={() => setSelectedDocId(null)}
					/>
				)}
			</Sheet>
		</div>
	);
}
