import prisma from '@/lib/prisma';
import dayjs from 'dayjs';

export async function updateWaitEstimates(locationId: string) {
  // Get active waitlist (waiting parties, sorted by checkInTime)
  const waitlist = await prisma.party.findMany({
    where: { locationId, status: 'waiting' },
    orderBy: { checkInTime: 'asc' },
  });

  // Get active tables
  const tables = await prisma.table.findMany({
    where: { locationId, isActive: true },
  });

  // Get seated parties (to estimate when tables free up)
  const seated = await prisma.party.findMany({
    where: { locationId, status: 'seated' },
    include: { seatEvents: true },
  });

  // Historical average service time (e.g., rolling 7 days, per party size)
  const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();
  const completed = await prisma.completeEvent.findMany({
    where: { completeTime: { gte: sevenDaysAgo } },
    include: { party: true },
  });
  const avgServiceBySize: Record<number, number> = {};
  for (const c of completed) {
    const size = c.party.partySize;
    const seat = await prisma.seatEvent.findFirst({ where: { partyId: c.partyId } });
    if (seat) {
      const duration = dayjs(c.completeTime).diff(seat.seatTime, 'minute');
      avgServiceBySize[size] = (avgServiceBySize[size] || 0) + duration / (completed.filter(p => p.party.partySize === size).length || 1);
    }
  }

  // Simple estimation logic (deterministic)
  // For each waiting party, simulate assignment to next available table(s)
  // Assume FIFO queue, match partySize <= table.capacity (or combine tables if needed, but simplify to single table match)
  let currentTime = dayjs();
  const occupiedTables = new Set(seated.map(s => s.seatEvents[0]?.tableId).filter(Boolean));
  let availableTables = tables.filter(t => !occupiedTables.has(t.id));

  for (const party of waitlist) {
    // Find matching table (largest available <= party.size? Wait, capacity >= partySize)
    const matching = availableTables.find(t => t.capacity >= party.partySize);
    let estimatedWait = 0;

    if (!matching) {
      // Wait for next turnover
      // Estimate based on seated parties' expected completion
      const nextFree = seated
        .map(s => {
          const avg = avgServiceBySize[s.partySize] || 45;  // Default 45 min
          const expectedComplete = dayjs(s.seatEvents[0].seatTime).add(avg, 'minute');
          return { tableId: s.seatEvents[0].tableId, expected: expectedComplete };
        })
        .sort((a, b) => a.expected.diff(b.expected))
        .find(t => {
          const table = tables.find(tb => tb.id === t.tableId);
          return table?.capacity >= party.partySize;
        });

      if (nextFree) {
        estimatedWait = nextFree.expected.diff(currentTime, 'minute');
        // Update available after this time, but for simplicity, accumulate
      }
    }

    // Monotonic: Ensure not decreasing from previous estimate (store previous in DB? For now, skip)
    // Confidence: e.g., estimatedWait ± 10
    const confidenceRange = `${estimatedWait - 5}–${estimatedWait + 5} min`;

    // Update party with estimate (add fields to Party model if needed: estimatedWaitMinutes, estimateUpdatedAt, confidenceRange)
    await prisma.party.update({
      where: { id: party.id },
      data: {
        // Assuming you add these fields to schema
        // estimatedWaitMinutes: estimatedWait,
        // estimateUpdatedAt: new Date(),
        // confidenceRange,
      },
    });
  }
}