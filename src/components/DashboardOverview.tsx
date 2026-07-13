import React from 'react';
import { 
  Building, 
  Users, 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  Wrench, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { Property, Unit, Tenant, Lease, Payment, MaintenanceRequest } from '../types';

interface DashboardOverviewProps {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  payments: Payment[];
  maintenance: MaintenanceRequest[];
  onNavigate: (tab: string) => void;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  properties,
  units,
  tenants,
  leases,
  payments,
  maintenance,
  onNavigate
}) => {
  // 1. Metric Calculations
  const totalProperties = properties.length;
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.occupancyStatus === 'Occupied').length;
  const vacantUnits = units.filter(u => u.occupancyStatus === 'Vacant').length;
  const maintenanceUnits = units.filter(u => u.occupancyStatus === 'Maintenance').length;
  const reservedUnits = units.filter(u => u.occupancyStatus === 'Reserved').length;
  
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Monthly financials (current month: July 2026 based on mock local time)
  const currentMonthPayments = payments.filter(p => p.dueDate.startsWith('2026-07'));
  const expectedIncome = currentMonthPayments.reduce((sum, p) => sum + p.amountDue, 0);
  const collectedIncome = currentMonthPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  const outstandingRent = payments.filter(p => p.paymentStatus === 'Overdue' || p.paymentStatus === 'Unpaid' || p.paymentStatus === 'Partially Paid')
                                  .reduce((sum, p) => sum + (p.amountDue - p.amountPaid), 0);

  const upcomingExpirations = leases.filter(l => {
    if (l.status !== 'Active') return false;
    const end = new Date(l.endDate);
    const today = new Date('2026-07-04');
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 90;
  }).length;

  const activeMaintenance = maintenance.filter(m => m.status !== 'Completed').length;

  // 2. Chart Data preparation
  // Monthly collection trends (last 5 months + current month)
  const monthlyTrendsData = [
    { name: 'Feb 26', Expected: 44000, Collected: 44000, Overdue: 0 },
    { name: 'Mar 26', Expected: 46000, Collected: 45000, Overdue: 1000 },
    { name: 'Apr 26', Expected: 46000, Collected: 45200, Overdue: 800 },
    { name: 'May 26', Expected: 48800, Collected: 48800, Overdue: 0 },
    { name: 'Jun 26', Expected: 48800, Collected: 43400, Overdue: 5400 },
    { name: 'Jul 26', Expected: expectedIncome || 48800, Collected: collectedIncome || 20000, Overdue: outstandingRent || 28800 },
  ];

  // Occupancy Distribution Pie Data
  const occupancyData = [
    { name: 'Occupied', value: occupiedUnits },
    { name: 'Vacant', value: vacantUnits },
    { name: 'Maintenance', value: maintenanceUnits },
    { name: 'Reserved', value: reservedUnits },
  ].filter(d => d.value > 0);

  // Profitability by Property
  const propertyProfitability = properties.map(p => {
    const propUnits = units.filter(u => u.propertyId === p.id);
    const totalRentValue = propUnits.reduce((sum, u) => sum + u.monthlyRent, 0);
    const propMaintenanceCost = maintenance.filter(m => m.propertyId === p.id).reduce((sum, m) => sum + (m.cost || 0), 0);
    const propIncome = payments.filter(pay => pay.propertyId === p.id && pay.paymentStatus === 'Paid').reduce((sum, pay) => sum + pay.amountPaid, 0);

    return {
      name: p.name,
      RentRoll: totalRentValue,
      Collected: propIncome || (totalRentValue * 0.9), // approximate for mockup fallback
      Expenses: propMaintenanceCost,
      Net: (propIncome || (totalRentValue * 0.9)) - propMaintenanceCost
    };
  });

  return (
    <div id="dashboard-tab" className="space-y-4">
      {/* Top Banner / Welcome */}
      <div className="bg-[#0f172a] rounded p-4 text-white relative overflow-hidden border border-[#1e293b]">
        <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4">
          <Building size={200} />
        </div>
        <div className="relative z-10 space-y-1">
          <span className="bg-blue-500/20 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-400/10">
            Commercial Portfolio
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white">Portfolio Executive Dashboard</h1>
          <p className="text-slate-400 max-w-xl text-xs">
            Real-time visual monitoring of buildings, active lease timelines, maintenance expenditures, and monthly collection rates.
          </p>
        </div>
      </div>

      {/* Grid Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Occupancy */}
        <div 
          id="stat-occupancy" 
          onClick={() => onNavigate('properties')} 
          className="bg-white rounded p-4 border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Occupancy Rate</span>
            <div className="p-1.5 bg-emerald-50 rounded text-emerald-600">
              <Percent size={14} />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-[24px] font-bold text-slate-800 leading-none">{occupancyRate}%</span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({occupiedUnits}/{totalUnits} Units)
            </span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>

        {/* Card 2: Expected Income */}
        <div 
          id="stat-expected-income" 
          onClick={() => onNavigate('payments')} 
          className="bg-white rounded p-4 border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Collected (MTD)</span>
            <div className="p-1.5 bg-blue-50 rounded text-blue-600">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-[24px] font-bold text-slate-800 leading-none">Br {collectedIncome.toLocaleString()}</span>
            <span className="text-[11px] text-blue-500 font-medium">
              of Br {expectedIncome.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center space-x-1 text-[11px] text-slate-500">
            <TrendingUp size={12} className="text-emerald-500" />
            <span>{expectedIncome > 0 ? Math.round((collectedIncome / expectedIncome) * 100) : 0}% collected</span>
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div 
          id="stat-outstanding" 
          onClick={() => onNavigate('payments')} 
          className="bg-white rounded p-4 border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Outstanding Rent</span>
            <div className="p-1.5 bg-red-50 rounded text-red-600">
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-[24px] font-bold text-red-600 leading-none">Br {outstandingRent.toLocaleString()}</span>
            <span className="text-[11px] text-red-400 font-mono">Delinquent</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Requires manual dispatch follow-up</p>
        </div>

        {/* Card 4: Leases Expiring */}
        <div 
          id="stat-expiring" 
          onClick={() => onNavigate('leases')} 
          className="bg-white rounded p-4 border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Maintenance Jobs</span>
            <div className="p-1.5 bg-amber-50 rounded text-amber-600">
              <Clock size={14} />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-[24px] font-bold text-slate-800 leading-none">{activeMaintenance}</span>
            <span className="text-[11px] text-amber-600 font-medium">Pending Requests</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Action required to coordinate sites</p>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-white rounded p-4 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Rent Collection Trend</h3>
              <p className="text-[11px] text-slate-500">Monthly breakdown of expected vs. collected rent receipts</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">6-Month Ledger</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} />
                <Legend iconSize={8} verticalAlign="top" height={28} wrapperStyle={{ fontSize: '10px' }} />
                <Area type="monotone" dataKey="Expected" stroke="#3b82f6" fillOpacity={1} fill="url(#colorExpected)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="Collected" stroke="#10B981" fillOpacity={1} fill="url(#colorCollected)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Pie Chart */}
        <div className="bg-white rounded p-4 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-0.5">Occupancy Distribution</h3>
          <p className="text-[11px] text-slate-500 mb-2">Current unit allocation states</p>
          <div className="h-40 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={60}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend Overlay inside circle */}
            <div className="absolute text-center">
              <span className="text-2xl font-bold text-slate-800">{occupancyRate}%</span>
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Leased</p>
            </div>
          </div>
          {/* Custom Labels List */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {occupancyData.map((d, i) => (
              <div key={d.name} className="flex items-center space-x-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="text-slate-600 font-medium truncate">{d.name}</span>
                <span className="text-slate-400">({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property Profitability and Maintenance Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profitability Bar Chart */}
        <div className="bg-white rounded p-4 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Commercial Buildings Profitability</h3>
            <p className="text-[11px] text-slate-500">Gross Rent Roll vs. Maintenance Costs & Outlays</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyProfitability} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" fontSize={9} tickLine={false} stroke="#94A3B8" />
                <YAxis fontSize={9} tickLine={false} stroke="#94A3B8" />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '9px' }} />
                <Bar dataKey="RentRoll" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Rent Roll" />
                <Bar dataKey="Expenses" fill="#EF4444" radius={[2, 2, 0, 0]} name="Maintenance Cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Maintenance Work Order Summary & Quick Notifications */}
        <div className="bg-white rounded p-4 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Work Orders</h3>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                {activeMaintenance} Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Ongoing physical maintenance requests at portfolio complexes</p>

            <div className="space-y-2">
              {maintenance.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-start justify-between p-2.5 bg-slate-50 rounded border border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-slate-700">{m.propertyName}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{m.unitNumber}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-900">{m.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{m.description}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                      m.priority === 'Emergency' ? 'bg-red-100 text-red-800' :
                      m.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {m.priority}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700">Br {m.cost || 0}</span>
                  </div>
                </div>
              ))}
              {maintenance.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-[11px]">
                  <CheckCircle size={24} className="mx-auto text-slate-300 mb-1" />
                  No open maintenance items.
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => onNavigate('maintenance')}
            className="mt-3 w-full text-center py-2 text-[11px] font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition duration-150 cursor-pointer border border-blue-100"
          >
            Manage Work Orders
          </button>
        </div>
      </div>
    </div>
  );
};
