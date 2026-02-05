import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { partyId: string } }) {
  const { status } = await req.json();
  const { partyId } = params;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 });

  // Log transition
  await prisma.statusLog.create({
    data: { partyId, oldStatus: party.status, newStatus: status },
  });

  const updated = await prisma.party.update({
    where: { id: partyId },
    data: { status },
  });

  if (['cancelled', 'no_show'].includes(status)) {
    // Remove from queue logic implicitly by status filter
  }

  // Recalculate estimates
  await updateWaitEstimates(party.locationId);

  return NextResponse.json(updated);
}

export async function GET(req: NextRequest, { params }: { params: { partyId: string } }) {
  const { partyId } = params;
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { statusLogs: true },
  });
  if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Position in queue
  const waitlist = await prisma.party.findMany({
    where: { locationId: party.locationId, status: 'waiting', checkInTime: { lt: party.checkInTime } },
  });
  const position = waitlist.length + 1;

  // Bonus: If almost ready (e.g., position <= 2), log SMS stub
  if (position <= 2) {
    console.log(`SMS stub: Party ${partyId} is almost ready!`);
  }

  return NextResponse.json({
    estimatedWait: party.estimatedWaitMinutes,  // Assuming field
    position,
    status: party.status,
    updates: party.statusLogs,
  });
}