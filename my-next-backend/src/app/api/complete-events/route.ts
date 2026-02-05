import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const { partyId, tableId } = await req.json();
  const completeTime = new Date();

  const completeEvent = await prisma.completeEvent.create({
    data: { id: uuidv4(), partyId, tableId, completeTime },
  });

  // Update party status? (e.g., to 'completed' if adding that status)

  // Recalculate
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  await updateWaitEstimates(party!.locationId);

  return NextResponse.json(completeEvent);
}