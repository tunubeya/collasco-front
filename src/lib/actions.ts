'use server';
import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import {
  SignupFormSchema,
  LoginFormSchema,
  ResetPassFormSchema,
  ChangePassFormSchema} from '@/lib/validation-schemas';
import {
  FormState,
  SignUpErrorState,
  ResetPassErrorState,
  ChangePassErrorState,
} from '@/lib/definitions';
import {
  fetchSignup,
  fetchLogout,
  fetchForgotPassword,
  fetchResetPassword,
  fetchChangePassword,
  fetchRefreshToken,
  fetchDeleteUser,
}from '@/lib/data';
import {
  getSession,
  updateSession,
  deleteSession,
  updateRefreshInfo,
  getRefreshInfo
} from '@/lib/session';
import { RoutesEnum } from '@/lib/utils';

const texts = {
  invalidCredentials: 'Correo o Contraseña incorrectos.',
  somethingWentWrong: 'Algo salió mal. Inténtalo más tarde.',
  emailAlreadyExists: 'El correo ya está registrado.',
  invalidEmail: 'Este correo no esta registrado.',
  wrongCurrentPassword: 'La contraseña actual es incorrecta.'
};

export async function authenticate(
  prevState: { success: boolean; error: string } | undefined,
  formData: FormData
) {
  try {
    const validatedFields = (await LoginFormSchema()).safeParse({
      email: formData.get('email'),
      password: formData.get('password')
    });
    if (!validatedFields.success) {
      return {
        success: false,
        error: ''
      };
    }
    await signIn('credentials', {
      redirect: false,
      ...Object.fromEntries(formData)
    });
    return { success: true, error: '' };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.message === 'Invalid email') {
        return { success: false, error: texts.invalidEmail };
      }
      return { success: false, error: texts.invalidCredentials };
    }
    return { success: false, error: texts.somethingWentWrong };
  }
}
export async function signup(
  state: FormState<SignUpErrorState>,
  formData: FormData
) {
  const validatedFields = (await SignupFormSchema()).safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword')
  });
  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors
    };
  }
  try {
    const { email, password } = validatedFields.data;
    await fetchSignup(email, password);
    formData.delete('confirmPassword');
    await signIn('credentials', {
      redirect: false,
      ...Object.fromEntries(formData)
    });
    return { success: true, errors: {} };
  } catch (error) {
    if (error instanceof Response) {
      const statusCode = error.status;
      const errorBody = await error.json();
      if (statusCode === 400) {
        return {
          success: false,
          errors: {
            email:
              typeof errorBody.message === 'string' &&
                errorBody.message === 'User already exists'
                ? [texts.emailAlreadyExists]
                : ['']
          }
        };
      } else return { success: false, errors: {} };
    }
    return { success: false, errors: {} };
  }
}
export async function recoverPassword(
  state: FormState<SignUpErrorState>,
  formData: FormData
) {
  try {
    const email = formData.get('email') as string;
    await fetchForgotPassword(email);
    return { success: true, error: '' };
  } catch (error) {
    if (error instanceof Response) {
      const statusCode = error.status;
      const errorBody = await error.json();
      if (statusCode === 404 && errorBody.message === 'User not found') {
        return { success: false, error: texts.invalidEmail };
      }
    }
    return { success: false, error: texts.somethingWentWrong };
  }
}
export async function resetPassword(
  state: FormState<ResetPassErrorState>,
  formData: FormData
) {
  try {
    const validatedFields = (await ResetPassFormSchema()).safeParse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword')
    });
    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors
      };
    }
    const { password } = validatedFields.data;
    const token = formData.get('token') as string;
    await fetchResetPassword({ token, password });
    return { success: true };
  } catch (error) {
    if (error instanceof Response) {
      const statusCode = error.status;
      const errorBody = await error.json();
      console.error(statusCode, errorBody);
    }
    return { success: false };
  }
}
export async function changePassword(
  state: FormState<ChangePassErrorState>,
  formData: FormData
) {
  const validatedFields = (await ChangePassFormSchema()).safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword')
  });
  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors
    };
  }
  try {
    const { currentPassword, newPassword } = validatedFields.data;
    const session = await getSession();
    if (!session?.token) return { success: false };
    const token = session?.token;
    await fetchChangePassword({ token, currentPassword, newPassword });
    return { success: true };
  } catch (error) {
    if (error instanceof Response) {
      const statusCode = error.status;
      const errorBody = await error.json();
      if (
        statusCode === 401 &&
        errorBody.message === 'Current password is incorrect'
      ) {
        return {
          success: false,
          errors: {
            currentPassword: [texts.wrongCurrentPassword]
          }
        };
      } else return { success: false };
    }
    return { success: false };
  }
}
export async function logout() {
  await deleteSession();
  await signOut({
    redirectTo: RoutesEnum.HOME_LANDING
  });
  try {
    const session = await getSession();
    if (!session?.token) return;
    const token = session?.token;
    await fetchLogout(token);
  } catch (error) {
    console.error('Error during logout:', error);
  }
}
export async function logoutClient() {
  await deleteSession();
  await signOut();
  try {
    const session = await getSession();
    if (!session?.token) return;
    const token = session?.token;
    await fetchLogout(token);
  } catch (error) {
    console.error('Error during logout:', error);
  }
}
export async function refreshTokenAfterConfirmation() {
  try {
    const refreshInfo = await getRefreshInfo();

    if (!refreshInfo?.email || !refreshInfo?.refreshToken) {
      return { success: false, error: 'No session or refresh token found' };
    }
    const response = await fetchRefreshToken(
      refreshInfo.refreshToken,
      refreshInfo.email
    );
    if (!response) {
      return { success: false, error: 'Failed to refresh token' };
    }

    // Update session with new token
    await updateSession({
      token: response.accessToken
    });

    // Update refresh token info
    await updateRefreshInfo({
      refreshToken: response.refreshToken,
      refreshTokenExpirationDate: response.refreshTokenExpirationDate
    });

    return { success: true };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { success: false, error: 'Failed to refresh token' };
  }
}
export async function deleteUserById(
  userId: string
): Promise<{ success: boolean }> {
  try {
    const session = await getSession();
    if (!session?.token) return { success: false };

    await fetchDeleteUser({
      token: session.token,
      userId
    });

    return { success: true };
  } catch {
    return { success: false };
  }
}
