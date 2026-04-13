import { fetchWithAuth } from "@/lib/utils";
import { handleUnauthorized } from "@/lib/server-auth-helpers";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type TicketNotificationPrefs = {
  ticketReceiveNotifications: boolean;
  ticketReceiveEmails: boolean;
};

export async function fetchTicketNotificationPrefs(
  token: string
): Promise<TicketNotificationPrefs> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/users/me/ticket-notification-prefs`,
      { method: "GET" },
      token
    );
    if (!res.ok) throw res;
    return (await res.json()) as TicketNotificationPrefs;
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function updateTicketNotificationPrefs(
  token: string,
  payload: TicketNotificationPrefs
): Promise<TicketNotificationPrefs> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/users/me/ticket-notification-prefs`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      token
    );
    if (!res.ok) throw res;
    return (await res.json()) as TicketNotificationPrefs;
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function notifyTickets(
  token: string,
  ticketIds: string[]
): Promise<{ success?: boolean }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/users/me/ticket-notify-tickets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds }),
      },
      token
    );
    if (!res.ok) throw res;
    return (await res.json()) as { success?: boolean };
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function removeNotifiedTicket(
  token: string,
  ticketId: string
): Promise<{ success?: boolean }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/users/me/ticket-notify-tickets/${ticketId}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw res;
    if (res.status === 204) return { success: true };
    return (await res.json()) as { success?: boolean };
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function emailTickets(
  token: string,
  ticketIds: string[]
): Promise<{ success?: boolean }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/users/me/ticket-email-tickets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds }),
      },
      token
    );
    if (!res.ok) throw res;
    return (await res.json()) as { success?: boolean };
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}

export async function removeEmailedTicket(
  token: string,
  ticketId: string
): Promise<{ success?: boolean }> {
  try {
    const res = await fetchWithAuth(
      `${apiUrl}/users/me/ticket-email-tickets/${ticketId}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw res;
    if (res.status === 204) return { success: true };
    return (await res.json()) as { success?: boolean };
  } catch (error) {
    await handleUnauthorized(error);
    throw error;
  }
}
