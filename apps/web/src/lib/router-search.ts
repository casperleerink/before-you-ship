export function toggleSearchListValue<T extends string>(
	values: readonly T[] | undefined,
	value: T
): T[] {
	const currentValues = values ?? [];

	if (currentValues.includes(value)) {
		return currentValues.filter((item) => item !== value);
	}

	return [...currentValues, value];
}
