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
  deletedAt?: ISODateString | null;
  deletedById?: string | null;
  deletedBy?: { id: string; name?: string | null; email?: string | null } | null;
  lastModifiedById: string | null;
  publishedVersionId: string | null;
  versions?: FeatureVersion[];
  issueElements?: IssueElement[];
  publishedVersion?: { id: string; versionNumber: number } | null;
  linkedFeaturesCount?: number;
  testCasesCount?: number;
};
export type CreateFeatureDto = {
  name: string;
  description?: string | null;
  priority?: FeaturePriority | null; // default MEDIUM en back
  status?: FeatureStatus; // default PENDING en back
};

export type UpdateFeatureDto = Partial<CreateFeatureDto> & {
  moduleId?: string;
};
