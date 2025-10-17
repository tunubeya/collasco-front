import { ISODateString } from "../definitions";

export type GithubIdentity = {
  id: string;
  userId: string;
  username: string | null;
  accessToken: string | null;
  // Metadata informativa (no tokens)
  tokenType: string | null;
  scopes: string | null;
  expiresAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};