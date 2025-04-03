import { NextResponse } from "next/server";
import { logger } from "../logger";

// Healthcheck API
// eslint-disable-next-line
export async function GET(request: Request) {
  logger.logInfo("Ran healthcheck")
  return NextResponse.json({ message: "Ready!" }, { status: 200 });
}