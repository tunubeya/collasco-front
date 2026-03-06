import { ISODateString } from "../definitions";

export type ProjectMember = {
  projectId: string;
  userId: string;
  roleId: string;
  joinedAt: ISODateString;
  role?: {
    id: string;
    name: string;
    isOwner?: boolean;
    isDefault?: boolean;
  } | null;
};
