import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { useAuthState } from "@/lib/auth";

export const Route = createFileRoute("/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	const { isAuthenticated, isPending } = useAuthState();
	const navigate = useNavigate();
	const [showSignUp, setShowSignUp] = useState(false);

	useEffect(() => {
		if (!isPending && isAuthenticated) {
			navigate({ to: "/" });
		}
	}, [isAuthenticated, isPending, navigate]);

	if (isPending) {
		return <Loader />;
	}

	if (isAuthenticated) {
		return null;
	}

	return (
		<div className="flex flex-1 items-center justify-center">
			{showSignUp ? (
				<SignUpForm onSwitchToSignIn={() => setShowSignUp(false)} />
			) : (
				<SignInForm onSwitchToSignUp={() => setShowSignUp(true)} />
			)}
		</div>
	);
}
