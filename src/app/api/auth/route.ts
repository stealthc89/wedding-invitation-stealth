import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

// DELETE /api/auth — logout (clear session cookie)
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
