import { NextResponse } from "next/server";

// Healthcheck API
// eslint-disable-next-line
export async function GET(request: Request) {
  return NextResponse.json({ message: "Ready!" }, { status: 200 });
}