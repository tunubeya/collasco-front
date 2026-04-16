import type { TicketDetail, TicketImage, TicketSection, TicketSectionType } from "@/lib/model-definitions/ticket";

const apiUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "";

export type PublicTicketLinkInfo = {
  projectId: string;
  projectName?: string;
  active: boolean;
};

export type PublicCreateTicketResponse = {
  ticketId: string;
  followUpToken: string;
};

export type PublicTicketFollowResponse = {
  ticket?: TicketDetail;
  sections?: TicketSection[];
  images?: TicketImage[];
  projectName?: string;
};

export class PublicTicketError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parsePublicError(res: Response, fallback: string) {
  let message: string | null = null;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    message =
      (data && (data.message || data.error || data.detail)) ??
      (typeof data === "string" ? data : null);
  }
  if (!message) {
    message = await res.text().catch(() => null);
  }
  throw new PublicTicketError(res.status, message || fallback);
}

export async function validatePublicTicketLink(
  token: string
): Promise<PublicTicketLinkInfo> {
  const res = await fetch(`${apiUrl}/public/tickets/links/${token}`, {
    method: "GET",
  });
  if (!res.ok) {
    await parsePublicError(res, "Failed to validate public ticket link");
  }
  return (await res.json()) as PublicTicketLinkInfo;
}

export async function createPublicTicket(
  token: string,
  payload: { title: string; content: string; email: string; name?: string }
): Promise<PublicCreateTicketResponse> {
  const res = await fetch(`${apiUrl}/public/tickets/links/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await parsePublicError(res, "Failed to create public ticket");
  }
  return (await res.json()) as PublicCreateTicketResponse;
}

export async function fetchPublicTicketFollow(
  followUpToken: string
): Promise<PublicTicketFollowResponse> {
  const res = await fetch(`${apiUrl}/public/tickets/follow/${followUpToken}`, {
    method: "GET",
  });
  if (!res.ok) {
    await parsePublicError(res, "Failed to fetch public ticket");
  }
  const payload = await res.json();
  if (payload && typeof payload === "object" && "id" in payload && "title" in payload) {
    const ticket = payload as TicketDetail;
    return {
      ticket,
      sections: ticket.sections ?? [],
      images: (payload as { images?: TicketImage[] }).images ?? [],
    };
  }
  return payload as PublicTicketFollowResponse;
}

export async function addPublicTicketSection(
  followUpToken: string,
  payload: { type: TicketSectionType; content: string }
): Promise<TicketSection> {
  const res = await fetch(
    `${apiUrl}/public/tickets/follow/${followUpToken}/sections`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    await parsePublicError(res, "Failed to add ticket section");
  }
  return (await res.json()) as TicketSection;
}

export async function updatePublicTicketSection(
  followUpToken: string,
  sectionId: string,
  payload: { content: string }
): Promise<TicketSection> {
  const res = await fetch(
    `${apiUrl}/public/tickets/follow/${followUpToken}/sections/${sectionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    await parsePublicError(res, "Failed to update ticket section");
  }
  return (await res.json()) as TicketSection;
}

export async function uploadPublicTicketImage(
  followUpToken: string,
  payload: { file: File; name?: string }
): Promise<TicketImage> {
  const formData = new FormData();
  formData.append("file", payload.file);
  if (payload.name) {
    formData.append("name", payload.name);
  }
  const res = await fetch(
    `${apiUrl}/public/tickets/follow/${followUpToken}/images`,
    {
      method: "POST",
      body: formData,
    }
  );
  if (!res.ok) {
    await parsePublicError(res, "Failed to upload ticket image");
  }
  return (await res.json()) as TicketImage;
}

export async function updatePublicTicket(
  followUpToken: string,
  payload: { title?: string }
): Promise<TicketDetail> {
  const res = await fetch(`${apiUrl}/public/tickets/follow/${followUpToken}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await parsePublicError(res, "Failed to update ticket");
  }
  return (await res.json()) as TicketDetail;
}
