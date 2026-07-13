import React, { useState } from 'react';
import { 
  Building,
  DollarSign, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ArrowDownToLine, 
  Printer,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Payment, Lease, Tenant } from '../types';

interface PaymentPanelProps {
  payments: Payment[];
  leases: Lease[];
  addPayment: (payment: Omit<Payment, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePayment: (payment: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
}

export const PaymentPanel: React.FC<PaymentPanelProps> = ({
  payments,
  leases,
  addPayment,
  updatePayment,
  deletePayment
}) => {
  // Filters & States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [propertyFilter, setPropertyFilter] = useState<string>('ALL');

  // Modals state
  const [recordModal, setRecordModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState<{ open: boolean; payment: Payment | null }>({ open: false, payment: null });

  // Record Payment Form state
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amountDue, setAmountDue] = useState<number>(1000);
  const [amountPaid, setAmountPaid] = useState<number>(1000);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partially Paid' | 'Overdue' | 'Unpaid'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState('ACH/Direct Deposit');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Extract unique properties from active payments
  const propertiesInPayments = Array.from(new Set(payments.map(p => p.propertyName)));

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.paymentStatus === statusFilter;
    const matchesProperty = propertyFilter === 'ALL' || p.propertyName === propertyFilter;
    return matchesSearch && matchesStatus && matchesProperty;
  });

  // Handle Record/Add payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId || !dueDate) return;

    const lease = leases.find(l => l.id === selectedLeaseId);
    if (!lease) return;

    const receiptNum = `RCP-${Date.now().toString().slice(-6)}`;
    const newPayment: Omit<Payment, 'createdAt' | 'updatedAt'> = {
      id: `pay-${Date.now()}`,
      tenantId: lease.tenantId,
      businessName: lease.businessName,
      leaseId: lease.id,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      unitNumber: lease.unitNumber,
      dueDate,
      paymentDate: amountPaid > 0 ? new Date().toISOString().split('T')[0] : undefined,
      amountDue: Number(amountDue),
      amountPaid: Number(amountPaid),
      paymentStatus,
      paymentMethod: amountPaid > 0 ? paymentMethod : undefined,
      receiptNumber: amountPaid > 0 ? receiptNum : undefined,
      notes: paymentNotes,
    };

    await addPayment(newPayment);
    setRecordModal(false);
    
