import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { trimEmail } from "@/features/forms/form-values";
import { getAppFormOnSubmit, useAppForm } from "@/lib/app-form";
import { authClient } from "@/lib/auth-client";
import { getSignInFormDefaults, signInFormSchema } from "@/lib/form-schemas";

import { Button } from "./ui/button";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const navigate = useNavigate();

	const form = useAppForm({
		defaultValues: getSignInFormDefaults(),
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: trimEmail(value.email),
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/",
						});
						toast.success("Sign in successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				}
			);
		},
		validators: {
			onChange: signInFormSchema,
			onSubmit: signInFormSchema,
		},
	});

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">Welcome Back</h1>

			<form.AppForm>
				<form className="space-y-4" onSubmit={getAppFormOnSubmit(form)}>
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
								autoComplete="current-password"
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
						Sign In
					</form.SubmitButton>
				</form>
			</form.AppForm>

			<div className="mt-4 text-center">
				<Button
					className="text-indigo-600 hover:text-indigo-800"
					onClick={onSwitchToSignUp}
					variant="link"
				>
					Need an account? Sign Up
				</Button>
			</div>
		</div>
	);
}
