'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  fetchDeleteModule,
  fetchUpdateModule,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import type { UpdateModuleDto } from '@/lib/model-definitions/module';
import { RoutesEnum } from '@/lib/utils';

import type {
  ModuleFormState,
} from '../../new/actions';
import { handlePageError } from '@/lib/handle-page-error';

export async function updateModule(
  projectId: string,
  moduleId: string,
  prevState: ModuleFormState,
  formData: FormData
): Promise<ModuleFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const rawName = formData.get('name');
  if (typeof rawName === 'string' && rawName.trim().length === 0) {
    return {
      ...prevState,
      fieldErrors: { ...prevState.fieldErrors, name: 'required' },
    };
  }

  const rawParent = formData.get('parentModuleId');
  const parentModuleId =
    typeof rawParent === 'string' && rawParent.length > 0
      ? rawParent
      : null;

  if (parentModuleId && parentModuleId === moduleId) {
    return {
      ...prevState,
      fieldErrors: {
        ...prevState.fieldErrors,
        parentModuleId: 'invalid_parent',
      },
    };
  }

  const dto: UpdateModuleDto = {
    name: typeof rawName === 'string' ? rawName.trim() : undefined,
    description:
      typeof formData.get('description') === 'string'
        ? (() => {
            const value = (formData.get('description') as string).trim();
            return value === '' ? null : value;
          })()
        : undefined,
    parentModuleId,
    isRoot: parentModuleId === null ? true : false,
  };

  try {
    await fetchUpdateModule(session.token, moduleId, dto);
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath(`/app/projects/${projectId}/modules/${moduleId}`);
    redirect(`/app/projects/${projectId}/modules/${moduleId}`);
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
export async function deleteModule(projectId: string, moduleId: string) {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  try {
    await fetchDeleteModule(session.token, moduleId);
  } catch (error) {
    await handlePageError(error);
  }

  redirect(`/app/projects/${projectId}`);
}

async function safeReadJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
