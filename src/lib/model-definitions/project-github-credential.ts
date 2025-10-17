import { ISODateString } from "../definitions";

export type ProjectGithubCredential = {
  id: string;
  projectId: string;
  // Nunca devuelvas tokens al front en endpoints públicos;
  // si necesitas "estado conectado", usa flags booleanos arriba.
  tokenType: string | null;
  scopes: string | null;
  expiresAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};
