import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { z } from "zod";

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
import { getAppFormOnSubmit, useAppForm } from "@/lib/app-form";
import { useAppMutation } from "@/lib/convex-mutation";
import { docCreateSchema, getDocCreateDefaults } from "@/lib/form-schemas";
import { formatDate } from "@/lib/utils";

const searchSchema = z.object({
	docId: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/docs"
)({
	component: DocsPage,
	validateSearch: searchSchema,
});

function DocEditor({
	doc,
	onClose,
}: {
	doc: Doc<"docs">;
	onClose: () => void;
}) {
	const { mutate: updateDoc } = useAppMutation(api.docs.update);
	const { mutateAsync: removeDoc } = useAppMutation(api.docs.remove);
	const [title, setTitle] = useState(doc.title);
	const [content, setContent] = useState(doc.content);
	const [isPreview, setIsPreview] = useState(false);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const saveChanges = (updates: { content?: string; title?: string }) => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(() => {
			updateDoc({ docId: doc._id, ...updates });
		}, 500);
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
						onChange={(event) => {
							const nextTitle = event.target.value;
							setTitle(nextTitle);
							saveChanges({ title: nextTitle });
						}}
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
						<Button
							onClick={() => {
								handleDelete().catch(() => {
									// Keep the editor open if deletion fails.
								});
							}}
							size="sm"
							variant="ghost"
						>
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
							onChange={(event) => {
								const nextContent = event.target.value;
								setContent(nextContent);
								saveChanges({ content: nextContent });
							}}
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
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const projectId = projectIdParam as Id<"projects">;
	const { data: docs } = useQuery(convexQuery(api.docs.list, { projectId }));
	const { mutateAsync: createDoc } = useAppMutation(api.docs.create);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const form = useAppForm({
		defaultValues: getDocCreateDefaults(),
		onSubmit: async ({ value }) => {
			const docId = await createDoc({ projectId, title: value.title.trim() });
			form.reset();
			setShowCreateForm(false);
			navigate({
				search: (prev) => ({
					...prev,
					docId,
				}),
			});
		},
		validators: {
			onChange: docCreateSchema,
			onSubmit: docCreateSchema,
		},
	});

	const selectedDoc = search.docId
		? (docs?.find((doc) => doc._id === search.docId) ?? null)
		: null;

	useEffect(() => {
		if (docs && search.docId && !selectedDoc) {
			navigate({
				replace: true,
				search: (prev) => ({
					...prev,
					docId: undefined,
				}),
			});
		}
	}, [docs, navigate, search.docId, selectedDoc]);

	if (docs === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

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
				<form.AppForm>
					<form className="mb-4 flex gap-2" onSubmit={getAppFormOnSubmit(form)}>
						<div className="flex-1">
							<form.AppField name="title">
								{(field) => (
									<field.TextField
										autoFocus
										errorClassName="space-y-0 pt-1"
										label="Document title"
										placeholder="Document title..."
									/>
								)}
							</form.AppField>
						</div>
						<div className="flex items-start gap-2 pt-6">
							<form.SubmitButton size="sm" type="submit">
								Create
							</form.SubmitButton>
							<Button
								onClick={() => {
									setShowCreateForm(false);
									form.reset();
								}}
								size="sm"
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
						</div>
					</form>
				</form.AppForm>
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
							onClick={() =>
								navigate({
									search: (prev) => ({
										...prev,
										docId: doc._id,
									}),
								})
							}
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
						navigate({
							search: (prev) => ({
								...prev,
								docId: undefined,
							}),
						});
					}
				}}
				open={selectedDoc !== null}
			>
				{selectedDoc && (
					<DocEditor
						doc={selectedDoc}
						key={selectedDoc._id}
						onClose={() =>
							navigate({
								search: (prev) => ({
									...prev,
									docId: undefined,
								}),
							})
						}
					/>
				)}
			</Sheet>
		</div>
	);
}
