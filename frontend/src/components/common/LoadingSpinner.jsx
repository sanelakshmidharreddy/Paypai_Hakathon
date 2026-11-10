import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-500">
      <Loader2 className={`${sizeClasses} animate-spin text-blue-600`} />
      {message && <span className="text-sm font-medium">{message}</span>}
    </div>
  );
}
