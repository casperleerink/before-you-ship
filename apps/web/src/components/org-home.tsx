import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { Check, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getAppFormOnSubmit, useAppForm } from "@/lib/app-form";
import { useAppMutation } from "@/lib/convex-mutation";
import {
	getOrganizationNameDefaults,
	organizationNameSchema,
} from "@/lib/form-schemas";

interface OrgHomeProps {
	onOpenOrg: (orgSlug: string) => void;
}

export default function OrgHome({ onOpenOrg }: OrgHomeProps) {
	const { data: orgs } = useQuery(convexQuery(api.organizations.list));
	const { data: pendingInvites } = useQuery(
		convexQuery(api.organizations.listPendingInvitesForUser)
	);

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
							<InviteCard
								invite={invite}
								key={invite._id}
								onOpenOrg={onOpenOrg}
							/>
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
							onClick={() => onOpenOrg(org.slug)}
						>
							<CardHeader>
								<CardTitle>{org.name}</CardTitle>
								<CardDescription>Role: {org.role}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			)}

			<CreateOrgForm onOpenOrg={onOpenOrg} />
		</div>
	);
}

function InviteCard({
	invite,
	onOpenOrg,
}: {
	invite: {
		_id: Id<"organizationInvites">;
		orgName: string;
		role: string;
		inviterName: string;
	};
	onOpenOrg: (orgSlug: string) => void;
}) {
	const { mutateAsync: acceptInvite } = useAppMutation(
		api.organizations.acceptInvite
	);
	const [isAccepting, setIsAccepting] = useState(false);

	const handleAccept = async () => {
		setIsAccepting(true);
		try {
			const result = await acceptInvite({ inviteId: invite._id });
			toast.success(`Joined ${invite.orgName}`);
			if (result.slug) {
				onOpenOrg(result.slug);
			}
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

function CreateOrgForm({
	onOpenOrg,
}: {
	onOpenOrg: (orgSlug: string) => void;
}) {
	const { mutateAsync: createOrg } = useAppMutation(api.organizations.create);
	const form = useAppForm({
		defaultValues: getOrganizationNameDefaults(),
		onSubmit: async ({ value }) => {
			try {
				const result = await createOrg({ name: value.name.trim() });
				form.reset();
				onOpenOrg(result.slug);
			} catch {
				toast.error("Failed to create organization");
			}
		},
		validators: {
			onChange: organizationNameSchema,
			onSubmit: organizationNameSchema,
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create New Organization</CardTitle>
			</CardHeader>
			<CardContent>
				<form.AppForm>
					<form className="space-y-4" onSubmit={getAppFormOnSubmit(form)}>
						<form.AppField name="name">
							{(field) => (
								<field.TextField
									autoFocus
									label="Organization Name"
									placeholder="My Organization"
								/>
							)}
						</form.AppField>
						<form.SubmitButton
							className="w-full"
							submittingText="Creating..."
							type="submit"
						>
							Create Organization
						</form.SubmitButton>
					</form>
				</form.AppForm>
			</CardContent>
		</Card>
	);
}
