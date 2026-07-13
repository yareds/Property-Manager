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
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';
import { Tenant, Lease, Document } from '../types';

interface TenantPanelProps {
  tenants: Tenant[];
  leases: Lease[];
  documents: Document[];
  addTenant: (tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTenant: (tenant: Tenant) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
}

export const TenantPanel: React.FC<TenantPanelProps> = ({
  tenants,
  leases,
  documents,
  addTenant,
  updateTenant,
  deleteTenant
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantModal, setTenantModal] = useState<{ open: boolean; editData: Tenant | null }>({ open: false, editData: null });

  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Filtering
  const filteredTenants = tenants.filter(t => 
    t.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.businessType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !contactPerson || !email) return;

    if (tenantModal.editData) {
      await updateTenant({
        ...tenantModal.editData,
        businessName,
        contactPerson,
        email,
        phone,
        businessType,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
      });
    } else {
      await addTenant({
        id: `tenant-${Date.now()}`,
        businessName,
        contactPerson,
        email,
        phone,
        businessType,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
      });
    }
    setTenantModal({ open: false, editData: null });
    // reset
    setBusinessName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setBusinessType('');
    setEmergencyName('');
    setEmergencyPhone('');
  };

  const openEditTenant = (t: Tenant) => {
    setBusinessName(t.businessName);
    setContactPerson(t.contactPerson);
    setEmail(t.email);
    setPhone(t.phone);
    setBusinessType(t.businessType);
    setEmergencyName(t.emergencyContactName);
    setEmergencyPhone(t.emergencyContactPhone);
    setTenantModal({ open: true, editData: t });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

        <button
          onClick={() => {
            setBusinessName('');
            setContactPerson('');
            setEmail('');
            setPhone('');
            setBusinessType('');
            setEmergencyName('');
            setEmergencyPhone('');
            setTenantModal({ open: true, editData: null });
          }}
          className="flex items-center justify-center space-x-1 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition cursor-pointer border border-blue-700"
        >
          <Plus size={14} />
          <span>Add New Tenant</span>
        </button>
      </div>

      {/* Tenants Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTenants.map((t) => {
          // Find leases and docs associated with tenant
          const tenantLeases = leases.filter(l => l.tenantId === t.id && l.status === 'Active');
          const tenantDocs = documents.filter(d => d.associatedWith === 'Tenant' && d.associatedId === t.id);

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4 space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Business Profile */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900">{t.businessName}</h3>
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
                        if (confirm(`Delete tenant ${t.businessName}? This cannot be undone.`)) {
                          deleteTenant(t.id);
                        }
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-slate-100 rounded"
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
                  <div className="space-y-1 bg-red-50/40 p-2 rounded border border-red-100/30">
                    <div className="flex items-center space-x-1 text-red-700 font-bold">
                      <ShieldAlert size={11} />
                      <span className="text-[9px] uppercase tracking-wider">Emergency Contact</span>
                    </div>
                    <p className="font-bold text-slate-800">{t.emergencyContactName}</p>
                    <div className="flex items-center space-x-1 text-slate-500 font-mono">
                      <Phone size={11} />
                      <span>{t.emergencyContactPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Active Leased Premises */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Leased Suites</span>
                  {tenantLeases.map(l => (
                    <div key={l.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="flex items-center space-x-1.5">
                        <Building size={12} className="text-slate-400" />
                        <span className="font-bold text-slate-700">{l.propertyName}</span>
                        <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                          {l.unitNumber}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">Expires {l.endDate}</span>
                    </div>
                  ))}
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
                onClick={() => setTenantModal({ open: false, editData: null })}
                className="text-slate-400 hover:text-slate-600 text-xs"
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

              <div className="bg-red-50/20 p-3 rounded border border-red-100/50 space-y-2">
                <span className="text-[10px] font-bold text-red-800 uppercase flex items-center space-x-1">
                  <ShieldAlert size={12} />
                  <span>Emergency Safety Contact</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Emergency Name</label>
                    <input
                      type="text"
                      required
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g. Facilities Director"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Emergency Phone</label>
                    <input
                      type="text"
                      required
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="(555) 555-9999"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTenantModal({ open: false, editData: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 cursor-pointer"
                >
                  {tenantModal.editData ? 'Save Changes' : 'Register Profile'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
