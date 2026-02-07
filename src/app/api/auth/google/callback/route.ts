import { NextRequest, NextResponse } from "next/server";
import { createToken, isAdminEmail, COOKIE_NAME } from "@/lib/auth";

// GET /api/auth/google/callback — handle Google OAuth callback
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("oauth_state")?.value;
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  // Verify state parameter to prevent CSRF
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${baseUrl}/manage/login?error=invalid_state`);
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: `${baseUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("[OAuth] Token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${baseUrl}/manage/login?error=token_failed`);
  }

  const tokens = await tokenRes.json();

  // Fetch user profile from Google
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    console.error("[OAuth] User info fetch failed");
    return NextResponse.redirect(`${baseUrl}/manage/login?error=profile_failed`);
  }

  const user = await userRes.json();

  // Verify email is verified and on the admin allowlist
  if (!user.email || !user.verified_email) {
    return NextResponse.redirect(`${baseUrl}/manage/login?error=unverified_email`);
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.redirect(`${baseUrl}/manage/login?error=unauthorized`);
  }

  // Create session JWT and set cookie
  const jwt = createToken(user.email);
  const response = NextResponse.redirect(`${baseUrl}/manage/dashboard`);

  response.cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  // Clean up OAuth state cookie
  response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}
