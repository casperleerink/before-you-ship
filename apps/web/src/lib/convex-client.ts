import { ConvexQueryClient } from "@convex-dev/react-query";
import { env } from "@project-manager/env/web";
import { QueryClient } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";

export const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

export const convexQueryClient = new ConvexQueryClient(convex);

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 5,
			queryFn: convexQueryClient.queryFn(),
			queryKeyHashFn: convexQueryClient.hashFn(),
		},
	},
});

convexQueryClient.connect(queryClient);
