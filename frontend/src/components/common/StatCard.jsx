import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendPositive,
  colorScheme = 'blue',
}) {
  const colorMaps = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100',
    },
    slate: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
    },
  };

  const scheme = colorMaps[colorScheme] || colorMaps.blue;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${scheme.bg} ${scheme.text} ${scheme.border} border`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {(subtext || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && (
              <span className={`font-semibold ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend}
              </span>
            )}
            {subtext && <span className="text-slate-500">{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
