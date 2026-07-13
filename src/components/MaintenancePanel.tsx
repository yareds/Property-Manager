import React, { useState } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  SlidersHorizontal, 
  User, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Clock, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { MaintenanceRequest, Unit, Property } from '../types';

interface MaintenancePanelProps {
  maintenance: MaintenanceRequest[];
  units: Unit[];
  properties: Property[];
  addMaintenance: (request: Omit<MaintenanceRequest, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMaintenance: (request: MaintenanceRequest) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;
}

export const MaintenancePanel: React.FC<MaintenancePanelProps> = ({
  maintenance,
  units,
  properties,
  addMaintenance,
  updateMaintenance,
  deleteMaintenance
}) => {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [requestModal, setRequestModal] = useState<{ open: boolean; editData: MaintenanceRequest | null }>({ open: false, editData: null });

  // Add/Edit request form fields
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
  const [status, setStatus] = useState<'New' | 'In Progress' | 'On Hold' | 'Completed'>('New');
  const [assignedContractor, setAssignedContractor] = useState('');
  const [cost, setCost] = useState<number>(0);

  // Filters calculation
  const filteredRequests = maintenance.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || m.priority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Total maintenance expenditure calculation
  const totalExpenditure = filteredRequests.reduce((sum, m) => sum + (m.cost || 0), 0);

  // Submit Handler
  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (requestModal.editData) {
      // EDIT MODE
      const updated: MaintenanceRequest = {
        ...requestModal.editData,
        title,
        description,
        priority,
        status,
        assignedContractor: assignedContractor || undefined,
        cost: Number(cost) || undefined,
      };
      await updateMaintenance(updated);
    } else {
      // NEW MODE
      if (!selectedUnitId || !title) return;
      const unit = units.find(u => u.id === selectedUnitId);
      if (!unit) return;
      
      const newRequest: Omit<MaintenanceRequest, 'createdAt' | 'updatedAt'> = {
        id: `maint-${Date.now()}`,
        propertyId: unit.propertyId,
        propertyName: unit.propertyName,
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        title,
        description,
        priority,
        status,
        assignedContractor: assignedContractor || undefined,
        cost: Number(cost) || 0,
      };
      await addMaintenance(newRequest);
    }

    setRequestModal({ open: false, editData: null });
    
    // Reset fields
    setSelectedUnitId('');
    setTitle('');
    setDescription('');
    setAssignedContractor('');
    setCost(0);
    setPriority('Medium');
    setStatus('New');
  };

  const openEditRequest = (m: MaintenanceRequest) => {
    setTitle(m.title);
    setDescription(m.description);
    setPriority(m.priority);
    setStatus(m.status);
    setAssignedContractor(m.assignedContractor || '');
    setCost(m.cost || 0);
    setRequestModal({ open: true, editData: m });
  };

  return (
    <div className="space-y-4">
      {/* Top dashboard summary and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Total Cost Display Card */}
        <div className="bg-slate-900 rounded border border-slate-800 p-3 text-white flex items-center space-x-3">
          <div className="p-1.5 bg-blue-500/15 rounded text-blue-400 border border-blue-500/20">
            <DollarSign size={14} />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Maintenance Outlays</span>
            <h4 className="text-lg font-bold tracking-tight">${totalExpenditure.toLocaleString()}</h4>
          </div>
        </div>

        {/* Search */}
        <div className="relative md:col-span-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search work orders by issue description, buildings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Toolbar filters and trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {/* Priority filter */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-600 font-bold">
            <SlidersHorizontal size={12} />
            <span className="uppercase text-[9px] tracking-wider text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Priorities</option>
              <option value="Emergency">Emergency Only</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-600 font-bold">
            <SlidersHorizontal size={12} />
            <span className="uppercase text-[9px] tracking-wider text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New Dispatch</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedUnitId('');
            setTitle('');
            setDescription('');
            setAssignedContractor('');
            setCost(0);
            setPriority('Medium');
            setStatus('New');
            setRequestModal({ open: true, editData: null });
          }}
          className="flex items-center space-x-1 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition cursor-pointer border border-blue-700"
        >
          <Plus size={14} />
          <span>New Work Order</span>
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded border border-slate-200 p-3.5 space-y-3 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            <div className="space-y-2">
              {/* Header: property details */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-slate-800">{m.propertyName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Suite: {m.unitNumber}</p>
                </div>

                <div className="flex items-center space-x-1">
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    m.priority === 'Emergency' ? 'bg-red-100 text-red-800' :
                    m.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                    m.priority === 'Medium' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {m.priority}
                  </span>
                </div>
              </div>

              {/* Title and Description */}
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-slate-800 leading-snug">{m.title}</h5>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{m.description}</p>
              </div>

              {/* Contractor info */}
              <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2 rounded border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Contractor:</span>
                  <span className="font-bold text-slate-800">{m.assignedContractor || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Work order cost:</span>
                  <span className="font-extrabold text-slate-800">Br {m.cost?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>

            {/* Footer controls */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className={`flex items-center space-x-1 font-bold text-[11px] ${
                m.status === 'Completed' ? 'text-emerald-600' :
                m.status === 'In Progress' ? 'text-blue-600' :
                m.status === 'On Hold' ? 'text-amber-600' :
                'text-slate-400'
              }`}>
                {m.status === 'Completed' ? <CheckCircle size={11} /> : <Clock size={11} />}
                <span>{m.status}</span>
              </span>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => openEditRequest(m)}
                  className="p-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[11px] border border-blue-100 cursor-pointer"
                >
                  Update Details
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this maintenance work order?')) {
                      deleteMaintenance(m.id);
                    }
                  }}
                  className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="col-span-full bg-white rounded border border-slate-200 p-8 text-center text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <Wrench size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No work orders recorded matching selection.</p>
          </div>
        )}
      </div>

      {/* ========================================================
         MODAL: ADD/EDIT WORK ORDER
         ======================================================== */}
      {requestModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                {requestModal.editData ? 'Update Work Order Status' : 'New Maintenance Dispatch'}
              </h3>
              <button
                onClick={() => setRequestModal({ open: false, editData: null })}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRequest} className="p-4 space-y-3">
              {/* Select unit if creating new */}
              {!requestModal.editData && (
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Suite / Space</label>
                  <select
                    required
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Unit --</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.propertyName} - {u.unitNumber}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Work Order Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Elevator electrical humming"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Problem Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the physical problem details in full..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Urgency Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Order Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="New">New Dispatch</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Contractor</label>
                  <input
                    type="text"
                    value={assignedContractor}
                    onChange={(e) => setAssignedContractor(e.target.value)}
                    placeholder="e.g. Rapid Plumbers"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cost (Birr)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRequestModal({ open: false, editData: null })}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 cursor-pointer"
                >
                  Save Dispatch
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
