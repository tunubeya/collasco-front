import { ISODateString } from "../definitions";
import { Feature } from "./feature";

export type Module = {
  id: string;
  projectId: string;
  parentModuleId: string | null;
  name: string;
  description: string | null;
  isRoot: boolean;
  sortOrder: number;
  path: string | null;
  depth: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastModifiedById: string | null;
  publishedVersionId: string | null;
  childrens: Module[]|null;
  features: Feature[]|null;
};
export type CreateModuleDto = {
  name: string;
  description?: string | null;
  parentModuleId?: string | null; // null para root
  isRoot?: boolean;               // true si parent=null
};

export type UpdateModuleDto = Partial<CreateModuleDto>;
