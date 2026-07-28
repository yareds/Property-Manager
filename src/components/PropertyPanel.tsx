import React, { useState } from 'react';
import { 
  Building, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  Search, 
  SlidersHorizontal,
  FolderOpen,
  Settings,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property, Unit, Tenant, Lease } from '../types';
import { getUnitOccupancyAndTenant } from '../utils/leaseUtils';
import { ConfirmModal } from './ConfirmModal';

interface PropertyPanelProps {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases?: Lease[];
  addProperty: (property: Omit<Property, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProperty: (property: Property) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  addUnit: (unit: Omit<Unit, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateUnit: (unit: Unit) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  properties,
  units,
  tenants,
  leases = [],
  addProperty,
  updateProperty,
  deleteProperty,
  addUnit,
  updateUnit,
  deleteUnit
}) => {
  // Navigation & Drill down state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals status
  const [propertyModal, setPropertyModal] = useState<{ open: boolean; editData: Property | null }>({ open: false, editData: null });
  const [unitModal, setUnitModal] = useState<{ open: boolean; editData: Unit | null }>({ open: false, editData: null });

  // Submission States
  const [isSubmittingProperty, setIsSubmittingProperty] = useState(false);
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);

  // Post-Property Creation Flow State
  const [createdProperty, setCreatedProperty] = useState<Property | null>(null);
  const [addedUnitsInSession, setAddedUnitsInSession] = useState<Unit[]>([]);

