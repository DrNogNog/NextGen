import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
// POST example
export async function POST(req: NextRequest) {
  const { name, restaurantGroupId } = await req.json();
  const location = await prisma.location.create({
    data: { id: uuidv4(), name, restaurantGroupId },
  });
  return NextResponse.json(location);
}