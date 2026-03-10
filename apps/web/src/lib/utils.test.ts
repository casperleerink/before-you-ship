import { afterEach, expect, test, vi } from "vitest";

import { formatDate, formatRelativeTime } from "./utils";

const YEAR_2026_PATTERN = /2026/;

afterEach(() => {
	vi.useRealTimers();
});

test("formats dates using a short locale-aware format", () => {
	expect(formatDate(Date.UTC(2026, 0, 5))).toMatch(YEAR_2026_PATTERN);
});

test("formats relative time across minute, hour, and day thresholds", () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

	expect(
		formatRelativeTime(new Date("2026-03-10T11:59:45.000Z").getTime())
	).toBe("just now");
	expect(
		formatRelativeTime(new Date("2026-03-10T11:30:00.000Z").getTime())
	).toBe("30m ago");
	expect(
		formatRelativeTime(new Date("2026-03-10T09:00:00.000Z").getTime())
	).toBe("3h ago");
	expect(
		formatRelativeTime(new Date("2026-03-08T12:00:00.000Z").getTime())
	).toBe("2d ago");
});
