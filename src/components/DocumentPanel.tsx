import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Tag, 
  Paperclip,
  CheckCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import { motion } from 'motion/react';
import { Document, Tenant } from '../types';

interface DocumentPanelProps {
  documents: Document[];
  tenants: Tenant[];
  addDocument: (doc: Omit<Document, 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

export const DocumentPanel: React.FC<DocumentPanelProps> = ({
  documents,
  tenants,
  addDocument,
  deleteDocument
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // New Document modal/state
  const [docModal, setDocModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Lease' | 'Insurance' | 'License' | 'Tax' | 'Inspection'>('Lease');
  const [associatedWith, setAssociatedWith] = useState<'Tenant' | 'Property' | 'General'>('Tenant');
  const [associatedId, setAssociatedId] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  // Filtering
  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    // Default placeholder URL if blank
    const docUrl = fileUrl || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&q=80';

    await addDocument({
      id: `doc-${Date.now()}`,
      name,
      category,
      associatedWith,
      associatedId: associatedId || 'General',
      fileUrl: docUrl,
    });

    setDocModal(false);
    setName('');
    setFileUrl('');
    setAssociatedId('');
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded text-xs text-slate-600 font-bold">
            <Tag size={12} />
            <span className="uppercase text-[9px] tracking-wider text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Categories</option>
              <option value="Lease">Leases</option>
              <option value="Insurance">Insurance Policies</option>
              <option value="License">Licenses</option>
              <option value="Tax">Tax Records</option>
              <option value="Inspection">Inspection Reports</option>
            </select>
          </div>

          <button
            onClick={() => setDocModal(true)}
            className="flex items-center justify-center space-x-1 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition border border-blue-700 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add File</span>
          </button>
        </div>
      </div>

      {/* Grid view of compliance documents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredDocs.map((d) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded border border-slate-200 p-3 space-y-3 flex flex-col justify-between hover:border-slate-300 transition duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="p-2 bg-blue-50 text-blue-600 rounded">
                  <FileText size={16} />
                </div>
                
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  d.category === 'Lease' ? 'bg-blue-100 text-blue-800' :
                  d.category === 'Insurance' ? 'bg-emerald-100 text-emerald-800' :
                  d.category === 'License' ? 'bg-amber-100 text-amber-800' :
                  d.category === 'Tax' ? 'bg-purple-100 text-purple-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {d.category}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-xs truncate" title={d.name}>{d.name}</h4>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {d.id}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
              <a
                href={d.fileUrl}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                className="flex items-center space-x-0.5 text-blue-600 hover:underline font-bold"
              >
                <span>View document</span>
                <ExternalLink size={10} />
              </a>

              <button
                onClick={() => {
                  if (confirm('Delete this compliance document permanently?')) {
                    deleteDocument(d.id);
                  }
                }}
                className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                title="Delete document"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </motion.div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="col-span-full bg-white rounded border border-slate-200 p-8 text-center text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <Folder size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No files found inside selection.</p>
          </div>
        )}
      </div>

      {/* ========================================================
         MODAL: ADD DOCUMENT
         ======================================================== */}
      {docModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <Paperclip size={14} className="text-blue-600" />
                <span>Upload Compliance Doc</span>
              </h3>
              <button
                onClick={() => setDocModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="p-4 space-y-3">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Document / File Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Starbucks General Liability Policy"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">File Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Lease">Lease Contract</option>
                    <option value="Insurance">Liability Insurance</option>
                    <option value="License">Business License</option>
                    <option value="Tax">Tax Records</option>
                    <option value="Inspection">Site Inspection</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Association</label>
                  <select
                    value={associatedWith}
                    onChange={(e) => setAssociatedWith(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Tenant">Associated with Tenant</option>
                    <option value="Property">Associated with Property</option>
                    <option value="General">General / Other</option>
                  </select>
                </div>
              </div>

              {associatedWith === 'Tenant' && (
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Select Business Tenant</label>
                  <select
                    value={associatedId}
                    onChange={(e) => setAssociatedId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.businessName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">File / Reference Link URL (Optional)</label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://example.com/starbucks_policy.pdf"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDocModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 cursor-pointer"
                >
                  Save Compliance File
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
