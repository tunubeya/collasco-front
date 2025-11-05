import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { z } from "zod";
import GoogleProvider from "next-auth/providers/google";
import { fetchLogin, fetchGetUserProfile } from "@/lib/data";
import { createSession, saveRefreshInfo } from "@/lib/session";
import NextAuth, { AuthError, CredentialsSignin } from "next-auth";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          const parsedCredentials = z
            .object({
              email: z.string().email().optional(),
              password: z.string().min(6).optional(),
              isRestoring: z.string().optional(),
            })
            .safeParse(credentials);
          if (parsedCredentials.success) {
            const { email, password, isRestoring } = parsedCredentials.data;
            if (!isRestoring && email && password) {
              const res = await fetchLogin(email, password);
              const {
                accessToken: token,
                refreshToken,
                accessTokenExpirationDate,
                refreshTokenExpirationDate,
              } = res;
              const user = await fetchGetUserProfile(token);
              const role = res.user?.role ?? user.role;
              await createSession({
                token,
                expiresAt: accessTokenExpirationDate,
                role,
              });
              await saveRefreshInfo({
                email: user.email,
                refreshToken,
                refreshTokenExpirationDate,
              });
              return user;
            } else {
              return isRestoring ? {} : null;
            }
          } else {
            throw new CredentialsSignin(
              JSON.stringify(parsedCredentials.error.flatten().fieldErrors)
            );
          }
        } catch (error) {
          console.error("error sign in credentials > ", error);
          if (error instanceof Response) {
            const statusCode = error.status;
            const errorBody = await error.json();
            if (statusCode === 401 && errorBody.message === "Invalid email") {
              throw new CredentialsSignin(errorBody.message);
            } else throw new AuthError();
          }
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
});
