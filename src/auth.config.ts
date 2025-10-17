import type { NextAuthConfig } from "next-auth";
import { RoutesEnum } from "@/lib/utils";
import {
  encryptWithCrypto,
  createSession,
  saveRefreshInfo,
} from "@/lib/session";
import { fetchLoginGoogle, fetchGetUserProfile } from "@/lib/data";

const secret = process.env.AUTH_GOOGLE_SECRET_WORD;

export const authConfig = {
  pages: {
    signIn: RoutesEnum.LOGIN,
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!!account && account.provider === "google") {
        const encryptedKey = encryptWithCrypto({
          token: secret,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
        try {
          const res = await fetchLoginGoogle({
            key: encryptedKey,
            //key: secret!,
            email: profile?.email ?? "",
            name: profile?.name ?? "",
          });
          if (typeof res === "object" && "accessToken" in res) {
            const { accessToken: token, accessTokenExpirationDate, role } = res;
            const user = await fetchGetUserProfile(token);
            await createSession({
              token,
              expiresAt: accessTokenExpirationDate,
              role,
            });
            await saveRefreshInfo({
              email: user.email,
              refreshToken: res.refreshToken,
              refreshTokenExpirationDate: res.refreshTokenExpirationDate,
            });
            //return !!profile?.email_verified;
            return true;
          } else {
            console.error("Invalid response structure from loginGoogle:", res);
            return false;
          }
        } catch (error) {
          console.error("signIn error:", error);
          return false;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      const allow = [
        /^http:\/\/localhost:3001(\/|$)/i, // dev root
      ];
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (allow.some((re) => re.test(url))) return url;
      return baseUrl;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
