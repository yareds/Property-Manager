import React, { useState } from 'react';
import { 
  FileText, 
  Building, 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  TrendingUp, 
  Trash2, 
  History, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Lease, Tenant, Unit, Property } from '../types';

interface LeasePanelProps {
  leases: Lease[];
  tenants: Tenant[];
  units: Unit[];
  properties: Property[];
  addLease: (lease: Omit<Lease, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLease: (lease: Lease) => Promise<void>;
  deleteLease: (id: string) => Promise<void>;
  updateUnit: (unit: Unit) => Promise<void>;
}

export const LeasePanel: React.FC<LeasePanelProps> = ({
  leases,
  tenants,
  units,
  properties,
  addLease,
  updateLease,
  deleteLease,
  updateUnit
}) => {
  const [leaseModal, setLeaseModal] = useState<{ open: boolean; editData: Lease | null }>({ open: false, editData: null });
  const [renewalModal, setRenewalModal] = useState<{ open: boolean; lease: Lease | null }>({ open: false, lease: null });
  
  // New Lease Form State
  const [tenantId, setTenantId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(1000);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [status, setStatus] = useState<'Active' | 'Pending' | 'Expired' | 'Terminated'>('Active');

  // Renewal Form State
  const [newEndDate, setNewEndDate] = useState('');
  const [newRentAmount, setNewRentAmount] = useState<number>(1000);
  const [renewalNotes, setRenewalNotes] = useState('');

  // Helper: Calculate Remaining Duration
  const getRemainingDuration = (endStr: string) => {
    const end = new Date(endStr);
    const today = new Date('2026-07-04'); // Current local mock date
    
    if (end.getTime() < today.getTime()) {
      return <span className="text-red-500 font-semibold">Expired</span>;
    }

    const diffTime = Math.abs(end.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) {
      return <span className="text-red-500 font-semibold">{diffDays} Days Remaining</span>;
    } else if (diffDays <= 60) {
      return <span className="text-amber-500 font-semibold">1 Month Remaining</span>;
    }
    
    const months = Math.floor(diffDays / 30.43);
    if (months < 12) {
      return <span className="text-indigo-600 font-semibold">{months} Months Left</span>;
    }
    
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return (
      <span className="text-slate-600 font-semibold">
        {years}y {remMonths > 0 ? `${remMonths}m` : ''} Left
      </span>
    );
  };

  // Sign New Lease handler
  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !unitId || !startDate || !endDate) return;

    const tenant = tenants.find(t => t.id === tenantId);
    const unit = units.find(u => u.id === unitId);
    if (!tenant || !unit) return;

    const property = properties.find(p => p.id === unit.propertyId);
    if (!property) return;

    const newLease: Omit<Lease, 'createdAt' | 'updatedAt'> = {
      id: `lease-${Date.now()}`,
      tenantId,
      businessName: tenant.businessName,
      propertyId: property.id,
      propertyName: property.name,
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      startDate,
      endDate,
      monthlyRent: Number(monthlyRent),
      depositAmount: Number(depositAmount),
      status,
      renewalHistory: [],
    };

    await addLease(newLease);
    
    // Auto mark unit as Occupied
    await updateUnit({
      ...unit,
      occupancyStatus: 'Occupied',
      tenantId: tenant.id
    });

    setLeaseModal({ open: false, editData: null });
    // Reset Form
    setTenantId('');
    setUnitId('');
    setStartDate('');
    setEndDate('');
  };

  // Submit Extension/Renewal handler with Audit trail
  const handleExtendLease = async (e: React.FormEvent) => {
    e.preventDefault();
    const lease = renewalModal.lease;
    if (!lease || !newEndDate) return;

    const renewalRecord = {
      extendedAt: new Date().toISOString(),
      oldEndDate: lease.endDate,
      newEndDate: newEndDate,
      notes: renewalNotes || 'Lease renewal extension completed.'
    };

    const updatedLease: Lease = {
      ...lease,
      endDate: newEndDate,
      monthlyRent: Number(newRentAmount),
      renewalHistory: [...(lease.renewalHistory || []), renewalRecord]
    };

    await updateLease(updatedLease);
    
    // Also sync the unit monthly rent if changed
    const unit = units.find(u => u.id === lease.unitId);
    if (unit) {
      await updateUnit({
        ...unit,
        monthlyRent: Number(newRentAmount)
      });
    }

    setRenewalModal({ open: false, lease: null });
    setRenewalNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Leases & Tenant Agreements</h2>
          <p className="text-[11px] text-slate-500">Track expirations, renew leases, and verify security deposits</p>
        </div>

        <button
          onClick={() => {
            setLeaseModal({ open: true, editData: null });
          }}
          className="flex items-center space-x-1 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition cursor-pointer border border-blue-700"
        >
          <Plus size={14} />
          <span>New Lease Agreement</span>
        </button>
      </div>

      {/* Leases directory */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="px-4 py-2.5">Business Tenant</th>
                <th className="px-4 py-2.5">Property & Suite</th>
                <th className="px-4 py-2.5">Lease Term</th>
                <th className="px-4 py-2.5 text-right">Rent / Deposit</th>
                <th className="px-4 py-2.5">Remaining Term</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {leases.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50">
                  {/* Tenant */}
                  <td className="px-4 py-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                        <FileText size={13} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{l.businessName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">ID: {l.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Building */}
                  <td className="px-4 py-2">
                    <div className="flex flex-col text-xs">
                      <span className="font-bold text-slate-700">{l.propertyName}</span>
                      <span className="text-slate-400 font-mono font-bold">{l.unitNumber}</span>
                    </div>
                  </td>

                  {/* Terms dates */}
                  <td className="px-4 py-2 font-medium text-slate-500">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-1">
                        <Calendar size={10} className="text-slate-400" />
                        <span>Start: {l.startDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar size={10} className="text-slate-400" />
                        <span>End: {l.endDate}</span>
                      </div>
                    </div>
                  </td>

                  {/* Rent and deposit */}
                  <td className="px-4 py-2 text-right">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">Br {l.monthlyRent.toLocaleString()}/mo</span>
                      <span className="text-[10px] text-slate-400">Deposit: Br {l.depositAmount.toLocaleString()}</span>
                    </div>
                  </td>

                  {/* Remaining timeline */}
                  <td className="px-4 py-2 font-mono text-[11px]">
                    {l.status === 'Active' ? getRemainingDuration(l.endDate) : <span className="text-slate-400 font-sans italic">-</span>}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      l.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                      l.status === 'Pending' ? 'bg-blue-100 text-blue-800' :
                      l.status === 'Expired' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {l.status}
                    </span>
                  </td>

                  {/* Actions (Renewal & delete) */}
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => {
                          setNewEndDate(l.endDate);
                          setNewRentAmount(l.monthlyRent);
                          setRenewalModal({ open: true, lease: l });
                        }}
                        className="flex items-center space-x-1 p-1 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold border border-blue-100"
                        title="Extend/Renew Lease"
                      >
                        <TrendingUp size={11} />
                        <span>Extend</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this lease record?')) {
                            deleteLease(l.id);
                          }
                        }}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-slate-100 rounded"
                        title="Delete record"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {leases.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                    No lease contracts recorded in system yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trails & Extension History Section */}
      <div className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          <History size={14} className="text-slate-400" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lease Renewal Audit Logs</h3>
        </div>

