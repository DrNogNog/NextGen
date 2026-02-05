"use client"
import { useState, useEffect } from 'react';
import {
  BuildingOffice2Icon,
  MapPinIcon,
  TableCellsIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

type RestaurantGroup = {
  id: string;
  name: string;
};

type Location = {
  id: string;
  groupId: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
};

type Table = {
  id: string;
  locationId: string;
  tableId: string;
  capacity: number;
  section?: string;
  isActive: boolean;
};

type Party = {
  id: string;
  name: string;
  partySize: number;
  phone?: string;
  status: 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no_show';
  checkInTime: string;
};

type SeatEvent = {
  seatEventId: string;
  partyId: string;
  tableId: string;
  seatTime: string; // ISO
};

type CompleteEvent = {
  completeEventId: string;
  partyId: string;
  tableId: string;
  completeTime: string; // ISO
};

type ActiveSeating = {
  party: Party;
  table: Table;
  seatEvent: SeatEvent;
  completeEvent?: CompleteEvent;
};

export default function InternalPage() {
  const [group] = useState<RestaurantGroup>({ id: 'grp_urb23', name: 'Urban Bites Collective' });
  const [locations, setLocations] = useState<Location[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [seatEvents, setSeatEvents] = useState<SeatEvent[]>([]);
  const [completeEvents, setCompleteEvents] = useState<CompleteEvent[]>([]);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>('loc_downtown');
  const [viewMode, setViewMode] = useState<'config' | 'seating'>('seating');

  useEffect(() => {
  const controller = new AbortController();
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const q = selectedLocationId ? `?locationId=${encodeURIComponent(selectedLocationId)}` : '';

  (async () => {
    try {
      // smoke test to verify backend reachable
      const smokeRes = await fetch(`${BACKEND}/api/internal/overview?__smoke=1`, { signal: controller.signal });
      if (!smokeRes.ok) throw new Error('backend unreachable');

      const res = await fetch(`${BACKEND}/api/internal/overview${q}`, {
        signal: controller.signal,
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Fetch error ${res.status}`);
      const data = await res.json();

      setLocations(data.locations ?? []);
      setTables(data.tables ?? []);
      setParties(data.parties ?? []);
      setSeatEvents(data.seatEvents ?? []);
      setCompleteEvents(data.completeEvents ?? []);
    } catch (err) {
      if ((err as any).name !== 'AbortError') {
        console.error('overview fetch error:', err);
      }
    }
  })();

  return () => controller.abort();
}, [group.id, selectedLocationId]);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const locationTables = tables.filter((t) => t.locationId === selectedLocationId && t.isActive);

  const activeSeatings = seatEvents
  .map((se) => {
    const party = parties.find((p) => p.id === se.partyId);
    const table = tables.find((t) => t.id === se.tableId);
    const complete = completeEvents.find((ce) => ce.partyId === se.partyId);
    if (party && table) {
      return { party, table, seatEvent: se, completeEvent: complete };
    }
    return null;
  })
  .filter((s): s is { 
    party: Party; 
    table: Table; 
    seatEvent: SeatEvent; 
    completeEvent: CompleteEvent | undefined 
  } => !!s);

  const calculateTurnTime = (seat: ActiveSeating) => {
    if (!seat.completeEvent) return null;
    const start = new Date(seat.seatEvent.seatTime).getTime();
    const end = new Date(seat.completeEvent.completeTime).getTime();
    return Math.round((end - start) / (1000 * 60));
  };

  const avgDurationBySize = () => {
    const completed = activeSeatings.filter((s) => s.completeEvent);
    const groups: Record<number, { count: number; totalMin: number }> = {};
    completed.forEach((s) => {
      const dur = calculateTurnTime(s);
      if (dur) {
        const size = s.party.partySize;
        if (!groups[size]) groups[size] = { count: 0, totalMin: 0 };
        groups[size].count++;
        groups[size].totalMin += dur;
      }
    });
    return Object.entries(groups).map(([size, { count, totalMin }]) => ({
      size: Number(size),
      avgMinutes: count > 0 ? Math.round(totalMin / count) : 0,
    }));
  };

  const velocityBySection = () => {
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const recentCompletes = completeEvents.filter((ce) => {
      const t = new Date(ce.completeTime).getTime();
      return t >= twoHoursAgo && t <= now;
    });

    const sectionTurns: Record<string, number> = {};
    recentCompletes.forEach((ce) => {
      const table = tables.find((t) => t.id === ce.tableId);
      if (table?.section) {
        sectionTurns[table.section] = (sectionTurns[table.section] || 0) + 1;
      }
    });

    return Object.entries(sectionTurns).map(([section, turns]) => ({
      section,
      turnsLast2h: turns,
      velocity: (turns / 2).toFixed(1),
    }));
  };

  const handleSeatParty = (partyId: string, tableId: string) => {
    const seatEvent: SeatEvent = {
      seatEventId: `se_${Date.now()}`,
      partyId,
      tableId,
      seatTime: new Date().toISOString(),
    };
    setSeatEvents((prev) => [...prev, seatEvent]);
  };

  const handleCompleteParty = (partyId: string, tableId: string) => {
    const completeEvent: CompleteEvent = {
      completeEventId: `ce_${Date.now()}`,
      partyId,
      tableId,
      completeTime: new Date().toISOString(),
    };
    setCompleteEvents((prev) => [...prev, completeEvent]);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BuildingOffice2Icon className="h-8 w-8 text-indigo-600" />
              {group.name} – Internal
            </h1>
            <p className="mt-2 text-gray-600">Configuration & Real-time Service Tracking</p>
          </div>

          <div className="flex gap-3 bg-white rounded-lg shadow-sm p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('config')}
              className={`px-5 py-2 rounded-md font-medium transition ${
                viewMode === 'config' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setViewMode('seating')}
              className={`px-5 py-2 rounded-md font-medium transition ${
                viewMode === 'seating' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Seating & Turns
            </button>
          </div>
        </div>

        {viewMode === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Locations sidebar */}
            <div className="lg:col-span-1 bg-white shadow rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-indigo-600" />
                  Locations
                </h2>
                <button className="p-1.5 rounded-full hover:bg-indigo-50 text-indigo-600">
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`w-full px-5 py-4 text-left transition-colors ${
                      selectedLocationId === loc.id
                        ? 'bg-indigo-50 border-l-4 border-indigo-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{loc.name}</div>
                    <div className="text-sm text-gray-500">{loc.city}</div>
                    {!loc.isActive && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800">
                        Inactive
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tables view */}
            <div className="lg:col-span-3">
              {!selectedLocationId ? (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                  <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Select a location</h3>
                  <p className="mt-2 text-gray-500">Choose a restaurant to view or edit its tables</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-3">
                        <TableCellsIcon className="h-6 w-6 text-indigo-600" />
                        {selectedLocation?.name} Tables
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {locationTables.length} tables • {locationTables.filter((t) => t.isActive).length} active
                      </p>
                    </div>

                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      <PlusIcon className="h-5 w-5" />
                      Add Table
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Table ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Capacity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Section
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {locationTables.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                              No tables added yet
                            </td>
                          </tr>
                        ) : (
                          locationTables.map((table) => (
                            <tr key={table.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap font-medium">{table.tableId}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{table.capacity} pax</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {table.section || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {table.isActive ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircleIcon className="h-4 w-4" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircleIcon className="h-4 w-4" />
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                                  <PencilIcon className="h-5 w-5 inline" />
                                </button>
                                <button className="text-red-600 hover:text-red-900">
                                  <TrashIcon className="h-5 w-5 inline" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'seating' && (
          <div className="space-y-8">
            {!selectedLocationId ? (
              <div className="bg-white rounded-xl shadow border p-12 text-center">
                <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">Select a location to view seating</h3>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow border overflow-hidden">
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-3">
                      <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                      Currently Seated – {selectedLocation?.name}
                    </h2>
                    <span className="text-sm text-gray-600">
                      {activeSeatings.length} tables occupied
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size / Section</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seated Since</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {activeSeatings.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              No parties currently seated
                            </td>
                          </tr>
                        ) : (
                          activeSeatings.map((s, idx) => {
                            const turnMin = calculateTurnTime(s!);
                                return (
                                    <tr key={s!.seatEvent.seatEventId ?? `active-${idx}`} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{s!.party.name}</td>
                                    <td className="px-6 py-4">{s!.table.tableId}</td>
                                    <td className="px-6 py-4">
                                        {s!.party.partySize} pax • {s!.table.section || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(s!.seatEvent.seatTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {turnMin ? `${turnMin} min` : 'In service'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {!s!.completeEvent && (
                                        <button
                                            onClick={() => handleCompleteParty(s!.party.id, s!.table.id)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                        >
                                            <CheckCircleIcon className="h-4 w-4" />
                                            Complete / Turn
                                        </button>
                                        )}
                                    </td>
                                    </tr>
                                );
                            })
                         )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow border">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <ClockIcon className="h-5 w-5 text-indigo-600" />
                      Avg Service Duration
                    </h3>
                    <div className="space-y-2">
                      {avgDurationBySize().map((item) => (
                        <div key={`size-${item.size}`} className="flex justify-between text-sm">
                          <span>{item.size}-top tables:</span>
                          <span className="font-medium">{item.avgMinutes} min</span>
                        </div>
                      ))}
                      {avgDurationBySize().length === 0 && (
                        <p className="text-gray-500 italic text-sm">No completed turns yet</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow border">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <ChartBarIcon className="h-5 w-5 text-indigo-600" />
                      Seating Velocity (last 2h)
                    </h3>
                    <div className="space-y-2">
                      {velocityBySection().map((item) => (
                        <div key={`section-${item.section ?? 'unknown'}-${Math.random().toString(36).slice(2,8)}`} className="flex justify-between text-sm">
                          <span>{item.section}:</span>
                          <span className="font-medium">
                            {item.turnsLast2h} turns ({item.velocity}/h)
                          </span>
                        </div>
                      ))}
                      {velocityBySection().length === 0 && (
                        <p className="text-gray-500 italic text-sm">No recent turns</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow border">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <ArrowPathIcon className="h-5 w-5 text-indigo-600" />
                      Overall Turn Stats
                    </h3>
                    <div className="text-3xl font-bold text-indigo-700">{completeEvents.length}</div>
                    <p className="text-sm text-gray-600 mt-1">Tables turned today</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}