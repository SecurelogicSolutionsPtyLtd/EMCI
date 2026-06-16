import {
  Briefcase, GraduationCap, Target, Compass, Sparkles, Star,
  Music, Palette, Camera, PenTool, Mic, Gamepad2,
  Dumbbell, Trophy, UtensilsCrossed, ChefHat, Coffee, ShoppingBag,
  Flame, Stethoscope, HeartPulse, Laptop, Code, Cpu,
  Hammer, Wrench, HardHat, PawPrint, FlaskConical, Microscope,
  Leaf, Sprout, Car, Truck, Plane, Banknote, Calculator,
  Scale, Scissors, BookOpen, Baby, Newspaper,
  type LucideIcon,
} from 'lucide-react';
import type { AnalysisHighlight, HighlightIconKey } from '../lib/analysisHighlights';

const ICON_MAP: Record<HighlightIconKey, LucideIcon> = {
  'briefcase':      Briefcase,
  'graduation-cap': GraduationCap,
  'target':         Target,
  'compass':        Compass,
  'sparkles':       Sparkles,
  'star':           Star,
  'music':          Music,
  'palette':        Palette,
  'camera':         Camera,
  'pen-tool':       PenTool,
  'mic':            Mic,
  'gamepad':        Gamepad2,
  'dumbbell':       Dumbbell,
  'trophy':         Trophy,
  'utensils':       UtensilsCrossed,
  'chef-hat':       ChefHat,
  'coffee':         Coffee,
  'shopping-bag':   ShoppingBag,
  'flame':          Flame,
  'stethoscope':    Stethoscope,
  'heart-pulse':    HeartPulse,
  'laptop':         Laptop,
  'code':           Code,
  'cpu':            Cpu,
  'hammer':         Hammer,
  'wrench':         Wrench,
  'hard-hat':       HardHat,
  'paw-print':      PawPrint,
  'flask':          FlaskConical,
  'microscope':     Microscope,
  'leaf':           Leaf,
  'sprout':         Sprout,
  'car':            Car,
  'truck':          Truck,
  'plane':          Plane,
  'banknote':       Banknote,
  'calculator':     Calculator,
  'scale':          Scale,
  'scissors':       Scissors,
  'book-open':      BookOpen,
  'baby':           Baby,
  'newspaper':      Newspaper,
};

interface AnalysisHighlightsProps {
  highlights: AnalysisHighlight[];
}

export function AnalysisHighlights({ highlights }: AnalysisHighlightsProps) {
  if (!highlights.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {highlights.map((h) => {
        const Icon = ICON_MAP[h.icon] ?? Sparkles;
        return (
          <div
            key={`${h.label}-${h.value}`}
            className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary shrink-0">
              <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] font-medium text-slate-500">
                {h.label}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {h.value}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
