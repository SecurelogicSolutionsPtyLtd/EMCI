import React from 'react';
import { motion } from 'motion/react';
import type { MetricCardConfig } from '../lib/metricCards';

interface MetricCardGridProps {
  cards: MetricCardConfig[];
}

export function MetricCardGrid({ cards }: MetricCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
          className="flex flex-col gap-2 rounded-xl p-5 bg-white border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <p className="text-slate-900 text-3xl font-bold tracking-tight truncate" title={stat.displayValue ?? String(stat.value)}>
            {stat.displayValue ?? stat.value.toLocaleString('en-AU')}
          </p>
          <div className="h-1 w-full bg-slate-100 rounded-full mt-1">
            <motion.div
              className={`h-full ${stat.barColor} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${stat.barPct}%` }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
