import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
  const originHeader = origin === allowedOrigin ? allowedOrigin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": originHeader,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json",
  };
};

export async function OPTIONS(req: NextRequest) {
  const { origin } = Object.fromEntries(req.headers);
  const headers = getCorsHeaders(origin as string | null);
  return new Response(null, { status: 204, headers });
}

export async function GET(req: NextRequest) {
  console.log("GET /api/internal/overview hit - url:", req.url);
  const { origin } = Object.fromEntries(req.headers);
  const headers = getCorsHeaders(origin as string | null);

  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId") || null;

    // Smoke test
    if (process.env.NODE_ENV !== "production" && searchParams.get("__smoke") === "1") {
      return new Response(JSON.stringify({ ok: true, locationId }), { status: 200, headers });
    }

    const locations = await prisma.location.findMany({
      where: locationId ? { id: locationId } : {},
    });

    const tables = await prisma.table.findMany({
      where: locationId ? { locationId } : {},
    });

    const parties = await prisma.party.findMany({
      where: locationId ? { locationId } : {},
      include: { seatEvents: true, completeEvents: true, statusLogs: true },
    });

    const seatEvents = parties.flatMap((p: any) => p.seatEvents ?? []);
    const completeEvents = parties.flatMap((p: any) => p.completeEvents ?? []);

    return new Response(
      JSON.stringify({ locations, tables, parties, seatEvents, completeEvents }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("overview route error:", err);
    return new Response(JSON.stringify({ error: "internal server error" }), {
      status: 500,
      headers,
    });
  }
}