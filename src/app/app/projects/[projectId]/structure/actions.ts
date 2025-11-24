'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { fetchMoveFeatureOrder, fetchMoveModuleOrder } from '@/lib/data';
import type { MoveDirection } from '@/lib/definitions';
import { getSession } from '@/lib/session';
import { RoutesEnum } from '@/lib/utils';

type MoveFeatureOrderInput = {
  projectId: string;
  moduleId: string;
  featureId: string;
  direction: MoveDirection;
};

type MoveModuleOrderInput = {
  projectId: string;
  moduleId: string;
  parentModuleId: string | null;
  direction: MoveDirection;
};

type MoveActionResult = {
  success: boolean;
  message?: string;
};

const GENERIC_ERROR = 'order_error';

export async function moveFeatureOrderAction(
  input: MoveFeatureOrderInput
): Promise<MoveActionResult> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  try {
    await fetchMoveFeatureOrder(session.token, input.featureId, {
      direction: input.direction,
    });
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${input.projectId}`);
    revalidatePath(`/app/projects/${input.projectId}/modules/${input.moduleId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 400) {
        const body = await safeReadJson(error);
        return {
          success: false,
          message: body?.message ?? GENERIC_ERROR,
        };
      }
      if (error.status === 403) {
        redirect(RoutesEnum.ERROR_UNAUTHORIZED);
      }
    }
    throw error;
  }
}

export async function moveModuleOrderAction(
  input: MoveModuleOrderInput
): Promise<MoveActionResult> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  try {
    await fetchMoveModuleOrder(session.token, input.moduleId, {
      direction: input.direction,
    });
    revalidatePath(RoutesEnum.APP_PROJECTS);
    revalidatePath(`/app/projects/${input.projectId}`);
    revalidatePath(`/app/projects/${input.projectId}/modules/${input.moduleId}`);
    if (input.parentModuleId) {
      revalidatePath(`/app/projects/${input.projectId}/modules/${input.parentModuleId}`);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 400) {
        const body = await safeReadJson(error);
        return {
          success: false,
          message: body?.message ?? GENERIC_ERROR,
        };
      }
      if (error.status === 403) {
        redirect(RoutesEnum.ERROR_UNAUTHORIZED);
      }
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
