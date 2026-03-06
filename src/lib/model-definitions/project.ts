import { ISODateString, ProjectStatus, Visibility } from "../definitions";
import { Module } from "./module";

export type Project = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  status: ProjectStatus;
  repositoryUrl: string | null;
  visibility: Visibility;
  deadline: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt?: ISODateString | null;
  deletedById?: string | null;
  deletedBy?: { id: string; name?: string | null; email?: string | null } | null;
  ownerId: string;
  modules: Module[];
  members?: ProjectMember[];
  membershipRoleId?: string | null;
  membershipRole?: string | null;
};

export type ProjectMember = {
  projectId: string;
  userId: string;
  roleId: string;
  joinedAt: ISODateString;
  user?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
  role?: {
    id: string;
    name: string;
    isOwner?: boolean;
    isDefault?: boolean;
  } | null;
};

// DTOs (alineados a tu back)
export type CreateProjectDto = {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  visibility?: Visibility;
  repositoryUrl?: string | null;
};

export type UpdateProjectDto = Partial<CreateProjectDto>;
