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
  AlertCircle,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { motion } from 'motion/react';
import { Lease, Tenant, Unit, Property, Payment } from '../types';
import { getAvailableUnits, calculateDefaultDeposit, checkLeaseOverlap } from '../utils/leaseUtils';
import { ConfirmModal } from './ConfirmModal';

interface LeasePanelProps {
  leases: Lease[];
  tenants: Tenant[];
  units: Unit[];
  properties: Property[];
  payments?: Payment[];
  addLease: (lease: Omit<Lease, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLease: (lease: Lease) => Promise<void>;
  deleteLease: (id: string) => Promise<void>;
  updateUnit: (unit: Unit) => Promise<void>;
  addTenant?: (tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const LeasePanel: React.FC<LeasePanelProps> = ({
  leases,
  tenants,
  units,
  properties,
  payments = [],
  addLease,
  updateLease,
  deleteLease,
  updateUnit,
  addTenant
}) => {
  const [leaseModal, setLeaseModal] = useState<{ open: boolean; editData: Lease | null }>({ open: false, editData: null });
  const [renewalModal, setRenewalModal] = useState<{ open: boolean; lease: Lease | null }>({ open: false, lease: null });
  const [isSubmittingLease, setIsSubmittingLease] = useState(false);
  const [isSubmittingRenewal, setIsSubmittingRenewal] = useState(false);
  
  // New Lease Form State
  const [tenantId, setTenantId] = useState('');
  const [isNewTenant, setIsNewTenant] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBusinessType, setNewBusinessType] = useState('');

  const [unitId, setUnitId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(1000);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [status, setStatus] = useState<'Active' | 'Pending' | 'Expired' | 'Terminated'>('Active');

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    leaseId: string;
    businessName: string;
    unitNumber: string;
    hasPayments: boolean;
  } | null>(null);

  // Renewal Form State
  const [newEndDate, setNewEndDate] = useState('');
  const [newRentAmount, setNewRentAmount] = useState<number>(1000);
  const [renewalNotes, setRenewalNotes] = useState('');

  // Helper: Calculate if a lease end date has passed
  const isLeaseExpired = (endStr: string) => {
    if (!endStr) return false;
    const parts = endStr.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end.getTime() < today.getTime();
  };

  // Helper: Calculate Remaining Duration
  const getRemainingDuration = (endStr: string) => {
    if (!endStr) return <span className="text-slate-400 font-sans italic">-</span>;
    const parts = endStr.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) {
      return <span className="text-slate-400 font-sans italic">-</span>;
    }

    const [year, month, day] = parts;
    const end = new Date(year, month - 1, day, 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (end.getTime() < today.getTime()) {
      const diffPastTime = today.getTime() - end.getTime();
      const diffPastDays = Math.floor(diffPastTime / (1000 * 60 * 60 * 24));
      return (
        <span className="text-red-600 font-bold">
          Expired {diffPastDays > 0 ? `(${diffPastDays}d ago)` : ''}
        </span>
      );
    }

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return <span className="text-red-600 font-bold">Expires Today</span>;
    } else if (diffDays <= 30) {
      return <span className="text-red-600 font-semibold">{diffDays} Days Remaining</span>;
    } else if (diffDays <= 60) {
      return <span className="text-amber-600 font-semibold">1 Month Remaining</span>;
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

  // Form Error States
  const [leaseError, setLeaseError] = useState('');
  const [renewalError, setRenewalError] = useState('');

  // Helper to open create modal
  const handleOpenCreateModal = () => {
    setTenantId('');
    setIsNewTenant(false);
    setNewBusinessName('');
    setNewContactPerson('');
    setNewEmail('');
    setNewPhone('');
    setNewBusinessType('');
    setUnitId('');
    setStartDate('');
    setEndDate('');
    setMonthlyRent(1000);
    setDepositAmount(2000);
    setStatus('Active');
    setLeaseError('');
    setLeaseModal({ open: true, editData: null });
  };

  // Helper to open edit modal
  const handleOpenEditModal = (lease: Lease) => {
    setTenantId(lease.tenantId);
    setIsNewTenant(false);
    setNewBusinessName('');
    setNewContactPerson('');
    setNewEmail('');
    setNewPhone('');
    setNewBusinessType('');
    setUnitId(lease.unitId);
    setStartDate(lease.startDate);
    setEndDate(lease.endDate);
    setMonthlyRent(lease.monthlyRent);
    setDepositAmount(lease.depositAmount);
    setStatus(lease.status);
    setLeaseError('');
    setLeaseModal({ open: true, editData: lease });
  };

  // Sign New Lease or Update Existing Lease handler
  const handleSaveLease = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaseError('');
    if (!tenantId || !unitId || !startDate || !endDate || isSubmittingLease) return;

    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    const property = properties.find(p => p.id === unit.propertyId);
    if (!property) return;

    let targetTenant: Tenant | undefined = undefined;

    if (isNewTenant || tenantId === 'NEW_TENANT') {
      if (!newBusinessName.trim()) {
        setLeaseError('Please enter a Business Name for the new tenant.');
        return;
      }
      const createdTenantId = `tenant-${crypto.randomUUID()}`;
      const newTenantObj: Omit<Tenant, 'createdAt' | 'updatedAt'> = {
        id: createdTenantId,
        businessName: newBusinessName.trim(),
        contactPerson: newContactPerson.trim() || 'Primary Contact',
        email: newEmail.trim() || `${newBusinessName.toLowerCase().replace(/[^a-z0-9]/g, '')}@tenant.com`,
        phone: newPhone.trim(),
        businessType: newBusinessType.trim() || 'Commercial Tenant',
        status: 'Active'
      };

      if (addTenant) {
        await addTenant(newTenantObj);
      }
      targetTenant = {
        ...newTenantObj,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      targetTenant = tenants.find(t => t.id === tenantId);
    }

    if (!targetTenant) {
      setLeaseError('Please select or register a valid tenant.');
      return;
    }

    const isEditing = Boolean(leaseModal.editData);
    const excludeId = leaseModal.editData?.id;

    // Check for overlapping active/pending leases on the same unit
    const conflictLease = checkLeaseOverlap(unit.id, startDate, endDate, leases, excludeId);
    if (conflictLease) {
      setLeaseError(
        `Cannot ${isEditing ? 'update' : 'create'} lease: Suite ${unit.unitNumber} already has an active lease for "${conflictLease.businessName}" from ${conflictLease.startDate} to ${conflictLease.endDate}. Overlapping lease dates for the same unit are not permitted.`
      );
      return;
    }

    setIsSubmittingLease(true);
    try {
      if (isEditing && leaseModal.editData) {
        const updatedLease: Lease = {
          ...leaseModal.editData,
          tenantId: targetTenant.id,
          businessName: targetTenant.businessName,
          propertyId: property.id,
          propertyName: property.name,
          unitId: unit.id,
          unitNumber: unit.unitNumber,
          startDate,
          endDate,
          monthlyRent: Number(monthlyRent),
          depositAmount: Number(depositAmount),
          status,
        };

        await updateLease(updatedLease);

        // Auto update unit occupancy if active/pending
        if (status === 'Active' || status === 'Pending') {
          await updateUnit({
            ...unit,
            occupancyStatus: status === 'Pending' ? 'Reserved' : 'Occupied',
            tenantId: targetTenant.id
          });
        }
      } else {
        const newLease: Omit<Lease, 'createdAt' | 'updatedAt'> = {
          id: `lease-${crypto.randomUUID()}`,
          tenantId: targetTenant.id,
          businessName: targetTenant.businessName,
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
        
        // Auto mark unit as Occupied or Reserved
        await updateUnit({
          ...unit,
          occupancyStatus: status === 'Pending' ? 'Reserved' : 'Occupied',
          tenantId: targetTenant.id
        });
      }

      setLeaseModal({ open: false, editData: null });
      setLeaseError('');
      // Reset Form
      setTenantId('');
      setIsNewTenant(false);
      setNewBusinessName('');
      setNewContactPerson('');
      setNewEmail('');
      setNewPhone('');
      setNewBusinessType('');
      setUnitId('');
      setStartDate('');
      setEndDate('');
    } finally {
      setIsSubmittingLease(false);
    }
  };

  // Submit Extension/Renewal handler with Audit trail
  const handleExtendLease = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenewalError('');
    const lease = renewalModal.lease;
    if (!lease || !newEndDate || isSubmittingRenewal) return;

    // Check for overlapping active leases when extending lease end date
    const conflictLease = checkLeaseOverlap(lease.unitId, lease.startDate, newEndDate, leases, lease.id);
    if (conflictLease) {
      setRenewalError(
        `Cannot extend lease: Suite ${lease.unitNumber} has another active lease for "${conflictLease.businessName}" starting on ${conflictLease.startDate}. Extended lease dates overlap with the other agreement.`
      );
      return;
    }

    setIsSubmittingRenewal(true);
    try {
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
      setRenewalError('');
      setRenewalNotes('');
    } finally {
      setIsSubmittingRenewal(false);
    }
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
          onClick={handleOpenCreateModal}
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
                    {l.status === 'Active' || l.status === 'Pending' ? getRemainingDuration(l.endDate) : <span className="text-slate-400 font-sans italic">-</span>}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-2 text-center">
                    {(() => {
                      const displayStatus = (l.status === 'Active' && isLeaseExpired(l.endDate)) ? 'Expired' : l.status;
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          displayStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                          displayStatus === 'Pending' ? 'bg-blue-100 text-blue-800' :
                          displayStatus === 'Expired' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {displayStatus}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Actions (Edit, Renewal & delete) */}
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => handleOpenEditModal(l)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
                        title="Edit lease details"
                      >
                        <Edit size={12} />
                      </button>
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
                          const hasPayments = (payments || []).some(p => p.leaseId === l.id);
                          setDeleteConfirm({
                            isOpen: true,
                            leaseId: l.id,
                            businessName: l.businessName,
                            unitNumber: l.unitNumber,
                            hasPayments,
                          });
                        }}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-slate-100 rounded cursor-pointer"
                        title={(payments || []).some(p => p.leaseId === l.id) ? "Terminate lease contract" : "Delete lease record"}
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
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                {leaseModal.editData ? 'Edit Lease Agreement' : 'Execute New Commercial Lease'}
              </h3>
              <button
                disabled={isSubmittingLease}
                onClick={() => setLeaseModal({ open: false, editData: null })}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLease} className="p-4 space-y-3">
              {leaseError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start space-x-2">
                  <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                  <span>{leaseError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Tenant Selection */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tenant Business</label>
                  <select
                    required
                    value={tenantId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTenantId(val);
                      if (val === 'NEW_TENANT') {
                        setIsNewTenant(true);
                      } else {
                        setIsNewTenant(false);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">-- Choose Tenant --</option>
                    <option value="NEW_TENANT" className="font-bold text-blue-600 bg-blue-50">+ Register New Tenant...</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.businessName}</option>
                    ))}
                  </select>
                </div>

                {/* Rentable Suite selection */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rentable Suite / Unit</label>
                  {(() => {
                    const availableUnits = getAvailableUnits(units, leases, startDate, endDate, leaseModal.editData?.id);
                    const currentUnit = units.find(u => u.id === unitId);
                    const displayUnits = [...availableUnits];
                    if (currentUnit && !displayUnits.some(u => u.id === currentUnit.id)) {
                      displayUnits.push(currentUnit);
                    }

                    if (displayUnits.length === 0) {
                      return (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
                          <div className="font-bold text-amber-900 flex items-center space-x-1">
                            <AlertTriangle size={13} className="text-amber-600" />
                            <span>No Vacant Units</span>
                          </div>
                          <p className="text-[11px] leading-snug">
                            No vacant units available for these dates. Add a new unit or free up an existing one.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <select
                        required
                        value={unitId}
                        onChange={(e) => {
                          setUnitId(e.target.value);
                          const selectedUnit = units.find(u => u.id === e.target.value);
                          if (selectedUnit) {
                            setMonthlyRent(selectedUnit.monthlyRent);
                            setDepositAmount(calculateDefaultDeposit(selectedUnit.monthlyRent));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Choose Suite --</option>
                        {displayUnits.map(u => (
                          <option key={u.id} value={u.id}>{u.propertyName} - {u.unitNumber}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </div>

              {isNewTenant && (
                <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded space-y-2.5">
                  <div className="text-[11px] font-bold text-blue-900 flex items-center space-x-1.5">
                    <User size={13} className="text-blue-600" />
                    <span>New Tenant Profile Details</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Business Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kaldis Coffee"
                        value={newBusinessName}
                        onChange={(e) => setNewBusinessName(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Person</label>
                      <input
                        type="text"
                        placeholder="Manager or Owner"
                        value={newContactPerson}
                        onChange={(e) => setNewContactPerson(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                      <input
                        type="email"
                        placeholder="contact@business.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+251 ..."
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly Rent (Birr)</label>
                  <input
                    type="number"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Security Deposit (Birr)</label>
                  <input
                    type="number"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Agreement Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Expired">Expired</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSubmittingLease}
                  onClick={() => setLeaseModal({ open: false, editData: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50 bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLease}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded border border-blue-700 cursor-pointer"
                >
                  {isSubmittingLease ? 'Saving...' : leaseModal.editData ? 'Update Agreement' : 'Execute Agreement'}
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
                disabled={isSubmittingRenewal}
                onClick={() => setRenewalModal({ open: false, lease: null })}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExtendLease} className="p-4 space-y-3">
              {renewalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start space-x-2">
                  <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                  <span>{renewalError}</span>
                </div>
              )}

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
                  disabled={isSubmittingRenewal}
                  onClick={() => setRenewalModal({ open: false, lease: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRenewal}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded border border-blue-700 cursor-pointer"
                >
                  {isSubmittingRenewal ? 'Submitting...' : 'Submit Extension Log'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete / Terminate Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          title={deleteConfirm.hasPayments ? "Terminate Lease Contract" : "Delete Lease Contract"}
          message={
            deleteConfirm.hasPayments
              ? `This lease agreement for tenant "${deleteConfirm.businessName}" (Suite/Unit ${deleteConfirm.unitNumber}) has payment history. It will be marked as Terminated and its payment history will remain fully intact.`
              : `Are you sure you want to delete the lease agreement for tenant "${deleteConfirm.businessName}" (Suite/Unit ${deleteConfirm.unitNumber})? This action cannot be undone.`
          }
          confirmLabel={deleteConfirm.hasPayments ? "Terminate Lease" : "Delete Lease"}
          cancelLabel="Cancel"
          isDanger={!deleteConfirm.hasPayments}
          onConfirm={() => {
            deleteLease(deleteConfirm.leaseId);
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};
