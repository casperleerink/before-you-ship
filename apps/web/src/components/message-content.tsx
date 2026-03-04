import { useSmoothText } from "@convex-dev/agent/react";
import { Streamdown } from "streamdown";

export default function MessageContent({
	text,
	isStreaming,
}: {
	text: string;
	isStreaming: boolean;
}) {
	const [visibleText] = useSmoothText(text, {
		startStreaming: isStreaming,
	});
	return <Streamdown>{visibleText}</Streamdown>;
}
