import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableDropdownOption {
  value: string;
  label: string;
  count?: number;
}

export interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  /** Shown on the trigger when no option matches `value`. */
  placeholder: string;
  /** Value treated as “no selection” for inactive trigger styling (default `all`). */
  allValue?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  panelWidthClass?: string;
  /** Show the search field in the panel (default true). */
  searchable?: boolean;
  disabled?: boolean;
}

export const SEARCHABLE_DROPDOWN_PANEL_ATTR = 'data-searchable-dropdown-panel';
const VIEWPORT_MARGIN_PX = 12;
const SEARCH_HEADER_PX = 48;
const MIN_LIST_HEIGHT_PX = 96;
const MAX_LIST_HEIGHT_PX = 208; // matches prior max-h-52

const PANEL_WIDTH_PX: Record<string, number> = {
  'w-44': 176,
  'w-48': 192,
  'w-52': 208,
  'w-56': 224,
  'w-64': 256,
};

type PanelPlacement = {
  top: number;
  left: number;
  width: number;
  listMaxHeight: number;
  above: boolean;
};

function formatOptionLabel(opt: SearchableDropdownOption): string {
  return opt.count != null ? `${opt.label} (${opt.count})` : opt.label;
}

function resolvePanelWidthPx(panelWidthClass: string, triggerWidth: number): number {
  const classWidth = PANEL_WIDTH_PX[panelWidthClass] ?? triggerWidth;
  return Math.max(triggerWidth, classWidth);
}

function computePanelPlacement(
  trigger: HTMLElement,
  panelWidthClass: string,
  searchable: boolean,
): PanelPlacement {
  const rect = trigger.getBoundingClientRect();
  const width = resolvePanelWidthPx(panelWidthClass, rect.width);
  let left = rect.left;
  left = Math.max(
    VIEWPORT_MARGIN_PX,
    Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN_PX),
  );

  const searchHeader = searchable ? SEARCH_HEADER_PX : 0;
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN_PX;
  const spaceAbove = rect.top - VIEWPORT_MARGIN_PX;
  const preferredHeight = searchHeader + MAX_LIST_HEIGHT_PX;
  const above = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
  const available = above ? spaceAbove : spaceBelow;
  const listMaxHeight = Math.max(
    MIN_LIST_HEIGHT_PX,
    Math.min(MAX_LIST_HEIGHT_PX, available - searchHeader - VIEWPORT_MARGIN_PX),
  );
  const top = above
    ? rect.top - VIEWPORT_MARGIN_PX
    : rect.bottom + VIEWPORT_MARGIN_PX;

  return { top, left, width, listMaxHeight, above };
}

export function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder,
  allValue = 'all',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches',
  className = '',
  triggerClassName = '',
  panelWidthClass = 'w-64',
  searchable = true,
  disabled = false,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);
  const isActive = value !== allValue && value !== '';
  const triggerLabel = selected ? formatOptionLabel(selected) : placeholder;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      o =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, search]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPlacement(null);
      return;
    }

    const update = () => {
      if (triggerRef.current) {
        setPlacement(computePanelPlacement(triggerRef.current, panelWidthClass, searchable));
      }
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, panelWidthClass, searchable]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setSearch('');
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectOption(next: string) {
    onChange(next);
    setOpen(false);
    setSearch('');
  }

  function closePanel() {
    setOpen(false);
    setSearch('');
  }

  const panelContent = open && placement && (
    <div
      {...{ [SEARCHABLE_DROPDOWN_PANEL_ATTR]: '' }}
      style={{
        position: 'fixed',
        top: placement.top,
        left: placement.left,
        width: placement.width,
        transform: placement.above ? 'translateY(-100%)' : undefined,
        zIndex: 250,
      }}
    >
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: placement.above ? 4 : -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: placement.above ? 4 : -4, scale: 0.98 }}
        transition={{ duration: 0.12 }}
        className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
      >
        {searchable && (
          <div className="px-2 pt-2 pb-1 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-6 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary/40 placeholder-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div
          className="overflow-y-auto overscroll-contain py-1"
          style={{ maxHeight: placement.listMaxHeight }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-400 text-center">{emptyMessage}</p>
          ) : (
            filtered.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectOption(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${
                    isSelected ? 'font-bold text-primary bg-primary/5' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate text-left">{opt.label}</span>
                  {opt.count != null && (
                    <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-2">
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) {
            closePanel();
            return;
          }
          setOpen(true);
          setSearch('');
        }}
        className={`flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors w-full min-w-0 ${
          isActive
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName}`}
      >
        <span className="truncate text-left flex-1">{triggerLabel}</span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>{panelContent}</AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
