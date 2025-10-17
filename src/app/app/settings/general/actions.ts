'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  fetchConnectGithubToken,
  fetchDeleteGithubToken,
  fetchUpdateCurrentUser,
} from '@/lib/data';
import { getSession } from '@/lib/session';
import { RoutesEnum } from '@/lib/utils';
import { handlePageError } from '@/lib/handle-page-error';

export type GeneralFormState = {
  message?: string;
  success?: boolean;
};

export type GithubTokenFormState = {
  fieldErrors?: {
    githubToken?: string;
  };
  message?: 'validation' | 'saved' | 'error';
  success?: boolean;
};

export async function updateGeneralPreferencesAction(
  prevState: GeneralFormState,
  formData: FormData
): Promise<GeneralFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const rawDarkMode = formData.get('darkMode');
  const darkMode =
    rawDarkMode === 'on' ||
    rawDarkMode === 'true' ||
    rawDarkMode === '1';

  try {
    await fetchUpdateCurrentUser(session.token, {
      preferences: { darkMode },
    });
  }  catch (error) {
  await handlePageError(error);
}

  revalidatePath('/app/settings/general');
  revalidatePath('/app');

  return {
    success: true,
    message: 'preferencesSaved',
  };
}

export async function upsertGithubTokenAction(
  prevState: GithubTokenFormState,
  formData: FormData
): Promise<GithubTokenFormState> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  const rawToken = (formData.get('githubToken') ?? '').toString().trim();
  if (!rawToken) {
    return {
      success: false,
      message: 'validation',
      fieldErrors: { githubToken: 'required' },
    };
  }

  try {
    await fetchConnectGithubToken(session.token, rawToken);
  }  catch (error) {
  await handlePageError(error);
}

  revalidatePath('/app/settings/general');
  revalidatePath('/app');

  return {
    success: true,
    message: 'saved',
    fieldErrors: {},
  };
}

export async function deleteGithubTokenAction(): Promise<{
  success: boolean;
  message: 'removed' | 'error';
}> {
  const session = await getSession();
  if (!session?.token) redirect(RoutesEnum.LOGIN);

  try {
    await fetchDeleteGithubToken(session.token);
  }  catch (error) {
  await handlePageError(error);
}

  revalidatePath('/app/settings/general');
  revalidatePath('/app');

  return { success: true, message: 'removed' };
}
