import React, { useState } from 'react';
import { 
  Building, 
  Users, 
  DollarSign, 
  FileText, 
  Wrench, 
  Folder, 
  Bell, 
  LogOut, 
  Sparkles, 
  FolderLock,
  Database,
  CheckCircle,
  Clock,
  Menu,
  X,
  Calendar,
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from './components/FirebaseProvider';
import { DashboardOverview } from './components/DashboardOverview';
import { PropertyPanel } from './components/PropertyPanel';
import { TenantPanel } from './components/TenantPanel';
import { LeasePanel } from './components/LeasePanel';
import { PaymentPanel } from './components/PaymentPanel';
import { MaintenancePanel } from './components/MaintenancePanel';
import { DocumentPanel } from './components/DocumentPanel';

export default function App() {
  const {
    user,
    authLoading,
    isGuest,
    properties,
    units,
    tenants,
    leases,
    payments,
    maintenance,
    notifications,
    documents,
    loading,
    login,
    logout,
    continueAsGuest,
    addProperty,
    updateProperty,
    deleteProperty,
    addUnit,
    updateUnit,
    deleteUnit,
    addTenant,
    updateTenant,
    deleteTenant,
    addLease,
    updateLease,
    deleteLease,
    addPayment,
    updatePayment,
    deletePayment,
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
    markNotificationAsRead,
    clearAllNotifications,
    addNotification,
    addDocument,
    deleteDocument,
    seedDatabase,
    clearAllData
  } = useFirebase();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMonthlyKey, setSelectedMonthlyKey] = useState<string | null>(null);

  // Server-side Compliance & App Check Status state
  const [backendAuditing, setBackendAuditing] = useState(false);
  const [backendAuditResult, setBackendAuditResult] = useState<{
    success: boolean;
    dispatchedCount?: number;
    timestamp?: string;
    error?: string;
  } | null>(null);

  const triggerBackendAudit = async () => {
    setBackendAuditing(true);
    setBackendAuditResult(null);
    try {
      const response = await fetch('/api/compliance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments,
          leases,
          userEmail: user?.email || 'yared.abegaz@gmail.com',
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setBackendAuditResult({
          success: true,
          dispatchedCount: data.dispatchedNotifications?.length || 0,
          timestamp: data.auditTimestamp,
        });
        
        // Dispatch notifications from server audit securely to the client
        if (data.dispatchedNotifications && data.dispatchedNotifications.length > 0) {
          for (const notif of data.dispatchedNotifications) {
            if (!notifications.some(n => n.id === notif.id)) {
              await addNotification({
                id: notif.id,
                title: notif.title,
                message: notif.message,
                type: notif.type,
                status: notif.status,
                userId: user?.uid || 'guest-user',
              });
            }
          }
        }
      } else {
        setBackendAuditResult({
          success: false,
          error: data.error || 'Server rejected audit request',
        });
      }
    } catch (err: any) {
      setBackendAuditResult({
        success: false,
        error: err.message || 'Server connection failed',
      });
    } finally {
      setBackendAuditing(false);
    }
  };

  // Filter notifications: rent dues must be rent_overdue only, and only when near lease renewal (within 30 days of end date).
  const filteredNotifications = notifications.filter(n => {
    if (n.type === 'payment_received') {
      // payment_received is a rent due/payment notification but it's not overdue! So hide it.
      return false;
    }
    if (n.type === 'rent_overdue') {
      const lease = leases.find(l => 
        n.message.toLowerCase().includes(l.businessName.toLowerCase()) ||
        n.title.toLowerCase().includes(l.businessName.toLowerCase()) ||
        l.businessName.toLowerCase().includes(n.title.toLowerCase())
      );
      if (!lease) return false;
      const end = new Date(lease.endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30; // near lease renewal
    }
    return true; // Keep other notifications (lease_expiration, system, document_expiry, etc.)
  });

  // Unread notification count using filtered notifications
  const unreadNotifs = filteredNotifications.filter(n => n.status === 'Unread');

  // Extract events grouped by month (reverse chronological)
  const getMonthlyEvents = () => {
    const monthlyData: Record<string, {
      monthKey: string;
      displayLabel: string;
      paymentsCount: number;
      leasesCount: number;
      maintenanceCount: number;
      notificationsCount: number;
      totalAlerts: number;
      items: Array<{
        id: string;
        type: 'Payment' | 'Lease' | 'Maintenance' | 'Notification';
        title: string;
        description: string;
        status: string;
        date: string;
        severity: 'info' | 'warning' | 'error' | 'success';
      }>;
    }> = {};

    const addEvent = (
      dateStr: string,
      type: 'Payment' | 'Lease' | 'Maintenance' | 'Notification',
      id: string,
      title: string,
      description: string,
      status: string,
      severity: 'info' | 'warning' | 'error' | 'success'
    ) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      const displayLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          monthKey,
          displayLabel,
          paymentsCount: 0,
          leasesCount: 0,
          maintenanceCount: 0,
          notificationsCount: 0,
          totalAlerts: 0,
          items: [],
        };
      }

      monthlyData[monthKey].items.push({
        id,
        type,
        title,
        description,
        status,
        date: dateStr,
        severity,
      });

      if (type === 'Payment') monthlyData[monthKey].paymentsCount++;
      if (type === 'Lease') monthlyData[monthKey].leasesCount++;
      if (type === 'Maintenance') monthlyData[monthKey].maintenanceCount++;
      if (type === 'Notification') monthlyData[monthKey].notificationsCount++;
      monthlyData[monthKey].totalAlerts++;
    };

    // 1. System Notifications (using filteredNotifications)
    filteredNotifications.forEach(n => {
      let severity: 'info' | 'warning' | 'error' | 'success' = 'info';
      const typeLower = (n.type || '').toLowerCase();
      if (typeLower.includes('overdue')) severity = 'error';
      else if (typeLower.includes('paid') || typeLower.includes('received')) severity = 'success';
      
      addEvent(n.createdAt, 'Notification', n.id, n.title, n.message, n.status, severity);
    });

    // 2. Overdue Payments (Only show rent dues notification when near lease renewal and overdue only)
    payments.forEach(p => {
      if (p.paymentStatus === 'Overdue') {
        const lease = leases.find(l => l.id === p.leaseId);
        if (lease) {
          const end = new Date(lease.endDate);
          const now = new Date();
          const diffTime = end.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 30) {
            addEvent(
              p.dueDate,
              'Payment',
              p.id,
              `Rent Overdue: ${p.businessName}`,
              `Unit ${p.unitNumber} rent of Br ${p.amountDue.toLocaleString()} is Overdue (Lease near renewal).`,
              p.paymentStatus,
              'error'
            );
          }
        }
      }
    });

    // 3. Leases Expiring / Active
    leases.forEach(l => {
      const end = new Date(l.endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (l.status === 'Active' || l.status === 'Pending') {
        const title = diffDays < 0 ? `Lease Expired: ${l.businessName}` : `Lease Expiry: ${l.businessName}`;
        const desc = `Lease for Unit ${l.unitNumber} is ending on ${new Date(l.endDate).toLocaleDateString()}.`;
        const severity = diffDays < 0 ? 'error' : (diffDays <= 30 ? 'warning' : 'info');
        
        addEvent(l.endDate, 'Lease', l.id, title, desc, l.status, severity);
      }
    });

    // 4. Pending Maintenance Requests
    maintenance.forEach(m => {
      if (m.status !== 'Completed' && m.status !== 'Resolved') {
        const severity = m.priority === 'High' || m.priority === 'Emergency' ? 'error' : 'warning';
        addEvent(
          m.createdAt,
          'Maintenance',
          m.id,
          `Maintenance: ${m.title}`,
          `Unit ${m.unitNumber} is ${m.status} (${m.priority} priority).`,
          m.status,
          severity
        );
      }
    });

    // Sort items inside each month by date descending
    Object.values(monthlyData).forEach(m => {
      m.items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    // Sort months descending and filter to only include the current month and next 2 months (upcoming three months)
    const sortedGroups = Object.values(monthlyData).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    
    const todayObj = new Date();
    const currentYr = todayObj.getFullYear();
    const currentMo = todayObj.getMonth();
    const allowedMonthKeys: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(currentYr, currentMo + i, 1);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      allowedMonthKeys.push(`${yr}-${mo}`);
    }

    return sortedGroups.filter(g => allowedMonthKeys.includes(g.monthKey));
  };

  const monthlyGroups = getMonthlyEvents();
  const selectedMonthData = monthlyGroups.find(m => m.monthKey === selectedMonthlyKey);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <Building className="absolute text-indigo-400" size={18} />
        </div>
        <p className="text-xs font-mono tracking-wider uppercase text-slate-400 animate-pulse">
          Authenticating Landlord Session...
        </p>
      </div>
    );
  }

  // ONBOARDING / LOGIN SCREEN
  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-8 shadow-2xl relative z-10"
        >
          {/* Logo */}
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 bg-indigo-500/15 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <Building size={32} className="stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">GETCH Property Management App</h1>
              <p className="text-xs text-slate-400 font-medium">Real Estate Asset Lease Management</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Secure cloud-based system to manage commercial properties, track tenant leases, record rent receipts, and log site maintenance schedules.
          </p>

          {/* Buttons */}
          <div className="space-y-3 pt-2">
            <button
              id="btn-login-google"
              onClick={login}
              className="w-full flex items-center justify-center space-x-2.5 bg-indigo-600 text-white hover:bg-indigo-700 py-3 rounded-xl font-semibold text-xs tracking-wide uppercase transition duration-150 shadow-lg shadow-indigo-600/15"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.466 1 0 6.36 0 13s5.466 12 12.24 12c7.05 0 11.75-4.853 11.75-11.714 0-.789-.08-1.393-.18-2H12.24z"/>
              </svg>
              <span>Connect Google Account</span>
            </button>

            <button
              id="btn-continue-guest"
              onClick={continueAsGuest}
              className="w-full flex items-center justify-center bg-slate-800 text-slate-300 hover:bg-slate-700 py-3 rounded-xl font-semibold text-xs tracking-wide uppercase transition duration-150 border border-slate-700/60"
            >
              <span>Explore as Guest Session</span>
            </button>
          </div>

          {/* Security stamp */}
          <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-500 font-mono">
            <FolderLock size={12} />
            <span>Encrypted cloud session active</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // NAVIGATION ITEMS LIST
  const navItems = [
    { id: 'dashboard', label: 'Executive Deck', icon: Building },
    { id: 'properties', label: 'Buildings & Units', icon: Building },
    { id: 'tenants', label: 'Tenant Directory', icon: Users },
    { id: 'leases', label: 'Lease Tracker', icon: FileText },
    { id: 'payments', label: 'Rent Payments', icon: DollarSign },
    { id: 'maintenance', label: 'Maintenance Hub', icon: Wrench },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col md:flex-row font-sans">
      
      {/* ========================================================
         SIDEBAR: DESKTOP NAVIGATION
         ======================================================== */}
      <aside className="hidden md:flex flex-col w-[220px] bg-[#0f172a] text-[#cbd5e1] shrink-0 border-r border-[#1e293b] justify-between">
        <div className="flex flex-col">
          {/* Top-Left Corner Logout */}
          <div className="px-6 py-3.5 border-b border-[#1e293b]/60 flex items-center justify-between bg-slate-950/20">
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 text-slate-400 hover:text-red-400 transition text-[11px] font-bold cursor-pointer"
            >
              <LogOut size={11} />
              <span>Logout</span>
            </button>
            <span className="text-[9px] text-slate-500 font-mono truncate max-w-[100px]" title={user?.email || 'Guest'}>
              {user?.email || 'Guest'}
            </span>
          </div>

          {/* Header */}
          <div className="px-6 py-[24px] border-b border-[#1e293b] flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white">
              <Building size={16} className="stroke-[2.5] text-blue-500" />
              <span className="font-bold text-[16px] tracking-tight text-white font-sans">GETCH Property Management App</span>
            </div>
            {isGuest && (
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold border border-slate-700">
                GUEST
              </span>
            )}
          </div>

          {/* Navigation link group */}
          <nav className="mt-5 space-y-[1px]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-6 py-3 border-l-3 transition-colors text-[13px] text-left cursor-pointer ${
                    isActive 
                      ? 'bg-[#1e293b] text-[#f8fafc] border-l-[#3b82f6]' 
                      : 'text-[#cbd5e1] border-l-transparent hover:bg-[#1e293b] hover:text-[#f8fafc]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Monthly Alerts Menu */}
          <div className="px-6 mt-6 pt-5 border-t border-slate-800/60">
            <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase flex items-center space-x-1.5">
              <Calendar size={11} className="text-blue-400" />
              <span>Monthly Alerts</span>
            </span>
            <div className="mt-2.5 space-y-1 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800/80">
              {monthlyGroups.map((group) => {
                const totalItems = group.items.length;
                const hasErrors = group.items.some(i => i.severity === 'error');
                const hasWarnings = group.items.some(i => i.severity === 'warning');
                
                let dotColor = 'bg-slate-500';
                if (hasErrors) dotColor = 'bg-red-500';
                else if (hasWarnings) dotColor = 'bg-amber-500';
                else if (totalItems > 0) dotColor = 'bg-emerald-500';

                return (
                  <button
                    key={group.monthKey}
                    onClick={() => setSelectedMonthlyKey(group.monthKey)}
                    className="w-full flex items-center justify-between p-2 rounded text-[12px] text-left hover:bg-slate-800/50 transition group cursor-pointer text-slate-300 hover:text-white"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0`} />
                      <span className="font-medium truncate">{group.displayLabel}</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold group-hover:bg-slate-700">
                      {totalItems}
                    </span>
                  </button>
                );
              })}
              {monthlyGroups.length === 0 && (
                <div className="text-[11px] text-slate-600 italic py-2">
                  No monthly logs.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User profile & controls */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
          {user && (
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center space-x-2 truncate">
                <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[11px] border border-white/10 shrink-0">
                  {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'L'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[11px] font-bold text-white truncate">{user.displayName || 'Administrator'}</span>
                  <span className="text-[9px] text-slate-400 truncate font-mono">{user.email}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          {isGuest && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 px-1 py-1">
                <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center font-extrabold text-white text-[11px] border border-white/10">
                  G
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[11px] font-bold text-white truncate">Guest Session</span>
                  <span className="text-[9px] text-slate-400 truncate font-mono">Offline-first Mode</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={seedDatabase}
                  className="py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/20 text-indigo-300 rounded text-[9px] font-bold tracking-wide uppercase transition duration-150 flex items-center justify-center space-x-1 cursor-pointer"
                  title="Populate/Reset default lease & properties lists"
                >
                  <Sparkles size={10} className="text-indigo-400" />
                  <span>Populate</span>
                </button>
                <button
                  onClick={clearAllData}
                  className="py-1.5 px-2 bg-red-950/30 hover:bg-red-950/50 border border-red-500/15 text-red-300 rounded text-[9px] font-bold tracking-wide uppercase transition duration-150 flex items-center justify-center space-x-1 cursor-pointer"
                  title="Clear all local structures"
                >
                  <X size={10} className="text-red-400" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 font-mono text-center pt-1 opacity-60">
            v2.4.0 High-Density Edition
          </div>
        </div>
      </aside>

      {/* ========================================================
         MOBILE: TOP BAR AND DRAWER
         ======================================================== */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white p-4 shrink-0 shadow-lg relative z-40">
        <div className="flex items-center space-x-2">
          <button
            onClick={logout}
            className="p-1.5 mr-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
          <Building size={18} className="text-indigo-400" />
          <span className="font-extrabold text-xs uppercase tracking-wider">GETCH Property Management App</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications button */}
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-1.5 relative hover:bg-slate-800 rounded"
          >
            <Bell size={16} />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 hover:bg-slate-800 rounded text-white"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-900 border-b border-slate-800 text-white relative z-30 overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs font-bold ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {/* Monthly Alerts for Mobile */}
              <div className="pt-4 border-t border-slate-800">
                <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase flex items-center space-x-1.5 px-2 mb-2">
                  <Calendar size={11} className="text-blue-400" />
                  <span>Monthly Alerts</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {monthlyGroups.map((group) => {
                    const totalItems = group.items.length;
                    const hasErrors = group.items.some(i => i.severity === 'error');
                    const hasWarnings = group.items.some(i => i.severity === 'warning');
                    
                    let dotColor = 'bg-slate-500';
                    if (hasErrors) dotColor = 'bg-red-500';
                    else if (hasWarnings) dotColor = 'bg-amber-500';
                    else if (totalItems > 0) dotColor = 'bg-emerald-500';

                    return (
                      <button
                        key={group.monthKey}
                        onClick={() => {
                          setSelectedMonthlyKey(group.monthKey);
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center justify-between p-2 rounded bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0`} />
                          <span className="font-medium truncate">{group.displayLabel}</span>
                        </div>
                        <span className="text-[10px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                          {totalItems}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                <span className="text-[10px] text-slate-500 font-mono">ID: {user?.email || 'Guest'}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
         MAIN LAYOUT AREA & SUB-PANELS
         ======================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f1f5f9]">
        
        {/* Top bar header */}
        <header className="hidden md:flex items-center justify-between bg-white px-6 h-16 border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Active Workspace &rarr;</span>
            <span className="text-[11px] font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {navItems.find(n => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Real-time sync status indicator */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-[11px]">Live Sync</span>
            </div>

            {/* Notifications Alert Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-slate-600 transition relative"
                title="Compliance alerts"
              >
                <Bell size={15} />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifMenu && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotifMenu(false)}></div>
                    
                    {/* Popover Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded shadow-lg border border-slate-200 z-20 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">Compliance & Alerts Hub</span>
                        {unreadNotifs.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            className="text-[9px] text-red-500 hover:underline font-bold"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {filteredNotifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              if (n.type === 'Lease') handleTabChange('leases');
                              if (n.type === 'Payment') handleTabChange('payments');
                              if (n.type === 'Maintenance') handleTabChange('maintenance');
                              setShowNotifMenu(false);
                            }}
                            className={`p-2.5 text-[11px] hover:bg-slate-50/50 cursor-pointer flex items-start space-x-2 transition ${
                              n.status === 'Unread' ? 'bg-indigo-50/20 border-l-2 border-indigo-500' : ''
                            }`}
                          >
                            <span className="p-0.5 bg-indigo-50 text-indigo-600 rounded">
                              <Bell size={11} />
                            </span>
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-800">{n.title}</p>
                              <p className="text-slate-400 text-[9px] leading-relaxed">{n.message}</p>
                              <span className="text-[8px] text-slate-300 font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}

                        {filteredNotifications.length === 0 && (
                          <div className="p-4 text-center text-slate-400 italic text-[11px]">
                            No notifications dispatched. All portfolios compliant.
                          </div>
                        )}
                      </div>

                      {/* Backend Security Audit Action */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Secured Server Sync</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Run real-time compliance checking on safe cloud environments to identify anomalies.
                        </p>
                        
                        {backendAuditResult && (
                          <div className={`p-2 rounded text-[10px] ${
                            backendAuditResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
                          }`}>
                            {backendAuditResult.success ? (
                              <p>
                                <strong>Audit Complete:</strong> Portfolios synchronized. Found {backendAuditResult.dispatchedCount} issues requiring action.
                              </p>
                            ) : (
                              <p><strong>Audit Failed:</strong> {backendAuditResult.error}</p>
                            )}
                          </div>
                        )}

                        <button
                          onClick={triggerBackendAudit}
                          disabled={backendAuditing}
                          className="w-full text-center py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded transition disabled:opacity-50 cursor-pointer"
                        >
                          {backendAuditing ? 'Auditing and Securing...' : 'Trigger Secure Backend Audit'}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic content canvas */}
        <div className="flex-1 p-4 md:p-5 overflow-y-auto max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-xs font-mono">Synchronizing live portfolio tables...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Actual Sub-Panels Selection */}
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  properties={properties}
                  units={units}
                  tenants={tenants}
                  leases={leases}
                  payments={payments}
                  maintenance={maintenance}
                  onNavigate={handleTabChange}
                  isGuest={isGuest}
                  onSeed={seedDatabase}
                />
              )}

              {activeTab === 'properties' && (
                <PropertyPanel
                  properties={properties}
                  units={units}
                  tenants={tenants}
                  addProperty={addProperty}
                  updateProperty={updateProperty}
                  deleteProperty={deleteProperty}
                  addUnit={addUnit}
                  updateUnit={updateUnit}
                  deleteUnit={deleteUnit}
                />
              )}

              {activeTab === 'tenants' && (
                <TenantPanel
                  tenants={tenants}
                  leases={leases}
                  documents={documents}
                  addTenant={addTenant}
                  updateTenant={updateTenant}
                  deleteTenant={deleteTenant}
                />
              )}

              {activeTab === 'leases' && (
                <LeasePanel
                  leases={leases}
                  tenants={tenants}
                  units={units}
                  properties={properties}
                  addLease={addLease}
                  updateLease={updateLease}
                  deleteLease={deleteLease}
                  updateUnit={updateUnit}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentPanel
                  payments={payments}
                  leases={leases}
                  addPayment={addPayment}
                  updatePayment={updatePayment}
                  deletePayment={deletePayment}
                />
              )}

              {activeTab === 'maintenance' && (
                <MaintenancePanel
                  maintenance={maintenance}
                  units={units}
                  properties={properties}
                  addMaintenance={addMaintenance}
                  updateMaintenance={updateMaintenance}
                  deleteMaintenance={deleteMaintenance}
                />
              )}

              {activeTab === 'documents' && (
                <DocumentPanel
                  documents={documents}
                  tenants={tenants}
                  addDocument={addDocument}
                  deleteDocument={deleteDocument}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Monthly Alerts Inspection Modal */}
      <AnimatePresence>
        {selectedMonthlyKey && selectedMonthData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMonthlyKey(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedMonthData.displayLabel} Alerts</h3>
                    <p className="text-[11px] text-slate-500">
                      Total events: {selectedMonthData.totalAlerts} • {selectedMonthData.items.filter(i => i.severity === 'error').length} urgent
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMonthlyKey(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Event List */}
              <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
                {selectedMonthData.items.map((item, idx) => {
                  let IconComponent = Bell;
                  let iconBg = 'bg-slate-50 text-slate-500';
                  
                  if (item.type === 'Payment') {
                    IconComponent = DollarSign;
                    iconBg = 'bg-emerald-50 text-emerald-600';
                  } else if (item.type === 'Lease') {
                    IconComponent = FileText;
                    iconBg = 'bg-blue-50 text-blue-600';
                  } else if (item.type === 'Maintenance') {
                    IconComponent = Wrench;
                    iconBg = 'bg-orange-50 text-orange-600';
                  }

                  let severityBadge = '';
                  if (item.severity === 'error') {
                    severityBadge = 'bg-red-50 text-red-700 border-red-100';
                  } else if (item.severity === 'warning') {
                    severityBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                  } else if (item.severity === 'success') {
                    severityBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  } else {
                    severityBadge = 'bg-slate-50 text-slate-700 border-slate-100';
                  }

                  return (
                    <div key={`${item.id}-${idx}`} className="py-4 first:pt-0 last:pb-0 flex items-start space-x-3.5 group">
                      <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
                        <IconComponent size={16} />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition">
                            {item.title}
                          </h4>
                          <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded border ${severityBadge}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                          <span>{new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                          
                          <button
                            onClick={() => {
                              if (item.type === 'Payment') handleTabChange('payments');
                              else if (item.type === 'Lease') handleTabChange('leases');
                              else if (item.type === 'Maintenance') handleTabChange('maintenance');
                              else handleTabChange('dashboard');
                              setSelectedMonthlyKey(null);
                            }}
                            className="text-blue-500 hover:text-blue-700 hover:underline flex items-center space-x-0.5 cursor-pointer font-bold"
                          >
                            <span>Manage</span>
                            <ChevronRight size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {selectedMonthData.items.length === 0 && (
                  <div className="py-12 text-center text-slate-400 italic text-xs">
                    No active notifications or alerts recorded for this month.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  onClick={() => setSelectedMonthlyKey(null)}
                  className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-bold transition shadow"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
