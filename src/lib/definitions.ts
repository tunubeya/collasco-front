export type ISODateString = string;

// Types

export type ResponseLogin = {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  accessTokenExpirationDate: string;
  refreshTokenExpirationDate: string;
};

export type ResponseRefresh = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpirationDate: string;
  refreshTokenExpirationDate: string;
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
  expiresAt: string;
  role?: string;
};
export type CollectedCookies = {
      encryptedSessionData?: string;
      newSessionExpiresAt?: Date;
      encryptedRefreshInfo?: string;
      newRefreshInfoExpiresAt?: Date;
      newToken?: string;
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

export enum MoveDirection {
  UP = 'UP',
  DOWN = 'DOWN',
}

export type MoveOrderDto = {
  direction: MoveDirection;
};

export type MoveOrderResponse = {
  ok: boolean;
  featureId?: string;
  moduleId?: string;
  sortOrder: number;
};


export type StructureDocumentationLabel = {
  labelId: string;
  labelName: string;
  isMandatory: boolean;
  displayOrder: number;
  content: string | null;
  isNotApplicable: boolean;
  updatedAt: string | null;
};

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
  documentationLabels: StructureDocumentationLabel[];
  linkedFeatures?: Array<{
    id: string;
    name: string;
    moduleId: string | null;
    moduleName: string | null;
    reason?: string | null;
  }>;
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
  documentationLabels: StructureDocumentationLabel[];
  items: Array<StructureModuleNode | StructureFeatureItem>;
};

export type ProjectStructureResponse = {
  projectId: string;
  description?: string | null;
  modules: StructureModuleNode[];
};
