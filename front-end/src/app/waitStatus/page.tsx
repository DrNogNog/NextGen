"use client";

import { useState, useEffect } from "react";
import {
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function WaitStatus() {
  // ── Mock party data (replace with real data from URL/query/auth later) ──
  const [party, setParty] = useState({
    id: "p-abc123",
    name: "Gordon",
    partySize: 4,
    joinedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 min ago
    status: "waiting" as "waiting" | "notified" | "almost_ready" | "seated",
    position: 3,                    // your place in line
    estimatedWaitMinutes: 28,
    estimateUpdatedAt: new Date().toISOString(),
    confidenceLow: 22,
    confidenceHigh: 35,
  });

  // ── Simulate time passing & status changes (frontend demo only) ───────
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const smoke = await fetch(`${BACKEND}/api/internal/overview?__smoke=1`, { signal: controller.signal });
        if (!smoke.ok) return;
        const res = await fetch(`${BACKEND}/api/internal/overview`, { signal: controller.signal, credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const fetched: any[] = Array.isArray(data.parties) ? data.parties : [];
        if (!fetched.length) return;

        const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const partyId = qs?.get("partyId") ?? null;
        let found = partyId ? fetched.find(p => String(p.id) === partyId) : null;
        if (!found) found = fetched.find(p => ["waiting", "notified", "seated"].includes(p.status));
        if (!found) return;

        setParty({
          id: found.id,
          name: found.name ?? found.guestName ?? "Guest",
          partySize: found.partySize ?? found.size ?? 2,
          joinedAt: found.checkInTime ?? found.joinedAt ?? new Date().toISOString(),
          status: (found.status as any) ?? "waiting",
          position: found.position ?? 0,
          estimatedWaitMinutes: found.estimatedWaitMinutes ?? found.estimatedWait ?? 0,
          estimateUpdatedAt: new Date().toISOString(),
          confidenceLow: found.confidenceLow ?? 0,
          confidenceHigh: found.confidenceHigh ?? 0,
        });
      } catch (e) {
        /* keep demo state on error */
      }
    })();
    return () => controller.abort();
  }, []);

  // ── Derived UI values ─────────────────────────────────────────────────
  const {
    name,
    partySize,
    position,
    estimatedWaitMinutes,
    confidenceLow,
    confidenceHigh,
    status,
  } = party;

  const statusConfig = {
    waiting: {
      color: "text-amber-700",
      bg: "bg-amber-100",
      icon: ClockIcon,
      title: "In Queue",
      message: "We'll text you when your table is almost ready.",
    },
    notified: {
      color: "text-blue-700",
      bg: "bg-blue-100",
      icon: BellIcon,
      title: "Notified",
      message: "You've been texted — stay close!",
    },
    almost_ready: {
      color: "text-green-700",
      bg: "bg-green-100",
      icon: BellIcon,
      title: "Almost Ready",
      message: "Please head to the host stand soon!",
    },
    seated: {
      color: "text-green-700",
      bg: "bg-green-100",
      icon: CheckCircleIcon,
      title: "You're Seated!",
      message: "Enjoy your meal!",
    },
  };

  const current = statusConfig[status] || statusConfig.waiting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-10 text-white text-center">
            <h1 className="text-3xl font-bold">Your Wait Status</h1>
            <p className="mt-3 text-indigo-100 text-lg">
              Party of {partySize} • {name}
            </p>
          </div>

          {/* Main content */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Big ETA */}
            <div className="text-center">
              <div
                className={`text-6xl sm:text-7xl font-extrabold ${current.color}`}
              >
                {estimatedWaitMinutes === 0 ? "Now" : estimatedWaitMinutes}
                <span className="text-3xl sm:text-4xl font-bold ml-2">min</span>
              </div>

              <div className={`mt-2 text-xl font-semibold ${current.color}`}>
                {current.title}
              </div>

              {estimatedWaitMinutes > 0 && (
                <div className="mt-1 text-sm text-gray-600">
                  Estimated range: {confidenceLow}–{confidenceHigh} minutes
                </div>
              )}
            </div>

            {/* Position badge */}
            {status !== "seated" && (
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100 rounded-full">
                  <div className="text-2xl font-bold text-indigo-700">
                    #{position}
                  </div>
                  <div className="text-sm text-gray-600">
                    in line
                  </div>
                </div>
              </div>
            )}

            {/* Status message box */}
            <div className={`${current.bg} rounded-xl p-5 text-center`}>
              <current.icon className={`h-8 w-8 mx-auto mb-3 ${current.color}`} />
              <p className={`font-medium ${current.color}`}>{current.message}</p>
            </div>

            {/* Joined time & refresh note */}
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>
                Joined:{" "}
                {new Date(party.joinedAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p className="flex items-center justify-center gap-1.5">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Updating live...
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-sm text-gray-500 border-t">
        Urban Bites Collective • New York City
      </footer>
    </div>
  );
}