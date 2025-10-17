import { FeaturePriority, FeatureStatus, ISODateString } from "../definitions";
import { FeatureVersion } from "./feature-version";
import { IssueElement } from "./issue-element";

export type Feature = {
  id: string;
  moduleId: string;
  name: string;
  description: string | null;
  priority: FeaturePriority | null; // por tu esquema, default MEDIUM pero nullable en versiones
  status: FeatureStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastModifiedById: string | null;
  publishedVersionId: string | null;
  versions?: FeatureVersion[];
  issueElements?: IssueElement[];
  publishedVersion?: { id: string; versionNumber: number } | null;
};
export type CreateFeatureDto = {
  name: string;
  description?: string | null;
  priority?: FeaturePriority; // default MEDIUM en back
  status?: FeatureStatus;     // default PENDING en back
};

export type UpdateFeatureDto = Partial<CreateFeatureDto> & {
  moduleId?: string;
};
