import { ISODateString, ProjectMemberRole } from "../definitions";

export type ProjectMember = {
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: ISODateString;
};
