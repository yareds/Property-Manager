import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDanger = true,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 rounded-lg ${isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                {isDanger ? <Trash2 size={18} /> : <AlertTriangle size={18} />}
              </div>
              <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            <p className="text-xs leading-relaxed text-slate-600 font-medium">
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition cursor-pointer shadow-2xs ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-700 border border-red-700'
                  : 'bg-blue-600 hover:bg-blue-700 border border-blue-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
