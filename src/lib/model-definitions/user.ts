import { ISODateString, UserRole } from "../definitions";
import { GithubIdentity } from "./github-identity";

export type UserPreferences = {
  darkMode?: boolean;
  locale?: string | null;
  [key: string]: unknown;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  githubIdentity?: GithubIdentity | null;
  apiTokenMasked?: string | null;
  preferences?: UserPreferences | null;
};

export type UpdateUserDto = {
  name?: string;
  email?: string;
  preferences?: UserPreferences;
};
