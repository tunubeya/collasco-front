'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  FeaturePriority,
  FeatureStatus,
} from '@/lib/definitions';
import {
  fetchCreateFeature,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import type { CreateFeatureDto } from '@/lib/model-definitions/feature';
import { RoutesEnum } from '@/lib/utils';

export type FeatureFormState = {
  fieldErrors?: Partial<Record<'name' | 'moduleId', string>>;
  message?: string;
};

function coerceStatus(value: FormDataEntryValue | null): FeatureStatus {
  if (typeof value !== 'string') return FeatureStatus.DONE;
  return (Object.values(FeatureStatus) as string[]).includes(value)
    ? (value as FeatureStatus)
    : FeatureStatus.DONE;
}

function coercePriority(value: FormDataEntryValue | null): FeaturePriority | null {
  if (typeof value !== 'string' || value === '') return null;
  return (Object.values(FeaturePriority) as string[]).includes(value)
    ? (value as FeaturePriority)
    : null;
}

export async function createFeature(
  projectId: string,
  prevState: FeatureFormState,
  formData: FormData
): Promise<FeatureFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
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

  const priority = coercePriority(formData.get('priority'));
  const status = coerceStatus(formData.get('status'));

  const dto: CreateFeatureDto = {
    name,
    description: ((formData.get('description') ?? '') as string).trim() || null,
    status,
    ...(priority !== null ? { priority } : {}),
  };

  try {
    const created = await fetchCreateFeature(session.token, moduleId, dto);
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath(`/app/projects/${projectId}/modules/${moduleId}`);
    revalidatePath(`/app/projects/${projectId}/features/${created.id}`);
    redirect(`/app/projects/${projectId}/features/${created.id}`);
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

async function safeReadJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
