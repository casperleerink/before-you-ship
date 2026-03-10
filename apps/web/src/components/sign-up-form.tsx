import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { trimEmail, trimName } from "@/features/forms/form-values";
import { getAppFormOnSubmit, useAppForm } from "@/lib/app-form";
import { authClient } from "@/lib/auth-client";
import { getSignUpFormDefaults, signUpFormSchema } from "@/lib/form-schemas";

import { Button } from "./ui/button";

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const navigate = useNavigate();

	const form = useAppForm({
		defaultValues: getSignUpFormDefaults(),
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: trimEmail(value.email),
					password: value.password,
					name: trimName(value.name),
				},
				{
					onSuccess: () => {
						navigate({
							to: "/",
						});
						toast.success("Sign up successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				}
			);
		},
		validators: {
			onChange: signUpFormSchema,
			onSubmit: signUpFormSchema,
		},
	});

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">Create Account</h1>

			<form.AppForm>
				<form className="space-y-4" onSubmit={getAppFormOnSubmit(form)}>
					<form.AppField name="name">
						{(field) => (
							<field.TextField
								autoComplete="name"
								label="Name"
								placeholder="Your name"
							/>
						)}
					</form.AppField>

					<form.AppField name="email">
						{(field) => (
							<field.TextField
								autoComplete="email"
								label="Email"
								placeholder="name@company.com"
								type="email"
							/>
						)}
					</form.AppField>

					<form.AppField name="password">
						{(field) => (
							<field.TextField
								autoComplete="new-password"
								label="Password"
								type="password"
							/>
						)}
					</form.AppField>

					<form.SubmitButton
						className="w-full"
						submittingText="Submitting..."
						type="submit"
					>
						Sign Up
					</form.SubmitButton>
				</form>
			</form.AppForm>

			<div className="mt-4 text-center">
				<Button
					className="text-indigo-600 hover:text-indigo-800"
					onClick={onSwitchToSignIn}
					variant="link"
				>
					Already have an account? Sign In
				</Button>
			</div>
		</div>
	);
}
