export type ISODateString = string;

// Types

export type ResponseLogin = {
  accessToken: string;
  refreshToken: string;
  email: string;
  storeId: string | null;
  accessTokenExpirationDate: string;
  refreshTokenExpirationDate: string;
  role: string;
};
// ResponseRefresh is similar to ResponseLogin but replaces 'email' with 'confirmed'
export type ResponseRefresh = Omit<ResponseLogin, "email"> & {
  confirmed: boolean;
};

export type ResponseForgotPass = {
  message: string;
};
export type SessionPayload = {
  email?: string;
  token?: string;
  expiresAt: string;
  role?: string;
};
export type RefreshInfoPayload = {
  email: string;
  refreshToken: string;
  refreshTokenExpirationDate: string;
};
export type Session = {
  token: string;
  confirmed: boolean;
  expiresAt: string;
  role?: string;
};
export type CollectedCookies = {
      encryptedSessionData?: string;
      newSessionExpiresAt?: Date;
      encryptedRefreshInfo?: string;
      newRefreshInfoExpiresAt?: Date;
      encryptedStoreData?: string;
      newToken?: string;
      subdomain?: string;
    }
// Form State Types
export type SignUpErrorState = {
  email?: string[];
  password?: string[];
  confirmPassword?: string[];
};
export type ResetPassErrorState = {
  password?: string[];
  confirmPassword?: string[];
};
export type ChangePassErrorState = {
  currentPassword?: string[];
  newPassword?: string[];
  confirmPassword?: string[];
};
export type FormState<T> =
  | {
      errors?: T;
      success?: boolean;
    }
  | undefined;
// Interfaces
export interface ExpandedState {
  [key: string]: boolean;
}
export interface Tab {
  id: number;
  label: string;
}
export enum UserRole {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
  TESTER = 'TESTER',
}

export enum ProjectMemberRole {
  OWNER = 'OWNER',
  MAINTAINER = 'MAINTAINER',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  FINISHED = 'FINISHED',
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export enum FeaturePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum FeatureStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}



export type StructureFeatureItem = {
  type: "feature";
  id: string;
  moduleId: string;
  name: string;
  status: string;      // usar tus enums si lo deseas
  priority: string | null;
  sortOrder: number;
  order: number;
  createdAt: string;
  publishedVersionId: string | null;
};
export type StructureModuleNode = {
  type: "module";
  id: string;
  name: string;
  parentModuleId: string | null;
  isRoot: boolean;
  sortOrder: number;
  order: number;
  createdAt: string;
  publishedVersionId: string | null;
  items: Array<StructureModuleNode | StructureFeatureItem>;
};

export type ProjectStructureResponse = {
  projectId: string;
  modules: StructureModuleNode[];
};