# Feature: Optimistic conversation status updates

## Status: Open
## Priority: Medium
## Type: Feature
## Effort: Medium

## Problem

The shared conversation status dropdown currently waits for the mutation round-trip before the UI visibly updates, which makes the interaction feel slow. It also keeps the menu open after selecting a new status, so the action does not feel complete.

## Goal

Make conversation status changes feel immediate and deterministic:

1. Update the visible badge optimistically as soon as the user selects a new status
2. Dismiss the dropdown immediately after selection
3. Reconcile with the server response and roll back on failure
4. Keep the list view and detail view consistent when both are mounted

## Approach

- Add local optimistic state to the shared conversation status dropdown component
- Prevent duplicate submissions while a status change is in flight
- Close the menu on selection
- On mutation failure, restore the previous status and surface an error toast
- If needed, follow up with a broader optimistic-update strategy for other mutable UI

## Files

- `apps/web/src/components/conversation-status-dropdown.tsx`
- any route using that component if additional state sync is needed
