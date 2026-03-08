export function parseListInput(value: string) {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

export function stringifyListInput(values?: string[]) {
	return values?.join(", ") ?? "";
}