  // Add/Edit Property Form State
  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propType, setPropType] = useState<'Commercial' | 'Office' | 'Retail' | 'Industrial' | 'Residential'>('Office');
  const [propImageUrl, setPropImageUrl] = useState('');

  // Add/Edit Unit Form State
  const [unitNumber, setUnitNumber] = useState('');
  const [unitType, setUnitType] = useState('Office');
  const [unitSize, setUnitSize] = useState<number>(1000);
  const [unitRent, setUnitRent] = useState<number>(1500);
  const [unitStatus, setUnitStatus] = useState<'Occupied' | 'Vacant' | 'Reserved' | 'Maintenance'>('Vacant');

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'property' | 'unit';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  // Find selected property details
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const propertyUnits = units.filter(u => u.propertyId === selectedPropertyId);

  // Filtered properties
  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Handle Property Save
  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName || !propAddress || isSubmittingProperty) return;

    setIsSubmittingProperty(true);
    try {
      if (propertyModal.editData) {
        await updateProperty({
          ...propertyModal.editData,
          name: propName,
          address: propAddress,
          type: propType,
          imageUrl: propImageUrl || undefined,
        });
        setPropertyModal({ open: false, editData: null });
        setPropName('');
        setPropAddress('');
        setPropImageUrl('');
      } else {
        const now = new Date().toISOString();
        const newProp: Property = {
          id: `prop-${crypto.randomUUID()}`,
          name: propName,
          address: propAddress,
          type: propType,
          imageUrl: propImageUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&h=250&q=80',
          createdAt: now,
          updatedAt: now,
        };
        await addProperty(newProp);
        // Transition modal to "Add Units" flow for this newly created property
        setCreatedProperty(newProp);
        setSelectedPropertyId(newProp.id);
        setAddedUnitsInSession([]);
        setPropName('');
        setPropAddress('');
        setPropImageUrl('');
        setUnitNumber('');
        setUnitType('Office');
        setUnitSize(1000);
        setUnitRent(1500);
        setUnitStatus('Vacant');
      }
    } finally {
      setIsSubmittingProperty(false);
    }
  };

  // Add unit in immediate post-creation flow
  const handleAddUnitInSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber || !createdProperty || isSubmittingUnit) return;

    setIsSubmittingUnit(true);
    try {
      const newUnit: Omit<Unit, 'createdAt' | 'updatedAt'> = {
        id: `unit-${crypto.randomUUID()}`,
        propertyId: createdProperty.id,
        propertyName: createdProperty.name,
        unitNumber,
        type: unitType,
        sizeSqFt: Number(unitSize),
        monthlyRent: Number(unitRent),
        occupancyStatus: unitStatus,
      };
      await addUnit(newUnit);
      setAddedUnitsInSession(prev => [...prev, newUnit as Unit]);
      // Reset unit form for next entry
      setUnitNumber('');
      setUnitType('Office');
      setUnitSize(1000);
      setUnitRent(1500);
      setUnitStatus('Vacant');
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  const handleFinishPropertySetup = () => {
    setPropertyModal({ open: false, editData: null });
    setCreatedProperty(null);
    setAddedUnitsInSession([]);
  };

  // Open property modal for edit
  const openEditProperty = (p: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setPropName(p.name);
    setPropAddress(p.address);
    setPropType(p.type);
    setPropImageUrl(p.imageUrl || '');
    setPropertyModal({ open: true, editData: p });
  };

  // Handle Unit Save
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber || !selectedPropertyId || !selectedProperty || isSubmittingUnit) return;

    setIsSubmittingUnit(true);
    try {
      if (unitModal.editData) {
        await updateUnit({
          ...unitModal.editData,
          unitNumber,
          type: unitType,
          sizeSqFt: Number(unitSize),
          monthlyRent: Number(unitRent),
          occupancyStatus: unitStatus,
        });
      } else {
        await addUnit({
          id: `unit-${crypto.randomUUID()}`,
          propertyId: selectedPropertyId,
          propertyName: selectedProperty.name,
          unitNumber,
          type: unitType,
          sizeSqFt: Number(unitSize),
          monthlyRent: Number(unitRent),
          occupancyStatus: unitStatus,
        });
      }
      setUnitModal({ open: false, editData: null });
      // reset form
      setUnitNumber('');
      setUnitSize(1000);
      setUnitRent(1500);
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  // Open unit modal for edit
  const openEditUnit = (u: Unit) => {
    setUnitNumber(u.unitNumber);
    setUnitType(u.type);
    setUnitSize(u.sizeSqFt);
    setUnitRent(u.monthlyRent);
    setUnitStatus(u.occupancyStatus);
    setUnitModal({ open: true, editData: u });
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!selectedPropertyId ? (
          /* ========================================================
             MAIN PROPERTIES DIRECTORY VIEW
             ======================================================== */
          <motion.div
            key="property-list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Toolbar section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search buildings by name or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded text-xs text-slate-600 font-medium">
                  <SlidersHorizontal size={12} />
                  <span>Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">All Portfolio</option>
                    <option value="Office">Office Space</option>
                    <option value="Retail">Retail Storefronts</option>
                    <option value="Industrial">Industrial Warehouses</option>
                    <option value="Residential">Residential Complex</option>
                  </select>
                </div>

                <button
                  id="btn-add-property"
                  onClick={() => {
                    setPropName('');
                    setPropAddress('');
                    setPropImageUrl('');
                    setPropertyModal({ open: true, editData: null });
                  }}
                  className="flex items-center space-x-1 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition duration-150 cursor-pointer border border-blue-700"
                >
                  <Plus size={14} />
                  <span>New Property</span>
                </button>
              </div>
            </div>

            {/* Grid of properties */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProperties.map((p) => {
                const propUnits = units.filter(u => u.propertyId === p.id);
                const occupiedCount = propUnits.filter(u => getUnitOccupancyAndTenant(u, leases, tenants).occupancyStatus === 'Occupied').length;
                const totalUnitsCount = propUnits.length;
                const occRate = totalUnitsCount > 0 ? Math.round((occupiedCount / totalUnitsCount) * 100) : 0;

                return (
                  <motion.div
                    key={p.id}
                    layoutId={`prop-card-${p.id}`}
                    onClick={() => setSelectedPropertyId(p.id)}
                    className="bg-white rounded overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors group flex flex-col justify-between"
                  >
                    <div>
                      {/* Image header */}
                      <div className="h-32 relative bg-slate-200 overflow-hidden">
                        <img
                          src={p.imageUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&h=250&q=80'}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                        />
                        <div className="absolute top-2 left-2">
                          <span className="bg-slate-900/85 backdrop-blur-sm text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-white/10">
                            {p.type}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</h3>
                          <div className="flex items-center text-[11px] text-slate-500 space-x-1">
                            <MapPin size={11} className="shrink-0 text-slate-400" />
                            <span className="truncate">{p.address}</span>
                          </div>
                        </div>

                        {/* Occupancy state */}
                        <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Occupancy</span>
                            <span className="font-bold text-slate-700">{occRate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${occRate}%` }}></div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 font-mono">
                            <span>{occupiedCount} Leased</span>
                            <span>{totalUnitsCount} Units Total</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer controls */}
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-blue-600 hover:underline">Manage Units &rarr;</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={(e) => openEditProperty(p, e)}
                          className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                          title="Edit Building Details"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              isOpen: true,
                              type: 'property',
                              id: p.id,
                              title: 'Delete Property',
                              message: `Are you sure you want to delete building property "${p.name}"? This action cannot be undone and will affect associated units.`
                            });
                          }}
                          className="p-1 bg-white border border-slate-200 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete Property"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {filteredProperties.length === 0 && (
                <div className="col-span-full bg-white rounded p-8 text-center text-slate-500 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <Building size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No matching buildings found.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ========================================================
             DRILL-DOWN PROPERTY DETAILED UNITS VIEW
             ======================================================== */
          <motion.div
            key="unit-list"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -25 }}
            className="space-y-6"
          >
            {/* Header back button */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-start space-x-2">
                <button
                  onClick={() => setSelectedPropertyId(null)}
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded transition duration-150 mt-0.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                </button>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{selectedProperty?.name}</h2>
                  <div className="flex items-center text-slate-500 text-[11px] mt-0.5">
                    <MapPin size={11} className="mr-1 text-slate-400" />
                    <span>{selectedProperty?.address}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setUnitNumber('');
                    setUnitRent(1500);
                    setUnitSize(1000);
                    setUnitStatus('Vacant');
                    setUnitModal({ open: true, editData: null });
                  }}
                  className="flex items-center space-x-1 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition cursor-pointer border border-blue-700"
                >
                  <Plus size={14} />
                  <span>New Rental Unit</span>
                </button>
              </div>
            </div>

            {/* Units list */}
            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Units Breakdown Ledger</h3>
                <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {propertyUnits.length} Units Listed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="px-4 py-2.5">Unit ID</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5 text-right">Size (Sq Ft)</th>
                      <th className="px-4 py-2.5 text-right">Monthly Rent</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5">Active Tenant</th>
                      <th className="px-4 py-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {propertyUnits.map((u) => {
                      const { occupancyStatus, activeTenant, expiredLeases } = getUnitOccupancyAndTenant(u, leases, tenants);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-bold text-slate-800">{u.unitNumber}</td>
                          <td className="px-4 py-2 text-slate-500 text-xs">{u.type}</td>
                          <td className="px-4 py-2 text-right font-mono text-[11px]">{u.sizeSqFt.toLocaleString()} sqft</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800">Br {u.monthlyRent.toLocaleString()}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              occupancyStatus === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                              occupancyStatus === 'Vacant' ? 'bg-slate-100 text-slate-700' :
                              occupancyStatus === 'Reserved' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {occupancyStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {activeTenant ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{activeTenant.businessName}</span>
                                <span className="text-[9px] text-slate-400">{activeTenant.contactPerson}</span>
                              </div>
                            ) : expiredLeases.length > 0 ? (
                              <div className="flex flex-col">
                                <span className="text-slate-400 italic text-[11px]">No active tenant</span>
                                <span className="text-[9px] text-red-500 font-mono">
                                  (Lease expired: {expiredLeases[0].businessName})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No active tenant</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => openEditUnit(u)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                                title="Edit Unit"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirm({
                                    isOpen: true,
                                    type: 'unit',
                                    id: u.id,
                                    title: 'Delete Rental Suite / Unit',
                                    message: `Are you sure you want to delete Suite/Unit "${u.unitNumber}"? This action cannot be undone.`
                                  });
                                }}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-slate-100 rounded cursor-pointer"
                                title="Delete Unit"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {propertyUnits.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 italic text-[11px]">
                          No units listed. Click "New Rental Unit" to initialize.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
         MODAL: ADD/EDIT PROPERTY (WITH STEP 2 ADD UNITS FLOW)
         ======================================================== */}
      {propertyModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden"
          >
            {createdProperty ? (
              <div>
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Add Units to Property</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Step 2: Define suites and rental units</p>
                  </div>
                  <button
                    disabled={isSubmittingUnit}
                    onClick={handleFinishPropertySetup}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-50 text-sm font-semibold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                  {/* Property Summary Header */}
                  <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{createdProperty.name}</div>
                      <div className="text-slate-500">{createdProperty.address} • {createdProperty.type}</div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full shrink-0">
                      Property Created
                    </span>
                  </div>

                  {/* Added Units Running List */}
                  {addedUnitsInSession.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                        <span>Units Added So Far ({addedUnitsInSession.length})</span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {addedUnitsInSession.map((u) => (
                          <div key={u.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                            <span className="font-bold text-slate-800">Suite {u.unitNumber} ({u.type})</span>
                            <span className="text-slate-600 font-mono text-[11px]">{u.sizeSqFt} sq ft • {u.monthlyRent} Birr/mo</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Unit Form */}
                  <form onSubmit={handleAddUnitInSession} className="space-y-3 pt-1 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {addedUnitsInSession.length === 0 ? 'Add First Unit' : 'Add Another Unit'}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Suite / Unit #</label>
                        <input
                          type="text"
                          required
                          value={unitNumber}
                          onChange={(e) => setUnitNumber(e.target.value)}
                          placeholder="e.g. 101 or Suite A"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Unit Type</label>
                        <select
                          value={unitType}
                          onChange={(e) => setUnitType(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="Office">Office</option>
                          <option value="Retail">Retail</option>
                          <option value="Warehouse">Warehouse</option>
                          <option value="Commercial">Commercial</option>
                          <option value="Studio">Studio</option>
                          <option value="1-Bed">1-Bed</option>
                          <option value="2-Bed">2-Bed</option>
                          <option value="3-Bed">3-Bed</option>
                          <option value="Penthouse">Penthouse</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Size (sq ft)</label>
                        <input
                          type="number"
                          required
                          value={unitSize}
                          onChange={(e) => setUnitSize(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Rent (Birr)</label>
                        <input
                          type="number"
                          required
                          value={unitRent}
                          onChange={(e) => setUnitRent(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                        <select
                          value={unitStatus}
                          onChange={(e) => setUnitStatus(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="Vacant">Vacant</option>
                          <option value="Occupied">Occupied</option>
                          <option value="Reserved">Reserved</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                      <button
                        type="button"
                        disabled={isSubmittingUnit}
                        onClick={handleFinishPropertySetup}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50 bg-slate-100 rounded cursor-pointer"
                      >
                        {addedUnitsInSession.length > 0 ? 'Finish Setup' : 'Done (Add Units Later)'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingUnit}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded border border-blue-700 cursor-pointer flex items-center space-x-1"
                      >
                        <Plus size={12} />
                        <span>{isSubmittingUnit ? 'Adding...' : (addedUnitsInSession.length > 0 ? 'Add Another Unit' : 'Add Unit')}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div>
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">
                    {propertyModal.editData ? 'Edit Commercial Property' : 'Add Commercial Property'}
                  </h3>
                  <button
                    disabled={isSubmittingProperty}
                    onClick={() => setPropertyModal({ open: false, editData: null })}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-50 text-sm font-semibold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveProperty} className="p-4 space-y-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Property Name</label>
                    <input
                      type="text"
                      required
                      value={propName}
                      onChange={(e) => setPropName(e.target.value)}
                      placeholder="e.g. Pacific Trade Center"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Address Location</label>
                    <input
                      type="text"
                      required
                      value={propAddress}
                      onChange={(e) => setPropAddress(e.target.value)}
                      placeholder="e.g. 100 Main St, Seattle, WA"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Building Type</label>
                    <select
                      value={propType}
                      onChange={(e) => setPropType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Office">Office Building</option>
                      <option value="Retail">Retail Storefront / Complex</option>
                      <option value="Industrial">Industrial / Warehouse</option>
                      <option value="Commercial">General Commercial</option>
                      <option value="Residential">Multi-family Residential</option>
                    </select>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Photo Image URL (Optional)</label>
                    <input
                      type="text"
                      value={propImageUrl}
                      onChange={(e) => setPropImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      disabled={isSubmittingProperty}
                      onClick={() => setPropertyModal({ open: false, editData: null })}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50 bg-slate-100 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingProperty}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded border border-blue-700 cursor-pointer"
                    >
                      {isSubmittingProperty 
                        ? (propertyModal.editData ? 'Saving...' : 'Creating...') 
                        : (propertyModal.editData ? 'Save Changes' : 'Create Property')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ========================================================
         MODAL: ADD/EDIT UNIT
         ======================================================== */}
      {unitModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                {unitModal.editData ? 'Edit Rental Unit' : 'Add Rental Unit'}
              </h3>
              <button
                disabled={isSubmittingUnit}
                onClick={() => setUnitModal({ open: false, editData: null })}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Unit Number / Suite</label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="e.g. Suite 202"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Unit Type</label>
                  <input
                    type="text"
                    required
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    placeholder="e.g. Office, Retail"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Size (Sq Ft)</label>
                  <input
                    type="number"
                    required
                    value={unitSize}
                    onChange={(e) => setUnitSize(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly Rent (Birr)</label>
                  <input
                    type="number"
                    required
                    value={unitRent}
                    onChange={(e) => setUnitRent(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Occupancy Status</label>
                <select
                  value={unitStatus}
                  onChange={(e) => setUnitStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Vacant">Vacant (Available)</option>
                  <option value="Occupied">Occupied (Leased)</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Maintenance">Under Maintenance</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSubmittingUnit}
                  onClick={() => setUnitModal({ open: false, editData: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUnit}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded border border-blue-700 cursor-pointer"
                >
                  {isSubmittingUnit
                    ? (unitModal.editData ? 'Saving...' : 'Adding...')
                    : (unitModal.editData ? 'Save Changes' : 'Add Unit')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          title={deleteConfirm.title}
          message={deleteConfirm.message}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDanger={true}
          onConfirm={() => {
            if (deleteConfirm.type === 'property') {
              deleteProperty(deleteConfirm.id);
            } else if (deleteConfirm.type === 'unit') {
              deleteUnit(deleteConfirm.id);
            }
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};
