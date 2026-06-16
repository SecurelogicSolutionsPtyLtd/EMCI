import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Award, CheckCircle2, Clock, Users } from 'lucide-react';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { programmeProgressPct, programmeProgressStep } from './stageProgress';

export interface MetricCardConfig {
  label: string;
  value: number;
  displayValue?: string;
  icon: LucideIcon;
  iconColor: string;
  barColor: string;
  barPct: number;
}

const STAGE_LABELS: Record<string, string> = {
  referral:        'Referral',
  consent:         'Consent',
  career_guidance: 'Career Guidance',
  complete:        'Job Ready',
};

export function buildSchoolMetricCards(
  total: number,
  active: number,
  inProgress: number,
  completed: number,
): MetricCardConfig[] {
  return [
    {
      label: 'Total Students',
      value: total,
      icon: Users,
      iconColor: 'text-primary/60',
      barColor: 'bg-primary',
      barPct: 100,
    },
    {
      label: 'Active',
      value: active,
      icon: CheckCircle2,
      iconColor: 'text-emerald-500/60',
      barColor: 'bg-emerald-500',
      barPct: total > 0 ? Math.round((active / total) * 100) : 0,
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: Clock,
      iconColor: 'text-blue-500/60',
      barColor: 'bg-blue-500',
      barPct: total > 0 ? Math.round((inProgress / total) * 100) : 0,
    },
    {
      label: 'Completed',
      value: completed,
      icon: Award,
      iconColor: 'text-amber-500/60',
      barColor: 'bg-amber-500',
      barPct: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  ];
}

export function buildStudentMetricCards(
  student: Student,
  events: TimelineEvent[] = [],
): MetricCardConfig[] {
  const progressPct = programmeProgressPct(student.stageProgress);
  const sessionCount = events.filter(e => e.type === 'session').length;
  const stageLabel = student.currentStage
    ? (STAGE_LABELS[student.currentStage] ?? student.currentStage)
    : 'Not started';

  return [
    {
      label: 'Programme Progress',
      value: progressPct,
      displayValue: `${progressPct}%`,
      icon: Clock,
      iconColor: 'text-blue-500/60',
      barColor: 'bg-blue-500',
      barPct: progressPct,
    },
    {
      label: 'Absences',
      value: student.absenceCount,
      icon: AlertTriangle,
      iconColor: student.riskLevel !== 'none' ? 'text-amber-500/80' : 'text-slate-400',
      barColor: student.riskLevel !== 'none' ? 'bg-amber-500' : 'bg-slate-300',
      barPct: Math.min(student.absenceCount * 25, 100),
    },
    {
      label: 'Guidance Sessions',
      value: sessionCount,
      icon: Users,
      iconColor: 'text-primary/60',
      barColor: 'bg-primary',
      barPct: sessionCount > 0 ? Math.min(Math.round((sessionCount / 4) * 100), 100) : 0,
    },
    {
      label: 'Current Stage',
      value: programmeProgressStep(student.stageProgress),
      displayValue: stageLabel,
      icon: Award,
      iconColor: student.currentStage === 'complete' ? 'text-emerald-500/60' : 'text-amber-500/60',
      barColor: student.currentStage === 'complete' ? 'bg-emerald-500' : 'bg-amber-500',
      barPct: progressPct,
    },
  ];
}
