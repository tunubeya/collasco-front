import { ISODateString } from "../definitions";

export type ModuleVersion = {
  id: string;
  moduleId: string;
  versionNumber: number;
  name: string | null;
  description: string | null;
  parentModuleId: string | null;
  isRoot: boolean | null;
  changelog: string | null;
  createdById: string | null;
  createdAt: ISODateString;
  isRollback: boolean;
  childrenPins: unknown | null; // JSON
  featurePins: unknown | null;  // JSON
  contentHash: string | null;
};