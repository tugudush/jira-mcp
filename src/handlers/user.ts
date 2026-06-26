import { buildApiUrl, makeRequest } from "../api.js";
import { JiraUser } from "../types.js";

/**
 * Get information about the currently authenticated user.
 */
export async function handleGetCurrentUser(): Promise<{
  text: string;
  data: unknown;
}> {
  const url = buildApiUrl("/rest/api/3/myself");
  const data = await makeRequest<JiraUser>(url);

  const text = `Authenticated User:
- Name: ${data.displayName}
- Account ID: ${data.accountId}
- Email: ${data.emailAddress || "N/A"}
- Active: ${data.active}
- Time Zone: ${data.timeZone}
- Locale: ${data.locale}`;

  return { text, data };
}
