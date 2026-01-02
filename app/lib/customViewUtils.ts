import { AccountType, CustomResultView } from "../types";

// Helper function to check if an account should be included in a custom view
export function isAccountInCustomView(
  accountId: number,
  groupId: number,
  accountType: AccountType,
  view: CustomResultView
): boolean {
  // If no filters are set, show all accounts
  if (
    (!view.accounts || view.accounts.length === 0) &&
    (!view.groups || view.groups.length === 0) &&
    (!view.types || view.types.length === 0)
  ) {
    return true;
  }

  // Check if account is directly selected
  if (view.accounts && view.accounts.includes(accountId)) {
    return true;
  }

  // Check if account's group is selected
  if (view.groups && view.groups.includes(groupId)) {
    return true;
  }

  // Check if account's type is selected
  if (view.types && view.types.includes(accountType)) {
    return true;
  }

  return false;
}
