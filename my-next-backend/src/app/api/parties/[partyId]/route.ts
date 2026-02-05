import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { partyId: string } }) {
  const { partyId } = params;
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      seatEvents: true,
      completeEvents: true,
      statusLogs: true,
    },
  });

  if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const actualWait = party.seatEvents[0] ? dayjs(party.seatEvents[0].seatTime).diff(party.checkInTime, 'minute') : null;
  const estimatedVsActual = actualWait !== null ? actualWait - (party.estimatedWaitMinutes || 0) : null;

  return NextResponse.json({
    ...party,
    actualWait,
    estimatedVsActual,
    auditTimeline: party.statusLogs,
  });
}