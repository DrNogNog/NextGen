"use client"
// src/pages/public/PublicCheckIn.tsx  (or similar)

import { useState, useEffect } from 'react';
import { UserGroupIcon, PhoneIcon, ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

type CheckInForm = {
  partySize: number;
  name: string;
  phone?: string; // optional
  notes?: string;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function PublicCheckIn() {
  const [form, setForm] = useState<CheckInForm>({
    partySize: 2,
    name: '',
    phone: '',
    notes: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [partyId] = useState(() => `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const smoke = await fetch(`${BACKEND}/api/internal/overview?__smoke=1`, { signal: controller.signal });
        if (!smoke.ok) return;
        const res = await fetch(`${BACKEND}/api/internal/overview`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const locs = data.locations ?? [];
        setLocations(locs);
        if (!selectedLocationId && locs.length) setSelectedLocationId(locs[0].id);
      } catch (e) {
        /* ignore public-page fetch errors */
      }
    })();
    return () => controller.abort();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || form.partySize < 1) return;

    // In real app → POST to /api/checkins
    const payload = {
      partyId,
      locationId: selectedLocationId ?? 'loc_1', // use selected backend location if available
      partySize: form.partySize,
      checkInTime: new Date().toISOString(),
      source: 'public' as const,
      status: 'waiting' as const,
      // optional extras
      guestName: form.name.trim(),
      guestPhone: form.phone?.trim() || null,
      notes: form.notes?.trim() || null,
    };

    console.log('Submitting check-in payload:', payload);

    // Simulate success
    setSubmitted(true);
  };

  const incrementSize = () => setForm(prev => ({ ...prev, partySize: prev.partySize + 1 }));
  const decrementSize = () => setForm(prev => ({ ...prev, partySize: Math.max(1, prev.partySize - 1) }));

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 max-w-md w-full text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">You're in the queue!</h2>
          <p className="text-gray-600 mb-6">
            We'll text you at {form.phone || 'your number'} when your table is ready.
          </p>
          <p className="text-sm text-gray-500">
            Party of {form.partySize} • {form.name}
          </p>
          <div className="mt-8">
            <button
              onClick={() => window.location.reload()}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Check in another party →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-8 text-white text-center">
            <h1 className="text-3xl font-bold">Join the Waitlist</h1>
            <p className="mt-2 text-indigo-100">Quick check-in • We'll notify you when ready</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Party Size */}
            <div className="text-center">
              <label className="block text-lg font-medium text-gray-700 mb-3">
                How many in your party?
              </label>
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={decrementSize}
                  className="w-14 h-14 rounded-full bg-gray-200 text-gray-700 text-3xl font-bold hover:bg-gray-300 active:bg-gray-400 transition"
                  disabled={form.partySize <= 1}
                >
                  −
                </button>

                <div className="text-5xl font-bold text-indigo-600 w-20 text-center">
                  {form.partySize}
                </div>

                <button
                  type="button"
                  onClick={incrementSize}
                  className="w-14 h-14 rounded-full bg-gray-200 text-gray-700 text-3xl font-bold hover:bg-gray-300 active:bg-gray-400 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Alex Smith"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                required
              />
            </div>

            {/* Phone – optional but strongly encouraged */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (for text updates)
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Optional — but you'll get faster updates!
              </p>
            </div>

            {/* Notes / Special requests */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes / Requests (optional)
              </label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="High chair needed? Birthday? Allergies?"
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition shadow-md flex items-center justify-center gap-2"
            >
              Join Waitlist
              <ArrowRightIcon className="h-5 w-5" />
            </button>

            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to receive SMS notifications (if provided).
            </p>
          </form>
        </div>
      </div>

      {/* Footer hint */}
      <footer className="py-4 text-center text-sm text-gray-500">
        Powered by Your Restaurant Name • Questions? Ask a host!
      </footer>
    </div>
  );
}