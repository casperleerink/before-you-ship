import { authClient } from "@/lib/auth-client";

export function useAuthState() {
	const sessionState = authClient.useSession();
	const sessionData = sessionState.data;

	return {
		error: sessionState.error,
		isAuthenticated: Boolean(sessionData?.session),
		isPending: sessionState.isPending,
		isRefetching: sessionState.isRefetching,
		refetch: sessionState.refetch,
		session: sessionData?.session ?? null,
		user: sessionData?.user ?? null,
	};
}
