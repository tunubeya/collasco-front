import { FeaturePriority, FeatureStatus, ISODateString } from "../definitions";

export type FeatureVersion = {
  id: string;
  featureId: string;
  versionNumber: number;
  name: string | null;
  description: string | null;
  priority: FeaturePriority | null;
  status: FeatureStatus | null;
  changelog: string | null;
  createdById: string | null;
  createdAt: ISODateString;
  isRollback: boolean;
  contentHash: string | null;
};