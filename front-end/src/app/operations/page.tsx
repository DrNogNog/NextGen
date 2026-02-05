"use client";

import { useState, useEffect } from "react";
import {
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  TableCellsIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type Location = { id: string; name: string };

type Party = {
  id: string;
  name: string;
  phone?: string;
  partySize: number;
  checkInTime: string;     // ISO
  estimatedWaitMinutes: number;
  actualWaitMinutes?: number;
  seatTime?: string;
  completeTime?: string;
  status: "waiting" | "notified" | "seated" | "completed" | "no_show" | "cancelled";
  locationId: string;
  notes?: string;
};

type KPIData = {
  avgQuotedWait: number;
  avgActualWait: number;
  waitAccuracyDelta: number; // quoted - actual
  tableUtilizationPercent: number;
  noShowRatePercent: number;
};

// ────────────────────────────────────────────────────────────────
// Mock Data & Helpers
// ────────────────────────────────────────────────────────────────

const mockLocations: Location[] = [
  { id: "loc_downtown", name: "Downtown" },
  { id: "loc_brooklyn", name: "Williamsburg" },
  { id: "loc_ues", name: "Upper East Side" },
];

const mockParties: Party[] = [
  // Waiting
  { id: "p1", name: "Chen", partySize: 2, checkInTime: new Date(Date.now() - 12*60*1000).toISOString(), estimatedWaitMinutes: 18, status: "waiting", locationId: "loc_downtown" },
  { id: "p2", name: "Smith Family", partySize: 5, checkInTime: new Date(Date.now() - 38*60*1000).toISOString(), estimatedWaitMinutes: 45, status: "notified", locationId: "loc_brooklyn", notes: "High chair needed" },
  // Seated
  { id: "p3", name: "Rodriguez", partySize: 4, checkInTime: new Date(Date.now() - 75*60*1000).toISOString(), estimatedWaitMinutes: 35, actualWaitMinutes: 28, seatTime: new Date(Date.now() - 47*60*1000).toISOString(), status: "seated", locationId: "loc_downtown" },
  { id: "p4", name: "Patel", partySize: 6, checkInTime: new Date(Date.now() - 120*60*1000).toISOString(), estimatedWaitMinutes: 60, actualWaitMinutes: 55, seatTime: new Date(Date.now() - 65*60*1000).toISOString(), completeTime: new Date(Date.now() - 10*60*1000).toISOString(), status: "completed", locationId: "loc_ues" },
  { id: "p5", name: "Kim", partySize: 2, checkInTime: new Date(Date.now() - 180*60*1000).toISOString(), estimatedWaitMinutes: 25, actualWaitMinutes: 40, seatTime: new Date(Date.now() - 140*60*1000).toISOString(), status: "completed", locationId: "loc_brooklyn" },
  { id: "p6", name: "Lee", partySize: 3, checkInTime: new Date(Date.now() - 45*60*1000).toISOString(), estimatedWaitMinutes: 30, status: "no_show", locationId: "loc_downtown" },
];

function calculateKPIs(timeWindowMinutes: number = 24 * 60, sourceParties?: Party[]): KPIData {
  const now = Date.now();
  const cutoff = now - timeWindowMinutes * 60 * 1000;
  const parties = sourceParties ?? mockParties;

  const relevant = parties.filter(p => new Date(p.checkInTime).getTime() >= cutoff);

  const completed = relevant.filter(p => p.status === "completed" || p.status === "no_show");
  const seatedOrCompleted = relevant.filter(p => p.seatTime || p.completeTime);

  const quotedSum = relevant.reduce((sum, p) => sum + p.estimatedWaitMinutes, 0);
  const actualSum = relevant.reduce((sum, p) => sum + (p.actualWaitMinutes ?? 0), 0);

  return {
    avgQuotedWait: relevant.length ? Math.round(quotedSum / relevant.length) : 0,
    avgActualWait: completed.length ? Math.round(actualSum / completed.length) : 0,
    waitAccuracyDelta: relevant.length ? Math.round((quotedSum - actualSum) / relevant.length) : 0,
    tableUtilizationPercent: seatedOrCompleted.length ? Math.round((seatedOrCompleted.length / 20) * 100) : 0, // assume 20 tables
    noShowRatePercent: relevant.length ? Math.round((relevant.filter(p => p.status === "no_show").length / relevant.length) * 100) : 0,
  };
}

// ────────────────────────────────────────────────────────────────
// Operations Dashboard
// ────────────────────────────────────────────────────────────────

export default function Operations() {
  const [timeWindow, setTimeWindow] = useState<"24h" | "7d">("24h");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    (async () => {
      try {
        const smoke = await fetch(`${BACKEND}/api/internal/overview?__smoke=1`, { signal: controller.signal });
        if (!smoke.ok) throw new Error("backend unreachable");
        const res = await fetch(`${BACKEND}/api/internal/overview`, { signal: controller.signal, credentials: "include" });
        if (!res.ok) throw new Error(`Fetch error ${res.status}`);
        const data = await res.json();
        setLocations(data.locations);
        setParties(data.parties);
      } catch (err) {
        if ((err as any).name !== "AbortError") console.error("operations fetch error:", err);
      }
    })();
    return () => controller.abort();
  }, []);

  const usedKpis = calculateKPIs(timeWindow === "24h" ? 24*60 : 7*24*60, parties);
  const filteredParties = parties.filter(p => {
    const matchesLocation = !selectedLocation || p.locationId === selectedLocation;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm);
    return matchesLocation && matchesSearch;
  });

  const waiting = filteredParties.filter(p => p.status === "waiting" || p.status === "notified");
  const seated = filteredParties.filter(p => p.status === "seated");
  const completed = filteredParties.filter(p => p.status === "completed" || p.status === "no_show" || p.status === "cancelled");

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ChartBarIcon className="h-8 w-8 text-indigo-600" />
              Operations Dashboard
            </h1>
            <p className="mt-1 text-gray-600">Real-time performance & party insights</p>
          </div>

          <div className="flex gap-3">
            <select
              value={timeWindow}
              onChange={e => setTimeWindow(e.target.value as "24h" | "7d")}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <KPITile icon={ClockIcon} title="Avg Quoted Wait" value={`${usedKpis.avgQuotedWait} min`} color="indigo" />
          <KPITile icon={ClockIcon} title="Avg Actual Wait" value={`${usedKpis.avgActualWait} min`} color="blue" />
          <KPITile 
            icon={ArrowPathIcon} 
            title="Wait Accuracy" 
            value={`${usedKpis.waitAccuracyDelta > 0 ? "+" : ""}${usedKpis.waitAccuracyDelta} min`} 
            color={usedKpis.waitAccuracyDelta >= 0 ? "green" : "red"} 
          />
          <KPITile icon={TableCellsIcon} title="Table Utilization" value={`${usedKpis.tableUtilizationPercent}%`} color="purple" />
          <KPITile 
            icon={ExclamationTriangleIcon} 
            title="No-Show Rate" 
            value={`${usedKpis.noShowRatePercent}%`} 
            color={usedKpis.noShowRatePercent > 15 ? "red" : "amber"} 
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow border p-5 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={selectedLocation || ""}
                onChange={e => setSelectedLocation(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Name or phone..."
                  className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Tables */}
        <div className="space-y-10">
          <TableSection title="Active Waitlist" parties={waiting} onSelect={setSelectedParty} />
          <TableSection title="Currently Seated" parties={seated} onSelect={setSelectedParty} />
          <TableSection title="Completed / No-Show (recent)" parties={completed} onSelect={setSelectedParty} />
        </div>

        {/* Party Detail Modal */}
        {selectedParty && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <UserGroupIcon className="h-7 w-7 text-indigo-600" />
                  {selectedParty.name} • Party of {selectedParty.partySize}
                </h2>
                <button onClick={() => setSelectedParty(null)} className="text-gray-500 hover:text-gray-800">
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem label="Status" value={selectedParty.status.toUpperCase()} />
                  <DetailItem label="Location" value={locations.find(l => l.id === selectedParty.locationId)?.name || "—"} />
                  <DetailItem label="Check-in" value={new Date(selectedParty.checkInTime).toLocaleString()} />
                  {selectedParty.seatTime && (
                    <DetailItem label="Seated at" value={new Date(selectedParty.seatTime).toLocaleString()} />
                  )}
                  {selectedParty.completeTime && (
                    <DetailItem label="Completed at" value={new Date(selectedParty.completeTime).toLocaleString()} />
                  )}
                  <DetailItem 
                    label="Estimated vs Actual Wait" 
                    value={
                      selectedParty.actualWaitMinutes !== undefined
                        ? `${selectedParty.estimatedWaitMinutes} min → ${selectedParty.actualWaitMinutes} min`
                        : `${selectedParty.estimatedWaitMinutes} min (pending)`
                    } 
                  />
                  {selectedParty.notes && <DetailItem label="Notes" value={selectedParty.notes} />}
                </div>

                {/* Simple timeline */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Timeline</h3>
                  <div className="space-y-4">
                    <TimelineEvent time={selectedParty.checkInTime} label="Checked in" />
                    {selectedParty.seatTime && <TimelineEvent time={selectedParty.seatTime} label="Seated" />}
                    {selectedParty.completeTime && <TimelineEvent time={selectedParty.completeTime} label="Table turned" />}
                    {selectedParty.status === "no_show" && <TimelineEvent time={new Date().toISOString()} label="Marked as No-Show" />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Reusable Components
// ────────────────────────────────────────────────────────────────

function KPITile({ icon: Icon, title, value, color }: { 
  icon: any; title: string; value: string; color: string 
}) {
  return (
    <div className="bg-white rounded-xl shadow border p-6 text-center">
      <Icon className={`h-8 w-8 mx-auto mb-3 text-${color}-600`} />
      <div className="text-sm text-gray-600">{title}</div>
      <div className={`text-3xl font-bold mt-1 text-${color}-700`}>{value}</div>
    </div>
  );
}

function TableSection({ title, parties, onSelect }: { 
  title: string; parties: Party[]; onSelect: (p: Party) => void 
}) {
  return (
    <div className="bg-white rounded-xl shadow border overflow-hidden">
      <div className="p-5 border-b bg-gray-50">
        <h2 className="text-xl font-bold flex items-center gap-3">
          <TableCellsIcon className="h-6 w-6 text-indigo-600" />
          {title} ({parties.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name / Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Wait</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {parties.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                  No parties in this category
                </td>
              </tr>
            ) : (
              parties.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-600">{p.partySize} pax</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      p.status === "waiting" ? "bg-amber-100 text-amber-800" :
                      p.status === "notified" ? "bg-blue-100 text-blue-800" :
                      p.status === "seated" ? "bg-green-100 text-green-800" :
                      p.status === "completed" ? "bg-gray-100 text-gray-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(p.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.estimatedWaitMinutes} min{p.actualWaitMinutes !== undefined && ` → ${p.actualWaitMinutes} min`}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onSelect(p)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-base font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function TimelineEvent({ time, label }: { time: string; label: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <ClockIcon className="h-4 w-4 text-indigo-600" />
        </div>
      </div>
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-gray-500">{new Date(time).toLocaleString()}</p>
      </div>
    </div>
  );
}