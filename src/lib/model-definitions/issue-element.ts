import { ISODateString, ReviewStatus } from "../definitions";

export type IssueElement = {
  id: string;
  featureId: string;
  githubIssueUrl: string | null;
  pullRequestUrl: string | null;
  repoOwner: string | null;
  repoName: string | null;
  githubIssueNumber: number | null;
  githubPrNumber: number | null;
  commitHashes: string[]; // SHAs
  reviewStatus: ReviewStatus | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};