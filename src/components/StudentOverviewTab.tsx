import { BookOpen, UserCheck, CalendarX, CheckCircle2 } from 'lucide-react';
import type { Student } from '../data/studentsData';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'success';
}

function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const bg = {
    default: 'bg-white border-slate-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-red-50 border-red-200',
  };
  const iconColor = {
    default: 'text-slate-400',
    success: 'text-emerald-500',
    warning: 'text-red-500',
  };
  const valueColor = {
    default: 'text-slate-900',
    success: 'text-emerald-700',
    warning: 'text-red-700',
  };

  return (
    <div className={`flex flex-col gap-3 p-5 rounded-xl border ${bg[variant]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor[variant]}`} />
      </div>
      <p className={`text-base font-bold leading-tight ${valueColor[variant]}`}>{value}</p>
    </div>
  );
}

interface StudentOverviewTabProps {
  student: Student;
}

export function StudentOverviewTab({ student }: StudentOverviewTabProps) {
  const absenceVariant = student.absenceCount > 5 ? 'warning'
                       : student.absenceCount > 0 ? 'default'
                       : 'success';

  return (
    <div className="p-6">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
        Key Details
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Interview"
          value={student.interviewed ? 'Completed' : 'Not yet conducted'}
          icon={UserCheck}
          variant={student.interviewed ? 'success' : 'default'}
        />
        <StatCard
          label="Morrisby Profile"
          value={student.hasProfile ? 'Available' : 'Not available'}
          icon={BookOpen}
          variant={student.hasProfile ? 'success' : 'default'}
        />
        <StatCard
          label="Absences"
          value={`${student.absenceCount} recorded`}
          icon={CalendarX}
          variant={absenceVariant}
        />
        <StatCard
          label="Student Type"
          value={student.studentType}
          icon={CheckCircle2}
        />
      </div>
    </div>
  );
}
