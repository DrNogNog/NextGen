import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// POST example
export async function POST(req: NextRequest) {
  const { locationId, capacity, section, isActive } = await req.json();
  const table = await prisma.table.create({
    data: { id: uuidv4(), locationId, capacity, section, isActive: isActive ?? true },
  });
  return NextResponse.json(table);
}

// GET active tables for a location
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 });

  const tables = await prisma.table.findMany({
    where: { locationId, isActive: true },
  });
  return NextResponse.json(tables);
}