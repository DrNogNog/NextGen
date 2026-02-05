import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

export async function POST(req: NextRequest) {
  const { locationId, partySize, source, phoneNumber } = await req.json();  // phoneNumber optional
  const partyId = uuidv4();
  const checkInTime = new Date();

  // Idempotency: Check if party with same details exists recently (e.g., last 5 min)
  const existing = await prisma.party.findFirst({
    where: {
      locationId,
      partySize,
      checkInTime: { gte: dayjs().subtract(5, 'minute').toDate() },
      source,
    },
  });
  if (existing) return NextResponse.json(existing);

  const party = await prisma.party.create({
    data: {
      id: partyId,
      locationId,
      partySize,
      checkInTime,
      source,
      status: 'waiting',
    },
  });

  // Log initial status
  await prisma.statusLog.create({
    data: { partyId, newStatus: 'waiting' },
  });

  // Trigger wait time estimation (call function below)
  await updateWaitEstimates(locationId);

  return NextResponse.json(party);
}