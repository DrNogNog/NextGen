// src/pages/host/Host.tsx  (or wherever fits your routing)
"use client"
import { useState } from 'react';
import {
  UserGroupIcon,
  PhoneIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserPlusIcon,
  ArrowRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

type PartyStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no-show';

type Party = {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  addedAt: string;          // ISO or relative time
  estimatedWait: number;    // minutes
  status: PartyStatus;
  notes?: string;
  locationId?: string;      // if multi-location
};

const statusColors: Record<PartyStatus, string> = {
  waiting:   'bg-amber-100 text-amber-800',
  notified:  'bg-blue-100 text-blue-800',
  seated:    'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  'no-show': 'bg-red-100 text-red-800',
};

const statusLabels: Record<PartyStatus, string> = {
  waiting:   'Waiting',
  notified:  'Notified',
  seated:    'Seated',
  cancelled: 'Cancelled',
  'no-show': 'No-show',
};

export default function Host() {
  const [parties, setParties] = useState<Party[]>([
    { id: 'p1', name: 'Smith', phone: '(917) 555-0123', partySize: 4, addedAt: '10 min ago', estimatedWait: 18, status: 'waiting', notes: 'High chair needed' },
    { id: 'p2', name: 'Garcia', phone: '(646) 555-0987', partySize: 2, addedAt: '14 min ago', estimatedWait: 8,  status: 'notified', notes: '' },
    { id: 'p3', name: 'Johnson', phone: '(212) 555-3344', partySize: 6, addedAt: '22 min ago', estimatedWait: 25, status: 'waiting', notes: 'Anniversary' },
    { id: 'p4', name: 'Lee', phone: '(718) 555-7766', partySize: 5, addedAt: '35 min ago', estimatedWait: 5,  status: 'seated', notes: '' },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newParty, setNewParty] = useState({ name: '', phone: '', partySize: 2, notes: '' });

  const activeParties = parties.filter(p => p.status === 'waiting' || p.status === 'notified');

  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParty.name.trim() || !newParty.phone.trim()) return;

    const party: Party = {
      id: `p${Date.now()}`,
      name: newParty.name.trim(),
      phone: newParty.phone.trim(),
      partySize: newParty.partySize,
      addedAt: 'Just now',
      estimatedWait: Math.floor(Math.random() * 30) + 5, // mock
      status: 'waiting',
      notes: newParty.notes.trim() || undefined,
    };

    setParties(prev => [party, ...prev]);
    setNewParty({ name: '', phone: '', partySize: 2, notes: '' });
    setShowAddForm(false);
  };

  const updateStatus = (id: string, newStatus: PartyStatus) => {
    setParties(prev =>
      prev.map(p => p.id === id ? { ...p, status: newStatus } : p)
    );
  };

  const updatePartySize = (id: string, delta: number) => {
    setParties(prev =>
      prev.map(p =>
        p.id === id ? { ...p, partySize: Math.max(1, p.partySize + delta) } : p
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserGroupIcon className="h-8 w-8 text-indigo-600" />
              Host Stand – Waitlist
            </h1>
            <p className="mt-1 text-gray-600">
              {activeParties.length} parties waiting • Current queue
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm"
          >
            <UserPlusIcon className="h-5 w-5" />
            Add Party to Waitlist
          </button>
        </div>

        {/* Add Party Form – inline or modal in real app */}
        {showAddForm && (
          <div className="mb-10 bg-white p-6 rounded-xl shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlusIcon className="h-5 w-5 text-indigo-600" />
              New Party
            </h2>

            <form onSubmit={handleAddParty} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newParty.name}
                  onChange={e => setNewParty({ ...newParty, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={newParty.phone}
                    onChange={e => setNewParty({ ...newParty, phone: e.target.value })}
                    className="w-full pl-10 border border-gray-300 rounded-lg px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newParty.partySize}
                  onChange={e => setNewParty({ ...newParty, partySize: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (allergies, high chair, etc.)</label>
                <textarea
                  value={newParty.notes}
                  onChange={e => setNewParty({ ...newParty, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2 flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add to Waitlist
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Waitlist Table */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <ClockIcon className="h-6 w-6 text-indigo-600" />
              Current Waitlist ({activeParties.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wait / Added</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeParties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                      No parties waiting – great job!
                    </td>
                  </tr>
                ) : (
                  activeParties.map(party => (
                    <tr key={party.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{party.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <PhoneIcon className="h-4 w-4" />
                          {party.phone}
                        </div>
                        {party.notes && (
                          <div className="text-xs text-gray-600 mt-1 italic">Note: {party.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{party.partySize}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => updatePartySize(party.id, -1)}
                              className="text-gray-500 hover:text-gray-900"
                            >–</button>
                            <button
                              onClick={() => updatePartySize(party.id, 1)}
                              className="text-gray-500 hover:text-gray-900"
                            >+</button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>{party.estimatedWait} min</div>
                        <div className="text-xs text-gray-500">{party.addedAt}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[party.status]}`}>
                          {statusLabels[party.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {party.status === 'waiting' && (
                          <button
                            onClick={() => updateStatus(party.id, 'notified')}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Notify guest (SMS)"
                          >
                            <ArrowRightIcon className="h-5 w-5 inline" /> Notify
                          </button>
                        )}
                        {party.status === 'notified' && (
                          <button
                            onClick={() => updateStatus(party.id, 'seated')}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Seat the party"
                          >
                            <CheckCircleIcon className="h-5 w-5 inline" /> Seat
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(party.id, 'cancelled')}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                        >
                          <XCircleIcon className="h-5 w-5 inline" />
                        </button>
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">
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
      </div>
    </div>
  );
}