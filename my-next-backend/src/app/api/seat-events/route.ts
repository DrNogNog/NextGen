import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const { partyId, tableId } = await req.json();
  const seatTime = new Date();

  // Validate table available, party waiting, etc. (add logic)

  const seatEvent = await prisma.seatEvent.create({
    data: { id: uuidv4(), partyId, tableId, seatTime },
  });

  // Update party status to seated
  await prisma.party.update({
    where: { id: partyId },
    data: { status: 'seated' },
  });

  await prisma.statusLog.create({
    data: { partyId, oldStatus: 'waiting', newStatus: 'seated' },
  });

  // Recalculate
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  await updateWaitEstimates(party!.locationId);

  return NextResponse.json(seatEvent);
}