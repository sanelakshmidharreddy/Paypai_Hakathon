import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function AlertBanner({
  type = 'info',
  title,
  message,
  onClose,
  action,
}) {
  const styles = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: Info,
      iconColor: 'text-blue-500',
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: CheckCircle,
      iconColor: 'text-emerald-500',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: AlertCircle,
      iconColor: 'text-rose-500',
    },
  };

  const current = styles[type] || styles.info;
  const IconComponent = current.icon;

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${current.bg}`}>
      <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${current.iconColor}`} />
      <div className="flex-1 text-sm">
        {title && <div className="font-semibold text-slate-900 mb-0.5">{title}</div>}
        <div className="text-slate-700">{message}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

