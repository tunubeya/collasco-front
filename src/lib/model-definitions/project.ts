import { ISODateString, ProjectMemberRole, ProjectStatus, Visibility } from "../definitions";
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
  ownerId: string;
  modules: Module[];
  members?: ProjectMember[];
  membershipRole?: ProjectMemberRole | null;
};

export type ProjectMember = {
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: ISODateString;
  user?: {
    id: string;
    email: string;
    name?: string | null;
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
