import type { ISODateString } from "../definitions";

export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED";

export type TicketSectionType = "DESCRIPTION" | "RESPONSE" | "COMMENT";

export type TicketUser = {
  id: string;
  name?: string;
  email?: string;
};

export type TicketProject = {
  id: string;
  name: string;
};

export type TicketFeature = {
  id: string;
  name: string;
  moduleId?: string;
  projectId?: string;
  path?: string;
};

export type Ticket = {
  id: string;
  title: string;
  status: TicketStatus;
  project?: TicketProject | null;
  createdBy?: TicketUser | null;
  assignee?: TicketUser | null;
  feature?: TicketFeature | null;
  sectionsCount?: number;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
};

export type TicketSection = {
  id: string;
  ticketId?: string;
  type: TicketSectionType;
  title?: string | null;
  content: string;
  authorId: string;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
  author?: TicketUser | null;
};

export type TicketDetail = {
  id: string;
  projectId: string;
  title: string;
  status: TicketStatus;
  featureId?: string | null;
  assigneeId?: string | null;
  createdById: string;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
  project?: TicketProject | null;
  createdBy?: TicketUser | null;
  assignee?: TicketUser | null;
  feature?: TicketFeature | null;
  sections?: TicketSection[];
};

export type TicketImage = {
  id: string;
  ticketId: string;
  name: string;
  url: string;
  uploadedById: string;
  createdAt: ISODateString;
};

export type TicketUpdateResponse = {
  id: string;
  projectId: string;
  title: string;
  status: TicketStatus;
  featureId?: string | null;
  assigneeId?: string | null;
  createdById: string;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
};

export type TicketListResponse = {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
