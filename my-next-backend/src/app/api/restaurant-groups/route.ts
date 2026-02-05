import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const group = await prisma.restaurantGroup.create({
    data: { id: uuidv4(), name },
  });
  return NextResponse.json(group);
}

// Similarly implement GET, PUT, DELETE...