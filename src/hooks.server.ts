import { redirect, type Handle } from "@sveltejs/kit";
import { SECRET_KEY } from "$env/static/private";
import crypto from "crypto";

interface SessionData {
  email: string;
  name: string;
  picture: string;
  exp: number;
}

function verifySession(signedSession: string): SessionData | null {
  try {
    const parts = signedSession.split(".");
    if (parts.length !== 2) return null;

    const [data, signature] = parts;

    const hmac = crypto.createHmac("sha256", SECRET_KEY);
    hmac.update(data);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return null;
    }

    const sessionData: SessionData = JSON.parse(
      Buffer.from(data, "base64").toString("utf-8")
    );

    if (Date.now() > sessionData.exp) {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

const publicPaths = ["/auth/google", "/auth/google/callback"];

export const handle: Handle = async ({ event, resolve }) => {
  const { cookies, url } = event;

  const isPublicPath = publicPaths.some((path) => url.pathname.startsWith(path));

  const sessionCookie = cookies.get("session");

  if (sessionCookie) {
    const session = verifySession(sessionCookie);
    if (session) {
      event.locals.user = {
        email: session.email,
        name: session.name,
        picture: session.picture
      };
    }
  }

  if (!event.locals.user && !isPublicPath) {
    throw redirect(302, "/auth/google");
  }

  return resolve(event);
};
