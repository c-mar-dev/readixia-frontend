import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from "$env/static/private";
import crypto from "crypto";

export const GET: RequestHandler = async ({ cookies }) => {
  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");
  
  // Store state in cookie for verification
  cookies.set("oauth_state", state, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10 // 10 minutes
  });

  // Build Google OAuth URL
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent"
  });

  throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};
