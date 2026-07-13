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
import { Property, Unit, Tenant } from '../types';

interface PropertyPanelProps {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
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
    if (!propName || !propAddress) return;

    if (propertyModal.editData) {
      await updateProperty({
        ...propertyModal.editData,
        name: propName,
        address: propAddress,
        type: propType,
        imageUrl: propImageUrl || undefined,
      });
    } else {
      await addProperty({
        id: `prop-${Date.now()}`,
        name: propName,
        address: propAddress,
        type: propType,
        imageUrl: propImageUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&h=250&q=80',
      });
    }
    setPropertyModal({ open: false, editData: null });
    // reset form
    setPropName('');
    setPropAddress('');
    setPropImageUrl('');
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
    if (!unitNumber || !selectedPropertyId || !selectedProperty) return;

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
        id: `unit-${Date.now()}`,
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
                const occupiedCount = propUnits.filter(u => u.occupancyStatus === 'Occupied').length;
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
                            if (confirm('Delete this building property and all references?')) {
                              deleteProperty(p.id);
                            }
                          }}
                          className="p-1 bg-white border border-slate-200 rounded text-red-600 hover:bg-red-50"
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
                      const activeTenant = tenants.find(t => t.id === u.tenantId);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-bold text-slate-800">{u.unitNumber}</td>
                          <td className="px-4 py-2 text-slate-500 text-xs">{u.type}</td>
                          <td className="px-4 py-2 text-right font-mono text-[11px]">{u.sizeSqFt.toLocaleString()} sqft</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800">Br {u.monthlyRent.toLocaleString()}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              u.occupancyStatus === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                              u.occupancyStatus === 'Vacant' ? 'bg-slate-100 text-slate-700' :
                              u.occupancyStatus === 'Reserved' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {u.occupancyStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {activeTenant ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{activeTenant.businessName}</span>
                                <span className="text-[9px] text-slate-400">{activeTenant.contactPerson}</span>
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
                                  if (confirm('Delete this unit?')) {
                                    deleteUnit(u.id);
                                  }
                                }}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-slate-100 rounded"
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
         MODAL: ADD/EDIT PROPERTY
         ======================================================== */}
      {propertyModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                {propertyModal.editData ? 'Edit Commercial Property' : 'Add Commercial Property'}
              </h3>
              <button
                onClick={() => setPropertyModal({ open: false, editData: null })}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
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
                  onClick={() => setPropertyModal({ open: false, editData: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 cursor-pointer"
                >
                  {propertyModal.editData ? 'Save Changes' : 'Create Property'}
                </button>
              </div>
            </form>
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
                onClick={() => setUnitModal({ open: false, editData: null })}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
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
                  onClick={() => setUnitModal({ open: false, editData: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 cursor-pointer"
                >
                  {unitModal.editData ? 'Save Changes' : 'Add Unit'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
