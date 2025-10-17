'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  fetchChangePassword,
  fetchUpdateCurrentUser,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import type { UpdateUserDto } from '@/lib/model-definitions/user';
import { RoutesEnum } from '@/lib/utils';
import { handlePageError } from '@/lib/handle-page-error';

export type ProfileFormState = {
  fieldErrors?: {
    name?: string;
    email?: string;
  };
  message?: string;
  success?: boolean;
};

export type PasswordFormState = {
  fieldErrors?: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  message?: string;
  success?: boolean;
};

export async function updateProfileAction(
  prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const rawName = (formData.get('name') ?? '').toString().trim();
  const rawEmail = (formData.get('email') ?? '').toString().trim();

  const fieldErrors: ProfileFormState['fieldErrors'] = {};
  if (!rawName) {
    fieldErrors.name = 'required';
  }

  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    fieldErrors.email = 'invalid';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      fieldErrors,
      message: 'validation',
    };
  }

  const dto: UpdateUserDto = {
    name: rawName,
  };
  if (rawEmail) {
    dto.email = rawEmail;
  }

  try {
    await fetchUpdateCurrentUser(session.token, dto);
  } catch (error) {
    await handlePageError(error);
    if (error instanceof Response) {
      if (error.status === 400) {
        return {
          success: false,
          message: 'validation',
          fieldErrors,
        };
      }
    }
    return {
      success: false,
      message: 'serverError',
      fieldErrors,
    };
  }

  revalidatePath('/app/settings/profile');
  revalidatePath('/app');

  return {
    success: true,
    message: 'profileUpdated',
    fieldErrors: {},
  };
}

export async function updatePasswordAction(
  prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const currentPassword = (formData.get('currentPassword') ?? '').toString();
  const newPassword = (formData.get('newPassword') ?? '').toString();
  const confirmPassword = (formData.get('confirmPassword') ?? '').toString();

  const fieldErrors: PasswordFormState['fieldErrors'] = {};

  if (!currentPassword) {
    fieldErrors.currentPassword = 'required';
  }

  if (!newPassword || newPassword.length < 8) {
    fieldErrors.newPassword = 'minLength';
  }

  if (newPassword !== confirmPassword) {
    fieldErrors.confirmPassword = 'mismatch';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: 'validation',
      fieldErrors,
    };
  }

  try {
    await fetchChangePassword({
      token: session.token,
      currentPassword,
      newPassword,
    });
  } catch (error) {
    await handlePageError(error);
    if (error instanceof Response) {
      if (error.status === 400) {
        return {
          success: false,
          message: 'invalidPassword',
        };
      }
      if (error.status === 401) {
        return {
          success: false,
          message: 'invalidCurrentPassword',
          fieldErrors: {
            currentPassword: 'invalid',
          },
        };
      }
    }

    return {
      success: false,
      message: 'serverError',
    };
  }

  return {
    success: true,
    message: 'passwordUpdated',
    fieldErrors: {},
  };
}
