import {
	createFormHook,
	createFormHookContexts,
	useStore,
} from "@tanstack/react-form";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts();

function getErrorMessage(error: unknown) {
	if (typeof error === "string") {
		return error;
	}

	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}

	return "Invalid value";
}

function FieldErrors({
	errors,
	show,
	className,
}: {
	errors: unknown[];
	show: boolean;
	className?: string;
}) {
	if (!show || errors.length === 0) {
		return null;
	}

	return (
		<div className={cn("space-y-1", className)}>
			{errors.map((error, index) => (
				<p
					className="text-destructive text-xs"
					key={`${index}-${String(error)}`}
				>
					{getErrorMessage(error)}
				</p>
			))}
		</div>
	);
}

interface SharedFieldProps {
	description?: React.ReactNode;
	errorClassName?: string;
	hideErrorsUntilTouched?: boolean;
	label: React.ReactNode;
}

type TextFieldProps = SharedFieldProps &
	Omit<
		React.ComponentProps<typeof Input>,
		"id" | "name" | "value" | "onBlur" | "onChange"
	>;

function TextField({
	label,
	description,
	errorClassName,
	hideErrorsUntilTouched = true,
	...inputProps
}: TextFieldProps) {
	const field = useFieldContext<string>();
	const value = useStore(field.store, (state) => state.value);
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isBlurred = useStore(field.store, (state) => state.meta.isBlurred);
	const isTouched = useStore(field.store, (state) => state.meta.isTouched);
	const showErrors = !hideErrorsUntilTouched || isTouched || isBlurred;

	return (
		<div className="space-y-2">
			<Label htmlFor={field.name}>{label}</Label>
			<Input
				{...inputProps}
				aria-invalid={showErrors && errors.length > 0}
				id={field.name}
				name={field.name}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				value={value}
			/>
			{description ? (
				<p className="text-muted-foreground text-xs">{description}</p>
			) : null}
			<FieldErrors
				className={errorClassName}
				errors={errors}
				show={showErrors}
			/>
		</div>
	);
}

type TextareaFieldProps = SharedFieldProps &
	Omit<
		React.ComponentProps<"textarea">,
		"id" | "name" | "value" | "onBlur" | "onChange"
	>;

function TextareaField({
	label,
	description,
	className,
	errorClassName,
	hideErrorsUntilTouched = true,
	...textareaProps
}: TextareaFieldProps) {
	const field = useFieldContext<string>();
	const value = useStore(field.store, (state) => state.value);
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isBlurred = useStore(field.store, (state) => state.meta.isBlurred);
	const isTouched = useStore(field.store, (state) => state.meta.isTouched);
	const showErrors = !hideErrorsUntilTouched || isTouched || isBlurred;

	return (
		<div className="space-y-2">
			<Label htmlFor={field.name}>{label}</Label>
			<textarea
				{...textareaProps}
				aria-invalid={showErrors && errors.length > 0}
				className={cn(
					"flex min-h-24 w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:disabled:bg-input/80",
					className
				)}
				data-slot="textarea"
				id={field.name}
				name={field.name}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				value={value}
			/>
			{description ? (
				<p className="text-muted-foreground text-xs">{description}</p>
			) : null}
			<FieldErrors
				className={errorClassName}
				errors={errors}
				show={showErrors}
			/>
		</div>
	);
}

type SelectFieldProps = SharedFieldProps & {
	className?: string;
	options: Array<{ label: string; value: string }>;
	placeholder?: string;
};

function SelectField({
	label,
	description,
	className,
	errorClassName,
	hideErrorsUntilTouched = true,
	options,
	placeholder,
}: SelectFieldProps) {
	const field = useFieldContext<string>();
	const value = useStore(field.store, (state) => state.value);
	const errors = useStore(field.store, (state) => state.meta.errors);
	const isBlurred = useStore(field.store, (state) => state.meta.isBlurred);
	const isTouched = useStore(field.store, (state) => state.meta.isTouched);
	const showErrors = !hideErrorsUntilTouched || isTouched || isBlurred;

	return (
		<div className={cn("space-y-2", className)}>
			<Label>{label}</Label>
			<Select
				onValueChange={(newValue) => {
					field.handleChange(newValue as string);
					field.handleBlur();
				}}
				value={value}
			>
				<SelectTrigger
					aria-invalid={showErrors && errors.length > 0}
					className="w-full"
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			{description ? (
				<p className="text-muted-foreground text-xs">{description}</p>
			) : null}
			<FieldErrors
				className={errorClassName}
				errors={errors}
				show={showErrors}
			/>
		</div>
	);
}

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
	disableWhenPristine?: boolean;
	submittingText?: React.ReactNode;
};

function SubmitButton({
	children,
	disableWhenPristine = true,
	disabled,
	submittingText,
	...buttonProps
}: SubmitButtonProps) {
	const form = useFormContext();
	const canSubmit = useStore(form.store, (state) => state.canSubmit);
	const isPristine = useStore(form.store, (state) => state.isPristine);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
	const isDisabled =
		disabled ||
		isSubmitting ||
		!canSubmit ||
		(disableWhenPristine && isPristine);

	return (
		<Button {...buttonProps} disabled={isDisabled}>
			{isSubmitting ? (submittingText ?? children) : children}
		</Button>
	);
}

export const { useAppForm, withForm } = createFormHook({
	fieldComponents: {
		SelectField,
		TextareaField,
		TextField,
	},
	fieldContext,
	formComponents: {
		SubmitButton,
	},
	formContext,
});
export { FieldErrors };

export function getAppFormOnSubmit(
	form: Pick<{ handleSubmit: () => Promise<unknown> | unknown }, "handleSubmit">
) {
	return (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();
		return Promise.resolve(form.handleSubmit()).catch(() => {
			// Validation errors are exposed in form state.
		});
	};
}