    // Reset Form
    setSelectedLeaseId('');
    setDueDate('');
    setPaymentNotes('');
  };

  // Quick mark a payment as fully Paid
  const handleQuickMarkPaid = async (p: Payment) => {
    const receiptNum = `RCP-${Date.now().toString().slice(-6)}`;
    const updated: Payment = {
      ...p,
      amountPaid: p.amountDue,
      paymentStatus: 'Paid',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'ACH/Direct Deposit',
      receiptNumber: receiptNum,
      updatedAt: new Date().toISOString()
    };
    await updatePayment(updated);
  };

  // EXPORT CSV (Excel-compatible report)
  const exportToCSV = () => {
    const headers = ['Receipt No', 'Business Name', 'Unit', 'Property', 'Due Date', 'Payment Date', 'Amount Due', 'Amount Paid', 'Status', 'Method'];
    const rows = filteredPayments.map(p => [
      p.receiptNumber || 'N/A',
      p.businessName,
      p.unitNumber,
      p.propertyName,
      p.dueDate,
      p.paymentDate || 'Pending',
      p.amountDue,
      p.amountPaid,
      p.paymentStatus,
      p.paymentMethod || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rent_Payment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments by tenant business or suite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded text-xs text-slate-600 font-bold">
            <SlidersHorizontal size={12} />
            <span className="uppercase text-[9px] tracking-wider text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Ledger</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Building filter */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded text-xs text-slate-600 font-bold">
            <SlidersHorizontal size={12} />
            <span className="uppercase text-[9px] tracking-wider text-slate-400">Property:</span>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Properties</option>
              {propertiesInPayments.map(pName => (
                <option key={pName} value={pName}>{pName}</option>
              ))}
            </select>
          </div>

          {/* Export button */}
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1 p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-xs text-slate-700 font-bold cursor-pointer"
            title="Export Excel report"
          >
            <ArrowDownToLine size={13} />
            <span>Export Excel</span>
          </button>

          {/* Record payment button */}
          <button
            onClick={() => setRecordModal(true)}
            className="flex items-center space-x-1 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition cursor-pointer border border-blue-700"
          >
            <Plus size={14} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Main ledger list */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Accounts Receivable Ledger</h3>
          <span className="text-[11px] text-slate-500 font-mono font-bold">Billing Cycles: {filteredPayments.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="px-4 py-2">Tenant & Suite</th>
                <th className="px-4 py-2">Billing Cycle</th>
                <th className="px-4 py-2 text-right">Rent Due</th>
                <th className="px-4 py-2 text-right">Rent Paid</th>
                <th className="px-4 py-2">Payment Method</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredPayments.map((p) => {
                const outstanding = p.amountDue - p.amountPaid;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    {/* Tenant and Suite */}
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{p.businessName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.propertyName} - Suite {p.unitNumber}</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                      <div className="flex flex-col">
                        <span>Due: {p.dueDate}</span>
                        {p.paymentDate && <span className="text-[9px] text-emerald-600 font-bold">Paid: {p.paymentDate}</span>}
                      </div>
                    </td>

                    {/* Rent Due */}
                    <td className="px-4 py-2 text-right font-bold text-slate-800">
                      Br {p.amountDue.toLocaleString()}
                    </td>

                    {/* Rent Paid */}
                    <td className="px-4 py-2 text-right font-bold">
                      <span className={p.amountPaid > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                        Br {p.amountPaid.toLocaleString()}
                      </span>
                      {outstanding > 0 && p.paymentStatus !== 'Unpaid' && (
                        <div className="text-[9px] text-red-500 font-mono">Bal: Br {outstanding.toLocaleString()}</div>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {p.paymentMethod || <span className="italic text-slate-300">Pending Receipt</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center justify-center w-28 mx-auto space-x-1 ${
                        p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        p.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                        p.paymentStatus === 'Overdue' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {p.paymentStatus === 'Paid' && <CheckCircle size={10} className="mr-0.5" />}
                        {p.paymentStatus === 'Overdue' && <AlertTriangle size={10} className="mr-0.5" />}
                        {p.paymentStatus === 'Partially Paid' && <Clock size={10} className="mr-0.5" />}
                        <span>{p.paymentStatus}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {p.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => handleQuickMarkPaid(p)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-1 px-1.5 rounded text-[11px] font-bold border border-emerald-100 cursor-pointer"
                            title="Fully Paid"
                          >
                            Mark Paid
                          </button>
                        )}
                        {p.paymentStatus === 'Paid' && p.receiptNumber && (
                          <button
                            onClick={() => setReceiptModal({ open: true, payment: p })}
                            className="flex items-center space-x-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 px-1.5 rounded text-[11px] font-bold border border-blue-100 cursor-pointer"
                            title="View / Print Receipt"
                          >
                            <FileText size={11} />
                            <span>Receipt</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete this payment transaction record?')) {
                              deletePayment(p.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-600 p-1 rounded cursor-pointer"
                          title="Delete transaction"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                    No payment transactions recorded inside selection criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
         MODAL: RECORD RENT PAYMENT
         ======================================================== */}
      {recordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <DollarSign size={14} className="text-emerald-600" />
                <span>Record Rent Receipt</span>
              </h3>
              <button
                onClick={() => setRecordModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-4 space-y-3">
              {/* Select active lease/tenant */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tenant & Occupied Unit</label>
                <select
                  required
                  value={selectedLeaseId}
                  onChange={(e) => {
                    setSelectedLeaseId(e.target.value);
                    const lease = leases.find(l => l.id === e.target.value);
                    if (lease) {
                      setAmountDue(lease.monthlyRent);
                      setAmountPaid(lease.monthlyRent);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Tenant/Suite --</option>
                  {leases.map(l => (
                    <option key={l.id} value={l.id}>{l.businessName} - {l.propertyName} ({l.unitNumber})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rent Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amount Due (Birr)</label>
                  <input
                    type="number"
                    required
                    value={amountDue}
                    onChange={(e) => setAmountDue(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amount Paid (Birr)</label>
                  <input
                    type="number"
                    required
                    value={amountPaid}
                    onChange={(e) => {
                      const paid = Number(e.target.value);
                      setAmountPaid(paid);
                      if (paid === 0) {
                        setPaymentStatus('Unpaid');
                      } else if (paid < amountDue) {
                        setPaymentStatus('Partially Paid');
                      } else {
                        setPaymentStatus('Paid');
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACH/Direct Deposit">ACH/Direct Deposit</option>
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash / Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Private Notes / Ledger memo</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Month of July 2026 rent payment memo"
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRecordModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 cursor-pointer"
                >
                  Record Receipt
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================
         MODAL: RECEIPT VISUALIZER & PRINTING
         ======================================================== */}
      {receiptModal.open && receiptModal.payment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header control */}
            <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono tracking-widest text-blue-400 uppercase">
                Official Transaction Receipt
              </span>
              <button
                onClick={() => setReceiptModal({ open: false, payment: null })}
                className="text-slate-300 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* Printable Area content */}
            <div id="receipt-print-area" className="p-4 space-y-4">
              {/* Receipt Header branding */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Building size={16} className="stroke-[2.5]" />
                    <span className="font-bold text-sm text-slate-900 tracking-tight">Getch ProManager</span>
                  </div>
                  <p className="text-[9px] text-slate-400 max-w-[200px]">
                    Bole Area, Hawassa, Ethiopia Commercial Leasing Office
                  </p>
                </div>
                
                <div className="text-right space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">RECEIPT</h4>
                  <p className="text-[10px] font-mono font-bold text-blue-600">{receiptModal.payment.receiptNumber}</p>
                  <p className="text-[9px] text-slate-400">Date: {receiptModal.payment.paymentDate}</p>
                </div>
              </div>

              {/* Bill To & Property Details */}
              <div className="grid grid-cols-2 gap-3 border-t border-b border-slate-200 py-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Tenant Business</span>
                  <p className="font-bold text-slate-800">{receiptModal.payment.businessName}</p>
                  <p className="text-slate-500 text-[11px]">Suite Ref: {receiptModal.payment.unitNumber}</p>
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Leased Premises</span>
                  <p className="font-bold text-slate-800">{receiptModal.payment.propertyName}</p>
                  <p className="text-slate-500 text-[11px]">Rent Due Cycle: {receiptModal.payment.dueDate}</p>
                </div>
              </div>

              {/* Pricing ledger Table */}
              <div className="space-y-1.5">
                <div className="bg-slate-50 p-2 rounded flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Billing Description</span>
                  <span>Amount</span>
                </div>

                <div className="space-y-1 text-xs px-2">
                  <div className="flex justify-between text-slate-700">
                    <span>Monthly Commercial Rental Fee ({receiptModal.payment.unitNumber})</span>
                    <span className="font-semibold">Br {receiptModal.payment.amountDue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600 border-t border-slate-200 pt-1.5 text-xs">
                    <span>Total Amount Paid ({receiptModal.payment.paymentMethod})</span>
                    <span>Br {receiptModal.payment.amountPaid.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Footer stamp */}
              <div className="bg-emerald-50 rounded p-3 flex items-center space-x-2 border border-emerald-100/50">
                <div className="p-1.5 bg-emerald-500 text-white rounded">
                  <Sparkles size={14} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Transaction Completed</p>
                  <p className="text-[9px] text-emerald-600">
                    Thank you for your business. Rent record synchronized with tenant lease schedule.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setReceiptModal({ open: false, payment: null })}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm cursor-pointer"
              >
                <Printer size={12} />
                <span>Print Receipt</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
