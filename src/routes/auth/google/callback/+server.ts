import { redirect, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  ALLOWED_EMAIL,
  SECRET_KEY
} from "$env/static/private";
import crypto from "crypto";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
}

function signSession(data: string): string {
  const hmac = crypto.createHmac("sha256", SECRET_KEY);
  hmac.update(data);
  return `${data}.${hmac.digest("hex")}`;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies.get("oauth_state");

  cookies.delete("oauth_state", { path: "/" });

  if (!state || state !== storedState) {
    throw error(400, "Invalid OAuth state");
  }

  if (!code) {
    throw error(400, "No authorization code provided");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URI
    })
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error("Token exchange failed:", err);
    throw error(400, "Failed to exchange authorization code");
  }

  const tokens: GoogleTokenResponse = await tokenResponse.json();

  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });

  if (!userResponse.ok) {
    throw error(400, "Failed to get user info");
  }

  const user: GoogleUserInfo = await userResponse.json();

  if (user.email !== ALLOWED_EMAIL) {
    console.warn(`Unauthorized login attempt: ${user.email}`);
    throw error(403, "Access denied. Only authorized users can access this application.");
  }

  const sessionData = JSON.stringify({
    email: user.email,
    name: user.name,
    picture: user.picture,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  });

  const signedSession = signSession(Buffer.from(sessionData).toString("base64"));

  cookies.set("session", signedSession, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7
  });

  throw redirect(302, "/");
};
