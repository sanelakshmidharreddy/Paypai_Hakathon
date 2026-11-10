import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertOctagon, 
  CreditCard, 
  Ban,
  HelpCircle 
} from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  const normStatus = (status || 'UNKNOWN').toUpperCase();

  const configs = {
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    APPROVED: {
      label: 'Buyer Approved',
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
      icon: Clock,
    },
    CREATED: {
      label: 'Created',
      bg: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
      icon: Clock,
    },
    PENDING: {
      label: 'Pending Settlement',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      icon: Clock,
    },
    DECLINED: {
      label: 'Card Declined',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      icon: CreditCard,
    },
    FAILED: {
      label: 'Payment Failed',
      bg: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500',
      icon: AlertOctagon,
    },
    CANCELLED: {
      label: 'Buyer Cancelled',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      icon: Ban,
    },
    UNKNOWN: {
      label: 'Unknown',
      bg: 'bg-zinc-100 text-zinc-600 border-zinc-200',
      dot: 'bg-zinc-400',
      icon: HelpCircle,
    },
  };

  const current = configs[normStatus] || configs.UNKNOWN;
  const IconComponent = current.icon;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : size === 'lg'
    ? 'px-3 py-1.5 text-sm font-semibold'
    : 'px-2.5 py-1 text-xs font-medium';

  const iconSizes = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${current.bg} ${sizeClasses}`}>
      <IconComponent className={`${iconSizes} shrink-0`} />
      <span>{current.label}</span>
    </span>
  );
}

