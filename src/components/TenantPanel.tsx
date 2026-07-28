import React, { useState } from 'react';
import { 
  Users, 
  Building, 
  Mail, 
  Phone, 
  Briefcase, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  FileText,
  Clock,
  ExternalLink,
  AlertTriangle,
  Archive
} from 'lucide-react';
import { motion } from 'motion/react';
import { Tenant, Lease, Document, Unit, Property, Payment } from '../types';
import { getAvailableUnits, calculateDefaultDeposit, checkLeaseOverlap, isDateExpired } from '../utils/leaseUtils';
import { ConfirmModal } from './ConfirmModal';

interface TenantPanelProps {
  tenants: Tenant[];
  leases: Lease[];
  documents: Document[];
  units?: Unit[];
  properties?: Property[];
  payments?: Payment[];
  addTenant: (tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTenant: (tenant: Tenant) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  addLease?: (lease: Omit<Lease, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateUnit?: (unit: Unit) => Promise<void>;
}

export const TenantPanel: React.FC<TenantPanelProps> = ({
  tenants,
  leases,
  documents,
  units = [],
  properties = [],
  payments = [],
  addTenant,
  updateTenant,
  deleteTenant,
  addLease,
  updateUnit
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Archived'>('ALL');
  const [tenantModal, setTenantModal] = useState<{ open: boolean; editData: Tenant | null }>({ open: false, editData: null });
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);

  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Combined Tenant Registration + Lease Signing Form State
  const [assignLeaseNow, setAssignLeaseNow] = useState(false);
  const [leaseUnitId, setLeaseUnitId] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [leaseMonthlyRent, setLeaseMonthlyRent] = useState<number>(0);
  const [leaseDepositAmount, setLeaseDepositAmount] = useState<number>(0);
  const [leaseError, setLeaseError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    tenantId: string;
    tenantName: string;
    hasPayments: boolean;
    tenantLeasesCount: number;
  } | null>(null);

  // Filtering
  const filteredTenants = tenants.filter(t => {
    const status = t.status || 'Active';
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
    const matchesSearch = t.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.businessType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const resetTenantAndLeaseForm = () => {
    setBusinessName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setBusinessType('');
    setEmergencyName('');
    setEmergencyPhone('');
    setAssignLeaseNow(false);
    setLeaseUnitId('');
    setLeaseStartDate('');
    setLeaseEndDate('');
    setLeaseMonthlyRent(0);
    setLeaseDepositAmount(0);
    setLeaseError(null);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !contactPerson || !email || isSubmittingTenant) return;

    setIsSubmittingTenant(true);
    setLeaseError(null);

    const newTenantId = tenantModal.editData ? tenantModal.editData.id : `tenant-${crypto.randomUUID()}`;

    try {
      // 1. Add / Update Tenant
      if (tenantModal.editData) {
        const updatedTenant: Tenant = {
          ...tenantModal.editData,
          businessName,
          contactPerson,
          email,
          phone,
          businessType,
        };
        if (emergencyName.trim()) {
          updatedTenant.emergencyContactName = emergencyName.trim();
        } else {
          delete updatedTenant.emergencyContactName;
        }
        if (emergencyPhone.trim()) {
          updatedTenant.emergencyContactPhone = emergencyPhone.trim();
        } else {
          delete updatedTenant.emergencyContactPhone;
        }
        await updateTenant(updatedTenant);
      } else {
        const newTenantObj: Omit<Tenant, 'createdAt' | 'updatedAt'> = {
          id: newTenantId,
          businessName,
          contactPerson,
          email,
          phone,
          businessType,
          ...(emergencyName.trim() ? { emergencyContactName: emergencyName.trim() } : {}),
          ...(emergencyPhone.trim() ? { emergencyContactPhone: emergencyPhone.trim() } : {}),
        };
        await addTenant(newTenantObj);
      }

      // 2. If assign lease now was selected, execute lease creation & unit update
      if (assignLeaseNow && leaseUnitId && addLease && updateUnit && !tenantModal.editData) {
        const selectedUnit = units.find(u => u.id === leaseUnitId);
        const selectedProperty = properties.find(p => p.id === selectedUnit?.propertyId);

        if (selectedUnit && selectedProperty && leaseStartDate && leaseEndDate) {
          // Check for overlapping active leases
          const conflictLease = checkLeaseOverlap(selectedUnit.id, leaseStartDate, leaseEndDate, leases);
          if (conflictLease) {
            setLeaseError(
              `Cannot assign lease: Suite ${selectedUnit.unitNumber} already has an active lease for "${conflictLease.businessName}" from ${conflictLease.startDate} to ${conflictLease.endDate}. Overlapping lease dates for the same unit are not permitted.`
            );
            return;
          }

          try {
            const newLease: Omit<Lease, 'createdAt' | 'updatedAt'> = {
              id: `lease-${crypto.randomUUID()}`,
              tenantId: newTenantId,
              businessName,
              propertyId: selectedProperty.id,
              propertyName: selectedProperty.name,
              unitId: selectedUnit.id,
              unitNumber: selectedUnit.unitNumber,
              startDate: leaseStartDate,
              endDate: leaseEndDate,
              monthlyRent: Number(leaseMonthlyRent),
              depositAmount: Number(leaseDepositAmount),
              status: 'Active',
              renewalHistory: [],
            };

            await addLease(newLease);
            await updateUnit({
              ...selectedUnit,
              occupancyStatus: 'Occupied',
              tenantId: newTenantId,
            });
          } catch (err: any) {
            console.error("Lease creation failed during tenant registration:", err);
            setLeaseError(
              `Tenant "${businessName}" was successfully registered, but creating the lease agreement failed (${err?.message || 'unknown error'}). You can execute the lease manually in the Lease Tracker.`
            );
            return;
          }
        }
      }

      setTenantModal({ open: false, editData: null });
      resetTenantAndLeaseForm();
    } catch (err: any) {
      console.error("Tenant save failed:", err);
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  const openEditTenant = (t: Tenant) => {
    resetTenantAndLeaseForm();
    setBusinessName(t.businessName);
    setContactPerson(t.contactPerson);
    setEmail(t.email);
    setPhone(t.phone);
    setBusinessType(t.businessType);
    setEmergencyName(t.emergencyContactName || '');
    setEmergencyPhone(t.emergencyContactPhone || '');
    setTenantModal({ open: true, editData: t });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search businesses, primary contacts, or company types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Archived">Archived Only</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              resetTenantAndLeaseForm();
              setAssignLeaseNow(true);
              const today = new Date().toISOString().split('T')[0];
              const nextYear = new Date();
              nextYear.setFullYear(nextYear.getFullYear() + 1);
              setLeaseStartDate(today);
              setLeaseEndDate(nextYear.toISOString().split('T')[0]);
              setTenantModal({ open: true, editData: null });
            }}
            className="flex items-center justify-center space-x-1 bg-indigo-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-indigo-700 transition cursor-pointer border border-indigo-700"
          >
            <FileText size={14} />
            <span>Register & Sign Lease</span>
          </button>

          <button
            onClick={() => {
              resetTenantAndLeaseForm();
              setTenantModal({ open: true, editData: null });
            }}
            className="flex items-center justify-center space-x-1 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition cursor-pointer border border-blue-700"
          >
            <Plus size={14} />
            <span>Add New Tenant</span>
          </button>
        </div>
      </div>

      {/* Tenants Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTenants.map((t) => {
          const isArchived = (t.status || 'Active') === 'Archived';
          // Find leases and docs associated with tenant
          const tenantLeases = leases.filter(l => l.tenantId === t.id && l.status === 'Active');
          const tenantDocs = documents.filter(d => d.associatedWith === 'Tenant' && d.associatedId === t.id);

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${isArchived ? 'bg-slate-50/80 border-slate-300' : 'bg-white border-slate-200'} rounded border shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 space-y-3.5 flex flex-col justify-between`}
            >
              <div className="space-y-3">
                {/* Header: Business Profile */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">{t.businessName}</h3>
                      {isArchived && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-amber-100 text-amber-900 border border-amber-200/80 tracking-wider flex items-center space-x-1">
                          <Archive size={10} />
                          <span>Archived</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                      <Briefcase size={11} className="text-slate-400" />
                      <span>{t.businessType}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditTenant(t)}
                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => {
                        const tenantNameLower = t.businessName.toLowerCase();
                        const hasPayments = (payments || []).some(p => p.tenantId === t.id || (tenantNameLower && p.businessName.toLowerCase() === tenantNameLower));
                        const tenantLeasesCount = leases.filter(l => l.tenantId === t.id || (tenantNameLower && l.businessName.toLowerCase() === tenantNameLower)).length;

                        setDeleteConfirm({
                          isOpen: true,
                          tenantId: t.id,
                          tenantName: t.businessName,
                          hasPayments,
                          tenantLeasesCount,
                        });
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-slate-100 rounded cursor-pointer"
                      title={isArchived ? "Archive/Remove Tenant Profile" : "Delete or Archive Tenant Profile"}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Primary Contacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Primary Contact</span>
                    <p className="font-bold text-slate-800">{t.contactPerson}</p>
                    <div className="flex items-center space-x-1 text-slate-500">
                      <Mail size={11} />
                      <span className="truncate">{t.email}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-500">
                      <Phone size={11} />
                      <span>{t.phone}</span>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  {(t.emergencyContactName?.trim() || t.emergencyContactPhone?.trim()) ? (
                    <div className="space-y-1 bg-red-50/40 p-2 rounded border border-red-100/30">
                      <div className="flex items-center space-x-1 text-red-700 font-bold">
                        <ShieldAlert size={11} />
                        <span className="text-[9px] uppercase tracking-wider">Emergency Contact</span>
                      </div>
                      {t.emergencyContactName?.trim() && <p className="font-bold text-slate-800">{t.emergencyContactName.trim()}</p>}
                      {t.emergencyContactPhone?.trim() && (
                        <div className="flex items-center space-x-1 text-slate-500 font-mono">
                          <Phone size={11} />
                          <span>{t.emergencyContactPhone.trim()}</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Active Leased Premises */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Leased Suites</span>
                  {tenantLeases.map(l => {
                    const expired = l.status === 'Expired' || isDateExpired(l.endDate);
                    const statusLabel = expired ? 'Expired' : l.status;

                    return (
                      <div key={l.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100">
                        <div className="flex items-center space-x-1.5">
                          <Building size={12} className="text-slate-400" />
                          <span className="font-bold text-slate-700">{l.propertyName}</span>
                          <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                            {l.unitNumber}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            statusLabel === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                            statusLabel === 'Pending' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {statusLabel}
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">Expires {l.endDate}</span>
                        </div>
                      </div>
                    );
                  })}
                  {tenantLeases.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No active lease recorded.</p>
                  )}
                </div>
              </div>

              {/* Documents attached */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Compliance Documents</span>
                <div className="flex flex-wrap gap-1">
                  {tenantDocs.map(d => (
                    <div key={d.id} className="flex items-center space-x-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded">
                      <FileText size={10} />
                      <span className="font-bold truncate max-w-[120px]">{d.name}</span>
                      <ExternalLink size={9} className="ml-0.5 text-blue-400 cursor-pointer hover:text-blue-600" />
                    </div>
                  ))}
                  {tenantDocs.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">No certificates attached.</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredTenants.length === 0 && (
          <div className="col-span-full bg-white rounded p-8 text-center text-slate-500 border border-slate-200">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No tenant businesses listed.</p>
          </div>
        )}
      </div>

      {/* ========================================================
         MODAL: ADD/EDIT TENANT
         ======================================================== */}
      {tenantModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                {tenantModal.editData ? 'Edit Tenant Profile' : 'Register New Tenant'}
              </h3>
              <button
                disabled={isSubmittingTenant}
                onClick={() => setTenantModal({ open: false, editData: null })}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Business / Company Name</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. ByteCore Softworks"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Industry / Business Type</label>
                  <input
                    type="text"
                    required
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="e.g. Retail Cafe, Tech SaaS"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-0.5 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Primary Contact Person</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-red-50/20 p-3 rounded border border-red-100/50 space-y-2">
                <span className="text-[10px] font-bold text-red-800 uppercase flex items-center space-x-1">
                  <ShieldAlert size={12} />
                  <span>Emergency Safety Contact (Optional)</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Emergency Name (Optional)</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g. Facilities Director"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Emergency Phone (Optional)</label>
                    <input
                      type="text"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="(555) 555-9999"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Combined Tenant Registration + Sign Lease Section */}
              {!tenantModal.editData && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 p-2.5 rounded border border-slate-200 hover:bg-slate-100/70 transition">
                    <input
                      type="checkbox"
                      checked={assignLeaseNow}
                      onChange={(e) => {
                        setAssignLeaseNow(e.target.checked);
                        if (e.target.checked) {
                          const today = new Date().toISOString().split('T')[0];
                          const nextYear = new Date();
                          nextYear.setFullYear(nextYear.getFullYear() + 1);
                          if (!leaseStartDate) setLeaseStartDate(today);
                          if (!leaseEndDate) setLeaseEndDate(nextYear.toISOString().split('T')[0]);
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800">Assign to unit & sign lease now</span>
                      <p className="text-[10px] text-slate-500">Walk tenant directly into a vacant suite and execute agreement</p>
                    </div>
                  </label>

                  {assignLeaseNow && (
                    <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 space-y-3">
                      <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center space-x-1">
                        <FileText size={12} />
                        <span>Lease Agreement Details</span>
                      </div>

                      {/* Vacant Units Dropdown */}
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Rentable Suite / Unit</label>
                        <select
                          required={assignLeaseNow}
                          value={leaseUnitId}
                          onChange={(e) => {
                            setLeaseUnitId(e.target.value);
                            const selectedUnit = units.find(u => u.id === e.target.value);
                            if (selectedUnit) {
                              setLeaseMonthlyRent(selectedUnit.monthlyRent);
                              setLeaseDepositAmount(calculateDefaultDeposit(selectedUnit.monthlyRent));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">-- Choose Vacant Suite --</option>
                          {getAvailableUnits(units, leases, leaseStartDate, leaseEndDate).map(u => (
                            <option key={u.id} value={u.id}>
                              {u.propertyName} - Suite {u.unitNumber} ({u.monthlyRent} Birr/mo)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Lease Dates */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Lease Start Date</label>
                          <input
                            type="date"
                            required={assignLeaseNow}
                            value={leaseStartDate}
                            onChange={(e) => setLeaseStartDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Lease End Date</label>
                          <input
                            type="date"
                            required={assignLeaseNow}
                            value={leaseEndDate}
                            onChange={(e) => setLeaseEndDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Rent & Deposit Amounts */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly Rent (Birr)</label>
                          <input
                            type="number"
                            required={assignLeaseNow}
                            value={leaseMonthlyRent}
                            onChange={(e) => setLeaseMonthlyRent(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Security Deposit (Birr)</label>
                          <input
                            type="number"
                            required={assignLeaseNow}
                            value={leaseDepositAmount}
                            onChange={(e) => setLeaseDepositAmount(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lease Creation Error Surface Notice */}
              {leaseError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>Lease Creation Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">{leaseError}</p>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLeaseError(null);
                        setTenantModal({ open: false, editData: null });
                        resetTenantAndLeaseForm();
                      }}
                      className="px-3 py-1 bg-amber-200/80 hover:bg-amber-200 text-amber-900 font-bold text-[10px] rounded cursor-pointer"
                    >
                      Acknowledge & Close
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSubmittingTenant}
                  onClick={() => {
                    setTenantModal({ open: false, editData: null });
                    resetTenantAndLeaseForm();
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50 bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTenant}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded border border-blue-700 cursor-pointer"
                >
                  {isSubmittingTenant 
                    ? (tenantModal.editData ? 'Saving...' : (assignLeaseNow ? 'Registering & Signing...' : 'Registering...')) 
                    : (tenantModal.editData ? 'Save Changes' : (assignLeaseNow ? 'Register & Sign Lease' : 'Register Profile'))}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          title={deleteConfirm.hasPayments ? "Archive Tenant Profile" : "Delete Tenant Profile"}
          message={
            deleteConfirm.hasPayments
              ? "This tenant has payment history, so their profile and lease records will be archived rather than deleted. Payment history will remain fully intact. Their active lease(s) will be marked Terminated and unit(s) will become available."
              : `Are you sure you want to delete tenant profile "${deleteConfirm.tenantName}"?${deleteConfirm.tenantLeasesCount > 0 ? ` This will also permanently delete ${deleteConfirm.tenantLeasesCount} associated lease(s) with no payment history.` : ''} This action cannot be undone.`
          }
          confirmLabel={deleteConfirm.hasPayments ? "Archive Tenant" : "Delete Tenant"}
          cancelLabel="Cancel"
          isDanger={!deleteConfirm.hasPayments}
          onConfirm={() => {
            deleteTenant(deleteConfirm.tenantId);
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};
