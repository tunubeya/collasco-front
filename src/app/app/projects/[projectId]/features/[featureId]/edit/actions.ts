'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  FeaturePriority,
  FeatureStatus,
} from '@/lib/definitions';
import {
  fetchDeleteFeature,
  fetchUpdateFeature,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import type { UpdateFeatureDto } from '@/lib/model-definitions/feature';
import { RoutesEnum } from '@/lib/utils';

import type {
  FeatureFormState,
} from '../../new/actions';

function coerceStatus(value: FormDataEntryValue | null): FeatureStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return (Object.values(FeatureStatus) as string[]).includes(value)
    ? (value as FeatureStatus)
    : undefined;
}

function coercePriority(value: FormDataEntryValue | null): FeaturePriority | undefined {
  if (typeof value !== 'string') return undefined;
  return (Object.values(FeaturePriority) as string[]).includes(value)
    ? (value as FeaturePriority)
    : undefined;
}

export async function updateFeature(
  projectId: string,
  featureId: string,
  prevState: FeatureFormState,
  formData: FormData
): Promise<FeatureFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const rawName = formData.get('name');
  if (typeof rawName === 'string' && rawName.trim().length === 0) {
    return {
      ...prevState,
      fieldErrors: { ...prevState.fieldErrors, name: 'required' },
    };
  }

  const moduleId = (formData.get('moduleId') as string) ?? '';
  if (!moduleId) {
    return {
      ...prevState,
      fieldErrors: { ...prevState.fieldErrors, moduleId: 'required' },
    };
  }

  const currentModuleId = (formData.get('currentModuleId') as string) ?? moduleId;

  const dto: UpdateFeatureDto = {
    name: typeof rawName === 'string' ? rawName.trim() : undefined,
    description:
      typeof formData.get('description') === 'string'
        ? (() => {
            const value = (formData.get('description') as string).trim();
            return value === '' ? null : value;
          })()
        : undefined,
    priority: coercePriority(formData.get('priority')),
    status: coerceStatus(formData.get('status')),
    moduleId,
  };

  try {
    await fetchUpdateFeature(session.token, featureId, dto);
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath(`/app/projects/${projectId}/modules/${moduleId}`);
    if (currentModuleId && currentModuleId !== moduleId) {
      revalidatePath(`/app/projects/${projectId}/modules/${currentModuleId}`);
    }
    revalidatePath(`/app/projects/${projectId}/features/${featureId}`);
    redirect(`/app/projects/${projectId}/features/${featureId}`);
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

export async function deleteFeature(
  projectId: string,
  featureId: string,
  moduleId: string
): Promise<void> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  try {
    await fetchDeleteFeature(session.token, featureId);
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${projectId}`);
    if (moduleId) {
      revalidatePath(`/app/projects/${projectId}/modules/${moduleId}`);
    }
    redirect(`/app/projects/${projectId}`);
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
