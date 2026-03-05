import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const navigate = useNavigate();
	const [showSignUp, setShowSignUp] = useState(false);

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			navigate({ to: "/organizations" });
		}
	}, [isAuthenticated, isLoading, navigate]);

	if (isLoading) {
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
