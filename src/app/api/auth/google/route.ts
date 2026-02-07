import { NextResponse } from "next/server";
import { generateOAuthState, getGoogleAuthUrl } from "@/lib/auth";

// GET /api/auth/google — redirect to Google OAuth consent screen
export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID." },
      { status: 500 }
    );
  }

  const state = generateOAuthState();
  const url = getGoogleAuthUrl(state);

  const response = NextResponse.redirect(url);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
