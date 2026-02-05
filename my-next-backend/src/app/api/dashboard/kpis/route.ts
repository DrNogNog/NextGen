import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');
  const timeWindow = searchParams.get('timeWindow') || '24h';  // '24h' or '7d'

  const start = timeWindow === '7d' ? dayjs().subtract(7, 'day').toDate() : dayjs().subtract(1, 'day').toDate();

  // Example: Average quoted wait
  const parties = await prisma.party.findMany({
    where: { locationId, checkInTime: { gte: start } },
  });
  const avgQuoted = parties.reduce((sum, p) => sum + (p.estimatedWaitMinutes || 0), 0) / parties.length || 0;

  // Actual wait: For seated, seatTime - checkInTime
  const seated = await prisma.party.findMany({
    where: { locationId, status: 'seated', checkInTime: { gte: start } },
    include: { seatEvents: true },
  });
  const avgActual = seated.reduce((sum, p) => sum + dayjs(p.seatEvents[0]?.seatTime).diff(p.checkInTime, 'minute'), 0) / seated.length || 0;

  // Delta: avgActual - avgQuoted
  const delta = avgActual - avgQuoted;

  // Utilization: (seated time / total time) %, etc.
  // Implement similarly for other KPIs: no-show rate = count(no_show) / total

  // Table views
  const activeWaitlist = await prisma.party.findMany({ where: { locationId, status: 'waiting' } });
  // Similarly for seated, completed

  return NextResponse.json({
    avgQuoted,
    avgActual,
    delta,
    // utilization,
    // noShowRate,
    activeWaitlist,
    // etc.
  });
}