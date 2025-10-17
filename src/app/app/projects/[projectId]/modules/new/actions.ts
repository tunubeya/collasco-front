'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  fetchCreateModule,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import type { CreateModuleDto } from '@/lib/model-definitions/module';
import { RoutesEnum } from '@/lib/utils';

export type ModuleFormState = {
  fieldErrors?: Partial<Record<'name' | 'parentModuleId', string>>;
  message?: string;
};

export async function createModule(
  projectId: string,
  prevState: ModuleFormState,
  formData: FormData
): Promise<ModuleFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
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

  const dto: CreateModuleDto = {
    name,
    description: ((formData.get('description') ?? '') as string).trim() || null,
    parentModuleId,
    isRoot: parentModuleId === null,
  };

  try {
    const created = await fetchCreateModule(session.token, projectId, dto);
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath(`/app/projects/${projectId}/modules/${created.id}`);
    redirect(`/app/projects/${projectId}/modules/${created.id}`);
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
