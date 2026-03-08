import { useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import {
	type FunctionArgs,
	type FunctionReference,
	type FunctionReturnType,
	getFunctionName,
} from "convex/server";

type MutationOptions<FuncRef extends FunctionReference<"mutation" | "action">> =
	Omit<
		UseMutationOptions<
			FunctionReturnType<FuncRef>,
			Error,
			FunctionArgs<FuncRef>
		>,
		"mutationFn" | "mutationKey"
	>;

export function useAppMutation<FuncRef extends FunctionReference<"mutation">>(
	funcRef: FuncRef,
	options?: MutationOptions<FuncRef>
) {
	const rawMutationFn = useConvexMutation(funcRef);
	const mutationFn = (variables: FunctionArgs<FuncRef>) =>
		rawMutationFn(variables) as Promise<FunctionReturnType<FuncRef>>;

	return useMutation({
		...options,
		mutationFn,
		mutationKey: ["convexMutation", getFunctionName(funcRef)],
	});
}

export function useAppActionMutation<
	FuncRef extends FunctionReference<"action">,
>(funcRef: FuncRef, options?: MutationOptions<FuncRef>) {
	const rawMutationFn = useConvexAction(funcRef);
	const mutationFn = (variables: FunctionArgs<FuncRef>) =>
		rawMutationFn(variables) as Promise<FunctionReturnType<FuncRef>>;

	return useMutation({
		...options,
		mutationFn,
		mutationKey: ["convexAction", getFunctionName(funcRef)],
	});
}
