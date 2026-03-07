# Refactor: Extract shared ConversationStatusDropdown component

## Status: Open
## Priority: Medium
## Type: Refactor
## Effort: Small

## Problem

The conversation status dropdown is duplicated in two files with nearly identical code (~40 lines each):

- `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/conversations/index.tsx:187-230`
- `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/conversations/$conversationId.tsx:111-149`

Both render a `DropdownMenu` with `DropdownMenuRadioGroup`, mapping over `CONVERSATION_STATUS_OPTIONS`, calling `updateStatus` on change.

## Fix

Create a shared component at `apps/web/src/components/conversation-status-dropdown.tsx`:

```tsx
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import type { ConversationStatus } from "@/lib/conversation-utils";

interface ConversationStatusDropdownProps {
  conversationId: Id<"conversations">;
  status: ConversationStatus;
}

export function ConversationStatusDropdown({
  conversationId,
  status,
}: ConversationStatusDropdownProps) {
  const updateStatus = useMutation(api.conversations.updateStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="cursor-pointer" type="button">
            <Badge variant={conversationStatusVariant(status)}>
              {status}
            </Badge>
          </button>
        }
      />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value) => {
              const option = CONVERSATION_STATUS_OPTIONS.find(
                (entry) => entry.value === value
              );
              if (option && option.value !== status) {
                updateStatus({ conversationId, status: option.value });
              }
            }}
            value={status}
          >
            {CONVERSATION_STATUS_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Then replace the duplicated code in both route files with `<ConversationStatusDropdown>`.

## Files

- `apps/web/src/components/conversation-status-dropdown.tsx` (new)
- `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/conversations/index.tsx`
- `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/conversations/$conversationId.tsx`