        <div className="space-y-2">
          {leases.filter(l => l.renewalHistory && l.renewalHistory.length > 0).map(l => (
            <div key={l.id} className="space-y-1.5 p-3 bg-slate-50 rounded border border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{l.businessName} (Suite {l.unitNumber})</span>
                <span className="text-blue-600 font-mono">Lease Ref: {l.id}</span>
              </div>
              
              <div className="divide-y divide-slate-200 text-xs text-slate-600 space-y-1.5">
                {l.renewalHistory?.map((h, idx) => (
                  <div key={idx} className="pt-1.5 flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">Extension executed on {new Date(h.extendedAt).toLocaleDateString()}</p>
                      <p className="text-slate-400 italic font-medium">"{h.notes}"</p>
                    </div>
                    <div className="text-right font-mono text-[10px] text-slate-500">
                      <p>Prev: {h.oldEndDate}</p>
                      <p className="text-emerald-600 font-bold">New: {h.newEndDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {leases.filter(l => l.renewalHistory && l.renewalHistory.length > 0).length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-2">
              No historical renewal audits logged yet. Use the "Extend" button on any active lease.
            </p>
          )}
        </div>
      </div>

      {/* ========================================================
         MODAL: SIGN NEW LEASE
         ======================================================== */}
      {leaseModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Execute New Commercial Lease</h3>
              <button
                onClick={() => setLeaseModal({ open: false, editData: null })}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLease} className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Tenant Selection */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tenant Business</label>
                  <select
                    required
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.businessName}</option>
                    ))}
                  </select>
                </div>

                {/* Vacant Units selection */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rentable Suite / Unit</label>
                  <select
                    required
                    value={unitId}
                    onChange={(e) => {
                      setUnitId(e.target.value);
                      const selectedUnit = units.find(u => u.id === e.target.value);
                      if (selectedUnit) {
                        setMonthlyRent(selectedUnit.monthlyRent);
                        setDepositAmount(selectedUnit.monthlyRent * 2); // default 2 months deposit
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Suite --</option>
                    {units.filter(u => u.occupancyStatus === 'Vacant' || u.occupancyStatus === 'Reserved').map(u => (
                      <option key={u.id} value={u.id}>{u.propertyName} - {u.unitNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Negotiated Monthly Rent (Birr)</label>
                  <input
                    type="number"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Security Deposit Amount (Birr)</label>
                  <input
                    type="number"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setLeaseModal({ open: false, editData: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 cursor-pointer"
                >
                  Execute Agreement
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================
         MODAL: LEASE EXTENSION / RENEWAL
         ======================================================== */}
      {renewalModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Extend & Renew Lease</h3>
              <button
                onClick={() => setRenewalModal({ open: false, lease: null })}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExtendLease} className="p-4 space-y-3">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 text-xs text-slate-600">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>{renewalModal.lease?.businessName}</span>
                  <span>Suite {renewalModal.lease?.unitNumber}</span>
                </div>
                <p>Current Expiry Date: <strong className="text-red-500">{renewalModal.lease?.endDate}</strong></p>
                <p>Current Rent: <strong>Br {renewalModal.lease?.monthlyRent.toLocaleString()}/mo</strong></p>
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">New Expiration Date</label>
                <input
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Adjusted Rent Amount (Birr/mo)</label>
                <input
                  type="number"
                  required
                  value={newRentAmount}
                  onChange={(e) => setNewRentAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Audit Renewal Notes / Comments</label>
                <textarea
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  placeholder="e.g. Approved 5% rent increase, extended for another 12 month term."
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRenewalModal({ open: false, lease: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 cursor-pointer"
                >
                  Submit Extension Log
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
