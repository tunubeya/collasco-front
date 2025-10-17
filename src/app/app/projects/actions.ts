'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  ProjectStatus,
  Visibility,
} from '@/lib/definitions';
import {
  fetchCreateProject,
  fetchDeleteProject,
  fetchUpdateProject,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import type {
  CreateProjectDto,
  UpdateProjectDto,
} from '@/lib/model-definitions/project';
import { RoutesEnum } from '@/lib/utils';

export type ProjectFormState = {
  fieldErrors?: Partial<Record<'name' | 'status' | 'visibility' | 'repositoryUrl', string>>;
  message?: string;
};

function coerceProjectStatus(value: FormDataEntryValue | null): ProjectStatus {
  if (typeof value !== 'string') return ProjectStatus.ACTIVE;
  return (Object.values(ProjectStatus) as string[]).includes(value)
    ? (value as ProjectStatus)
    : ProjectStatus.ACTIVE;
}

function coerceVisibility(value: FormDataEntryValue | null): Visibility {
  if (typeof value !== 'string') return Visibility.PRIVATE;
  return (Object.values(Visibility) as string[]).includes(value)
    ? (value as Visibility)
    : Visibility.PRIVATE;
}

export async function createProject(
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return {
      ...prevState,
      fieldErrors: { ...prevState.fieldErrors, name: 'required' },
    };
  }

  const dto: CreateProjectDto = {
    name,
    description: ((formData.get('description') ?? '') as string).trim() || null,
    repositoryUrl:
      ((formData.get('repositoryUrl') ?? '') as string).trim() || null,
    status: coerceProjectStatus(formData.get('status')),
    visibility: coerceVisibility(formData.get('visibility')),
  };

  try {
    const created = await fetchCreateProject(session.token, dto);
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${created.id}`);
    redirect(`/app/projects/${created.id}`);
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 400) {
        const body = await safeReadJson(error);
        return {
          fieldErrors: prevState.fieldErrors,
          message: body?.message ?? 'validation_error',
        };
      }
      if (error.status === 403) {
        redirect(RoutesEnum.ERROR_UNAUTHORIZED);
      }
    }
    throw error;
  }
  return prevState;
}

export async function updateProject(
  projectId: string,
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const name = formData.get('name');
  if (typeof name === 'string' && name.trim().length === 0) {
    return {
      ...prevState,
      fieldErrors: { ...prevState.fieldErrors, name: 'required' },
    };
  }

  const descriptionEntry = formData.get('description');
  const repositoryEntry = formData.get('repositoryUrl');

  const dto: UpdateProjectDto = {
    name: typeof name === 'string' ? name.trim() : undefined,
    description:
      typeof descriptionEntry === 'string'
        ? (descriptionEntry.trim() === '' ? null : descriptionEntry.trim())
        : undefined,
    repositoryUrl:
      typeof repositoryEntry === 'string'
        ? (repositoryEntry.trim() === '' ? null : repositoryEntry.trim())
        : undefined,
    status:
      typeof formData.get('status') === 'string'
        ? coerceProjectStatus(formData.get('status'))
        : undefined,
    visibility:
      typeof formData.get('visibility') === 'string'
        ? coerceVisibility(formData.get('visibility'))
        : undefined,
  };

  try {
    await fetchUpdateProject(session.token, projectId, dto);
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${projectId}`);
    redirect(`/app/projects/${projectId}`);
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 400) {
        const body = await safeReadJson(error);
        return {
          fieldErrors: prevState.fieldErrors,
          message: body?.message ?? 'validation_error',
        };
      }
      if (error.status === 403) {
        redirect(RoutesEnum.ERROR_UNAUTHORIZED);
      }
    }
    throw error;
  }
  return prevState;
}

export async function deleteProject(projectId: string): Promise<void> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  try {
    await fetchDeleteProject(session.token, projectId);
    revalidatePath(RoutesEnum.APP_PROJECTS);
    redirect(RoutesEnum.APP_PROJECTS);
  } catch (error) {
    if (error instanceof Response && error.status === 403) {
      redirect(RoutesEnum.ERROR_UNAUTHORIZED);
    }
    throw error;
  }
}

async function safeReadJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
