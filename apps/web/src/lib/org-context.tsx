import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createContext, useContext } from "react";

type OrgRole = "owner" | "admin" | "member";

export interface OrgContextValue {
	_id: Id<"organizations">;
	name: string;
	role: OrgRole;
	slug: string;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
	children,
	org,
}: {
	children: React.ReactNode;
	org: OrgContextValue;
}) {
	return <OrgContext.Provider value={org}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
	const org = useContext(OrgContext);
	if (!org) {
		throw new Error("useOrg must be used within an OrgProvider");
	}
	return org;
}
