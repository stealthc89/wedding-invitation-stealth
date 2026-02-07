import { NextResponse } from "next/server";
import { getSession, ensureAdminExists } from "@/lib/auth";

export async function GET() {
  ensureAdminExists();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email: session.email });
}
