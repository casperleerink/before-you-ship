import { z } from "zod";

type NonEmptyStringTuple = readonly [string, ...string[]];

export function parseCommaSeparatedSearchParam(value: unknown): string[] {
	if (typeof value !== "string" || value.length === 0) {
		return [];
	}

	return Array.from(
		new Set(
			value
				.split(",")
				.map((part) => part.trim())
				.filter(Boolean)
		)
	);
}

export function createEnumListSearchParamSchema<
	const T extends NonEmptyStringTuple,
>(values: T) {
	const allowed = new Set<string>(values);

	return z.preprocess(
		(value) =>
			parseCommaSeparatedSearchParam(value).filter((item) => allowed.has(item)),
		z.array(z.enum(values)).catch([])
	);
}

export const stringListSearchParamSchema = z.preprocess(
	(value) => parseCommaSeparatedSearchParam(value),
	z.array(z.string()).catch([])
);

export function serializeSearchParamList(values: string[]): string | undefined {
	if (values.length === 0) {
		return undefined;
	}

	return values.join(",");
}

export function toggleSearchListValue(
	values: string[],
	value: string
): string[] {
	if (values.includes(value)) {
		return values.filter((item) => item !== value);
	}

	return [...values, value];
}
