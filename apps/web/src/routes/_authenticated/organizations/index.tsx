import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Check, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/organizations/")({
	component: OrgSelectorPage,
});

function OrgSelectorPage() {
	const orgs = useQuery(api.organizations.list);
	const pendingInvites = useQuery(api.organizations.listPendingInvitesForUser);
	const navigate = useNavigate();

	useEffect(() => {
		if (
			orgs &&
			orgs.length === 1 &&
			pendingInvites &&
			pendingInvites.length === 0
		) {
			navigate({
				to: "/organizations/$orgId",
				params: { orgId: orgs[0]._id },
			});
		}
	}, [orgs, pendingInvites, navigate]);

	if (orgs === undefined || pendingInvites === undefined) {
		return <Loader />;
	}

	return (
		<div className="container mx-auto max-w-2xl px-4 py-12">
			<h1 className="mb-8 text-center font-bold text-3xl">
				Select Organization
			</h1>

			{pendingInvites.length > 0 && (
				<div className="mb-8">
					<h2 className="mb-3 flex items-center gap-2 font-semibold text-lg">
						<Mail className="h-5 w-5" />
						Pending Invites
					</h2>
					<div className="space-y-3">
						{pendingInvites.map((invite) => (
							<InviteCard invite={invite} key={invite._id} />
						))}
					</div>
				</div>
			)}

			{orgs.length > 0 && (
				<div className="mb-8 space-y-3">
					{orgs.map((org) => (
						<Card
							className="cursor-pointer transition-colors hover:bg-muted/50"
							key={org._id}
							onClick={() =>
								navigate({
									to: "/organizations/$orgId",
									params: { orgId: org._id },
								})
							}
						>
							<CardHeader>
								<CardTitle>{org.name}</CardTitle>
								<CardDescription>Role: {org.role}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			)}

			<CreateOrgForm />
		</div>
	);
}

function InviteCard({
	invite,
}: {
	invite: {
		_id: Id<"organizationInvites">;
		orgName: string;
		role: string;
		inviterName: string;
	};
}) {
	const acceptInvite = useMutation(api.organizations.acceptInvite);
	const navigate = useNavigate();
	const [isAccepting, setIsAccepting] = useState(false);

	const handleAccept = async () => {
		setIsAccepting(true);
		try {
			const orgId = await acceptInvite({ inviteId: invite._id });
			toast.success(`Joined ${invite.orgName}`);
			navigate({
				to: "/organizations/$orgId",
				params: { orgId },
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to accept invite"
			);
		} finally {
			setIsAccepting(false);
		}
	};

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<div>
					<CardTitle>{invite.orgName}</CardTitle>
					<CardDescription className="flex items-center gap-2">
						Invited by {invite.inviterName} as{" "}
						<Badge variant="outline">{invite.role}</Badge>
					</CardDescription>
				</div>
				<div className="flex gap-2">
					<Button disabled={isAccepting} onClick={handleAccept} size="sm">
						<Check className="mr-1 h-4 w-4" />
						{isAccepting ? "Joining..." : "Accept"}
					</Button>
				</div>
			</CardHeader>
		</Card>
	);
}

function CreateOrgForm() {
	const [name, setName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const createOrg = useMutation(api.organizations.create);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			const orgId = await createOrg({ name: name.trim() });
			navigate({
				to: "/organizations/$orgId",
				params: { orgId },
			});
		} catch {
			toast.error("Failed to create organization");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create New Organization</CardTitle>
			</CardHeader>
			<form className="space-y-4 px-6 pb-6" onSubmit={handleSubmit}>
				<div className="space-y-2">
					<Label htmlFor="org-name">Organization Name</Label>
					<Input
						id="org-name"
						onChange={(e) => setName(e.target.value)}
						placeholder="My Organization"
						value={name}
					/>
				</div>
				<Button
					className="w-full"
					disabled={!name.trim() || isSubmitting}
					type="submit"
				>
					{isSubmitting ? "Creating..." : "Create Organization"}
				</Button>
			</form>
		</Card>
	);
}
