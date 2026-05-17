import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FlaskConical, ChevronLeft, Send, Copy, Check, Trash2,
  AlertCircle, CheckCircle2,
  Loader2, Key, Globe, Table2, Search, History, X,
  Download, Eye, EyeOff, RefreshCw, Hash, ToggleLeft, Zap,
  Database, ChevronRight, ArrowRight, Columns, Tag, SquareFunction,
  ChevronDown, Info, ClipboardList, Users
} from 'lucide-react';
import { SELECT_PROGRAM_CLASS } from '../lib/selectProgramClass';

interface RequestHistoryItem {
  id: string;
  method: string;
  url: string;
  status: number | null;
  timestamp: Date;
  durationMs: number | null;
  responseSize: number | null;
}

interface ExplorerEntity {
  LogicalName: string;
  EntitySetName: string;
  IsCustomEntity: boolean;
  PrimaryIdAttribute: string;
  PrimaryNameAttribute: string;
  DisplayName?: { UserLocalizedLabel?: { Label: string } };
  Description?: { UserLocalizedLabel?: { Label: string } };
}

interface ExplorerAttribute {
  LogicalName: string;
  IsPrimaryId: boolean;
  IsPrimaryName: boolean;
  IsValidForCreate: boolean;
  IsValidForUpdate: boolean;
  MaxLength?: number | null;
  MinValue?: number | null;
  MaxValue?: number | null;
  AttributeTypeName?: { Value: string };
  RequiredLevel?: { Value: string };
  DisplayName?: { UserLocalizedLabel?: { Label: string } };
  Description?: { UserLocalizedLabel?: { Label: string } };
}

interface DataversLabProps {
  onBack: () => void;
  onGoToSurveySearch?: () => void;
  onGoToStudentSearch?: () => void;
}

const DEFAULT_BASE_URL = '/dataverse/api/data/v9.2';

// Token is fetched server-side via the /devtoken Vite middleware (avoids AADSTS9002326)
const TOKEN_URL = '/devtoken';

// Stale seed token — replaced automatically on mount via fetchNewToken()
const DEFAULT_TOKEN = '';

const QUICK_ENTITIES = [
  { label: 'WLPC Students',  entity: 'cr89a_wlpcstudents',   icon: '👤' },
  { label: 'Accounts',       entity: 'accounts',              icon: '🏢' },
  { label: 'Contacts',       entity: 'contacts',              icon: '🙋' },
  { label: 'Schools',        entity: 'cr89a_wlpcschools',     icon: '🏫' },
  { label: 'System Users',   entity: 'systemusers',           icon: '👥' },
  { label: 'Entity Definitions', entity: 'EntityDefinitions', icon: '📋' },
];

const STUDENT_FIELDS = [
  'cr89a_wlpcstudentid', 'cr89a_studentname', 'cr89a_firstname', 'cr89a_lastname',
  'cr89a_preferredname', 'cr89a_yearlevel', 'cr89a_studenttype', 'new_studenttypemultiselect',
  'cr89a_referralobtained', 'cr89a_consentobtained', 'cr89a_guidanceinprogress',
  'cr89a_guidancecomplete', 'cr89a_studentinterviewed', 'cr89a_studenthasaprofile',
  'cr89a_prioritycohort', 'cr89a_registrationcode', 'emailaddress',
  '_cr89a_wlpcschool_value', '_owninguser_value', 'statecode', 'statuscode',
  'createdon', 'modifiedon',
];

function parseJwtExpiry(token: string): { exp: Date | null; isExpired: boolean; expiresIn: string } {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return { exp: null, isExpired: false, expiresIn: 'No expiry' };
    const exp = new Date(payload.exp * 1000);
    const now = Date.now();
    const diffMs = exp.getTime() - now;
    const isExpired = diffMs < 0;
    let expiresIn: string;
    if (isExpired) {
      const ago = Math.abs(diffMs);
      if (ago < 60_000) expiresIn = `Expired ${Math.round(ago / 1000)}s ago`;
      else if (ago < 3_600_000) expiresIn = `Expired ${Math.round(ago / 60_000)}m ago`;
      else expiresIn = `Expired ${exp.toLocaleString('en-AU')}`;
    } else {
      if (diffMs < 60_000) expiresIn = `Expires in ${Math.round(diffMs / 1000)}s`;
      else if (diffMs < 3_600_000) expiresIn = `Expires in ${Math.round(diffMs / 60_000)}m`;
      else expiresIn = `Expires ${exp.toLocaleString('en-AU')}`;
    }
    return { exp, isExpired, expiresIn };
  } catch {
    return { exp: null, isExpired: false, expiresIn: 'Invalid token' };
  }
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      match => {
        let cls = 'text-violet-600';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'text-sky-600' : 'text-emerald-700';
        } else if (/true|false/.test(match)) {
          cls = 'text-amber-600';
        } else if (/null/.test(match)) {
          cls = 'text-slate-400';
        } else {
          cls = 'text-orange-600';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DataverseLab({ onBack, onGoToSurveySearch, onGoToStudentSearch }: DataversLabProps) {
  // Connection config
  const [baseUrl, setBaseUrl]         = useState(DEFAULT_BASE_URL);
  const [bearerToken, setBearerToken] = useState(DEFAULT_TOKEN);
  const [showToken, setShowToken]     = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError]   = useState<string | null>(null);
  const refreshTimerRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchNewToken(): Promise<void> {
    setTokenLoading(true);
    setTokenError(null);
    try {
      const res  = await fetch(TOKEN_URL, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.access_token) {
        throw new Error(data.error_description ?? data.error ?? `HTTP ${res.status}`);
      }
      setBearerToken(data.access_token);

      // Schedule next refresh 5 min before expiry (tokens are ~3600s, refresh at ~3300s)
      const expiresInSec = (data.expires_in ?? 3600) as number;
      const refreshIn    = Math.max((expiresInSec - 300) * 1000, 30_000);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(fetchNewToken, refreshIn);
    } catch (e: any) {
      setTokenError(e.message ?? 'Failed to fetch token');
    } finally {
      setTokenLoading(false);
    }
  }

  // Fetch a fresh token on mount and clear the timer on unmount
  useEffect(() => {
    fetchNewToken();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request builder
  const [method, setMethod]           = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  const [endpoint, setEndpoint]       = useState('cr89a_wlpcstudents');
  const [selectFields, setSelectFields] = useState('');
  const [filterStr, setFilterStr]     = useState('');
  const [topN, setTopN]               = useState('10');
  const [orderBy, setOrderBy]         = useState('');
  const [expand, setExpand]           = useState('');
  const [bodyJson, setBodyJson]       = useState('');
  const [useQueryBuilder, setUseQueryBuilder] = useState(true);

  // Response state
  const [loading, setLoading]     = useState(false);
  const [response, setResponse]   = useState<any>(null);
  const [responseRaw, setResponseRaw] = useState('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pretty' | 'raw' | 'headers' | 'table'>('pretty');

  // History
  const [history, setHistory]     = useState<RequestHistoryItem[]>([]);
  const [copied, setCopied]       = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Field selector state
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const abortRef = useRef<AbortController | null>(null);

  const buildUrl = useCallback(() => {
    const base = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    if (!useQueryBuilder) return base;

    const params: string[] = [];
    const fields = selectFields.trim() || [...selectedFields].join(',');
    if (fields)     params.push(`$select=${fields}`);
    if (filterStr)  params.push(`$filter=${filterStr}`);
    if (topN)       params.push(`$top=${topN}`);
    if (orderBy)    params.push(`$orderby=${orderBy}`);
    if (expand)     params.push(`$expand=${expand}`);
    return params.length ? `${base}?${params.join('&')}` : base;
  }, [baseUrl, endpoint, useQueryBuilder, selectFields, selectedFields, filterStr, topN, orderBy, expand]);

  async function sendRequest() {
    if (!bearerToken.trim()) {
      setError('Waiting for token — click "Refresh Token Now" in the Connection panel.');
      return;
    }

    const { isExpired, expiresIn } = parseJwtExpiry(bearerToken.trim());
    if (isExpired && !tokenLoading) {
      setError(`Token is expired (${expiresIn}). Click "Refresh Token Now" in the Connection panel.`);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setResponse(null);
    setResponseRaw('');
    setResponseStatus(null);
    setResponseHeaders({});
    setDurationMs(null);

    const url = buildUrl();
    const t0  = performance.now();

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${bearerToken.trim()}`,
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'odata.include-annotations="*"',
      };
      if (method !== 'GET' && method !== 'DELETE') {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, {
        method,
        headers,
        body: (method === 'POST' || method === 'PATCH') && bodyJson ? bodyJson : undefined,
        signal: abortRef.current.signal,
      });

      const elapsed = Math.round(performance.now() - t0);
      setDurationMs(elapsed);
      setResponseStatus(res.status);

      const hdrs: Record<string, string> = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });
      setResponseHeaders(hdrs);

      const text = await res.text();
      setResponseRaw(text);

      try {
        const parsed = JSON.parse(text);
        setResponse(parsed);
      } catch {
        setResponse(null);
      }

      const histItem: RequestHistoryItem = {
        id: crypto.randomUUID(),
        method,
        url,
        status: res.status,
        timestamp: new Date(),
        durationMs: elapsed,
        responseSize: new Blob([text]).size,
      };
      setHistory(prev => [histItem, ...prev.slice(0, 49)]);

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function copyResponse() {
    navigator.clipboard.writeText(responseRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadResponse() {
    const blob = new Blob([responseRaw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dataverse-${endpoint.replace(/\W/g, '_')}-${Date.now()}.json`;
    a.click();
  }

  function loadFromHistory(item: RequestHistoryItem) {
    const url = new URL(item.url);
    setEndpoint(url.pathname.replace('/api/data/v9.2/', ''));
    setMethod(item.method as any);
    setShowHistory(false);
  }

  const tableRows = response?.value ?? (Array.isArray(response) ? response : null);
  const tableKeys = tableRows?.[0] ? Object.keys(tableRows[0]).filter(k => !k.startsWith('@')) : [];

  // ── Database Explorer state ────────────────────────────────────
  const [explorerOpen, setExplorerOpen]       = useState(false);
  const [explorerSearch, setExplorerSearch]   = useState('');
  const [explorerFilter, setExplorerFilter]   = useState<'all' | 'custom' | 'standard'>('all');
  const [entities, setEntities]               = useState<ExplorerEntity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError]     = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity]   = useState<ExplorerEntity | null>(null);
  const [attributes, setAttributes]           = useState<ExplorerAttribute[]>([]);
  const [attrsLoading, setAttrsLoading]       = useState(false);
  const [attrsError, setAttrsError]           = useState<string | null>(null);
  const [attrSearch, setAttrSearch]           = useState('');
  const [attrTypeFilter, setAttrTypeFilter]   = useState('all');
  const [expandedAttr, setExpandedAttr]       = useState<string | null>(null);

  async function loadEntities() {
    if (!bearerToken) return;
    setEntitiesLoading(true);
    setEntitiesError(null);
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/EntityDefinitions`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sorted = (data.value ?? []).sort((a: ExplorerEntity, b: ExplorerEntity) =>
        a.LogicalName.localeCompare(b.LogicalName)
      );
      setEntities(sorted);
    } catch (e: any) {
      setEntitiesError(e.message ?? 'Failed to load entities');
    } finally {
      setEntitiesLoading(false);
    }
  }

  async function loadAttributes(entity: ExplorerEntity) {
    if (!bearerToken) return;
    setSelectedEntity(entity);
    setAttributes([]);
    setAttrsError(null);
    setAttrSearch('');
    setAttrTypeFilter('all');
    setExpandedAttr(null);
    setAttrsLoading(true);
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/EntityDefinitions(LogicalName='${entity.LogicalName}')/Attributes`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sorted = (data.value ?? []).sort((a: ExplorerAttribute, b: ExplorerAttribute) =>
        a.LogicalName.localeCompare(b.LogicalName)
      );
      setAttributes(sorted);
    } catch (e: any) {
      setAttrsError(e.message ?? 'Failed to load attributes');
    } finally {
      setAttrsLoading(false);
    }
  }

  function useEntityInBuilder(entity: ExplorerEntity) {
    setEndpoint(entity.EntitySetName || entity.LogicalName);
    setExplorerOpen(false);
  }

  const filteredEntities = entities.filter(e => {
    const name = e.LogicalName.toLowerCase();
    const display = (e.DisplayName?.UserLocalizedLabel?.Label ?? '').toLowerCase();
    const matchSearch = name.includes(explorerSearch.toLowerCase()) || display.includes(explorerSearch.toLowerCase());
    const matchFilter =
      explorerFilter === 'all' ? true :
      explorerFilter === 'custom' ? e.IsCustomEntity :
      !e.IsCustomEntity;
    return matchSearch && matchFilter;
  });

  const filteredAttrs = attributes.filter(a => {
    const matchSearch = a.LogicalName.toLowerCase().includes(attrSearch.toLowerCase()) ||
      (a.DisplayName?.UserLocalizedLabel?.Label ?? '').toLowerCase().includes(attrSearch.toLowerCase());
    const matchType = attrTypeFilter === 'all' || a.AttributeTypeName?.Value === attrTypeFilter;
    return matchSearch && matchType;
  });

  const attrTypes = Array.from(new Set(attributes.map(a => a.AttributeTypeName?.Value).filter(Boolean))).sort() as string[];

  const statusColor = responseStatus
    ? responseStatus < 300 ? 'text-emerald-600' : responseStatus < 400 ? 'text-amber-600' : 'text-red-500'
    : 'text-slate-400';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-700 overflow-hidden font-mono text-sm">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors group text-xs"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <FlaskConical className="w-4 h-4 text-violet-600" />
          <span className="font-bold tracking-tight text-slate-900">Dataverse Lab</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 border border-violet-300 rounded font-semibold uppercase tracking-widest">DEV</span>
        </div>
        <div className="flex items-center gap-2">
          {onGoToStudentSearch && (
            <button
              onClick={onGoToStudentSearch}
              className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Student Search
            </button>
          )}
          {onGoToSurveySearch && (
            <button
              onClick={onGoToSurveySearch}
              className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Survey Search
            </button>
          )}
          <button
            onClick={() => { setExplorerOpen(true); if (entities.length === 0) loadEntities(); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            Table Explorer
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            History ({history.length})
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar: config + builder ─────────────────── */}
        <div className="w-[420px] shrink-0 flex flex-col border-r border-slate-200 overflow-y-auto bg-white">

          {/* Connection config */}
          <section className="px-4 pt-4 pb-3 border-b border-slate-100">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Connection
            </p>

            <label className="text-[10px] text-slate-400 mb-1 block">Base URL</label>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-slate-400 mb-3"
              placeholder="/dataverse/api/data/v9.2"
            />

            <label className="text-[10px] text-slate-400 mb-1 block flex items-center gap-1">
              <Key className="w-3 h-3" /> Bearer Token
            </label>
            <div className="relative">
              <input
                value={bearerToken}
                onChange={e => setBearerToken(e.target.value)}
                type={showToken ? 'text' : 'password'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-9 text-xs text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-slate-400"
                placeholder="Paste your Bearer token here…"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {tokenLoading && (
              <p className="text-[10px] text-violet-600 mt-1.5 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching token from Azure AD…
              </p>
            )}
            {tokenError && !tokenLoading && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 text-red-600 text-[11px] font-bold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Auth Error
                </div>
                <p className="text-[10px] text-red-500 mt-1 leading-relaxed break-all">{tokenError}</p>
              </div>
            )}
            {bearerToken && !tokenLoading && !tokenError && (() => {
              const { isExpired, expiresIn } = parseJwtExpiry(bearerToken);
              return isExpired ? (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 text-red-600 text-[11px] font-bold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Token Expired — {expiresIn}
                  </div>
                  <p className="text-[10px] text-red-500 mt-1">Click Refresh Token to get a new one.</p>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Token valid · {expiresIn}
                  </p>
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5 text-violet-500" /> Auto-refresh on
                  </span>
                </div>
              );
            })()}
            <button
              onClick={fetchNewToken}
              disabled={tokenLoading}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-violet-300 text-violet-600 hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold transition-colors"
            >
              {tokenLoading
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Refreshing…</>
                : <><RefreshCw className="w-3 h-3" /> Refresh Token Now</>
              }
            </button>
          </section>

          {/* Quick entity shortcuts */}
          <section className="px-4 pt-3 pb-3 border-b border-slate-100">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center gap-1.5">
              <Table2 className="w-3 h-3" /> Quick Entities
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_ENTITIES.map(q => (
                <button
                  key={q.entity}
                  onClick={() => { setEndpoint(q.entity); setUseQueryBuilder(true); }}
                  className={`text-left px-2.5 py-2 rounded-lg text-xs border transition-all ${
                    endpoint === q.entity
                      ? 'bg-violet-50 border-violet-300 text-violet-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <span className="mr-1.5">{q.icon}</span>{q.label}
                </button>
              ))}
            </div>
          </section>

          {/* Request builder */}
          <section className="px-4 pt-3 pb-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                <Send className="w-3 h-3" /> Request Builder
              </p>
              <button
                onClick={() => setUseQueryBuilder(!useQueryBuilder)}
                className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
              >
                <ToggleLeft className="w-3.5 h-3.5" />
                {useQueryBuilder ? 'Raw URL' : 'Query Builder'}
              </button>
            </div>

            {/* Method + endpoint */}
            <div className="flex gap-2 mb-3">
              <select
                value={method}
                onChange={e => setMethod(e.target.value as any)}
                className={`${SELECT_PROGRAM_CLASS} w-24`}
              >
                <option>GET</option>
                <option>POST</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>
              <input
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-slate-400"
                placeholder="cr89a_wlpcstudents or cr89a_wlpcstudents(guid)"
              />
            </div>

            {useQueryBuilder && (
              <div className="flex flex-col gap-2.5">

                {/* Field selector for students */}
                {endpoint.includes('wlpcstudent') && (
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block flex items-center justify-between">
                      <span>Quick $select fields</span>
                      <button
                        onClick={() => setSelectedFields(new Set())}
                        className="text-slate-400 hover:text-slate-600 text-[10px]"
                      >clear</button>
                    </label>
                    <div className="relative mb-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        value={fieldSearch}
                        onChange={e => setFieldSearch(e.target.value)}
                        placeholder="Search fields…"
                        className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-violet-400"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex flex-wrap gap-1">
                      {STUDENT_FIELDS.filter(f => f.includes(fieldSearch.toLowerCase())).map(f => (
                        <button
                          key={f}
                          onClick={() => setSelectedFields(prev => {
                            const next = new Set(prev);
                            next.has(f) ? next.delete(f) : next.add(f);
                            return next;
                          })}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                            selectedFields.has(f)
                              ? 'bg-violet-100 border-violet-300 text-violet-700'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    {selectedFields.size > 0 && (
                      <p className="text-[10px] text-violet-600 mt-1">{selectedFields.size} field{selectedFields.size !== 1 ? 's' : ''} selected</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">$select (comma-separated or use picker above)</label>
                  <input
                    value={selectFields}
                    onChange={e => setSelectFields(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-slate-400"
                    placeholder="cr89a_studentname,cr89a_yearlevel,statecode"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">$filter</label>
                  <input
                    value={filterStr}
                    onChange={e => setFilterStr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-slate-400"
                    placeholder="statecode eq 0 and cr89a_consentobtained eq true"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">$top</label>
                    <input
                      value={topN}
                      onChange={e => setTopN(e.target.value)}
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">$orderby</label>
                    <input
                      value={orderBy}
                      onChange={e => setOrderBy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400 placeholder:text-slate-400"
                      placeholder="modifiedon desc"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">$expand</label>
                  <input
                    value={expand}
                    onChange={e => setExpand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400 placeholder:text-slate-400"
                    placeholder="cr89a_wlpcschool"
                  />
                </div>
              </div>
            )}

            {/* Body for POST/PATCH */}
            {(method === 'POST' || method === 'PATCH') && (
              <div className="mt-2.5">
                <label className="text-[10px] text-slate-400 mb-1 block">Request Body (JSON)</label>
                <textarea
                  value={bodyJson}
                  onChange={e => setBodyJson(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400 placeholder:text-slate-400 resize-none font-mono"
                  placeholder={'{\n  "cr89a_firstname": "Test"\n}'}
                />
              </div>
            )}

            {/* Generated URL preview */}
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-1">Generated URL</p>
              <p className="text-[10px] text-slate-600 break-all leading-relaxed">{buildUrl()}</p>
            </div>

            {/* Send button */}
            <button
              onClick={sendRequest}
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wide transition-colors shadow-sm"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-3.5 h-3.5" /> Send Request</>
              )}
            </button>
            {loading && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs transition-colors"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            )}
          </section>
        </div>

        {/* ── Right panel: response ───────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Response status bar */}
          <div className="shrink-0 h-10 bg-white border-b border-slate-200 flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {responseStatus !== null && (
                <span className={`text-xs font-bold ${statusColor}`}>
                  {responseStatus} {responseStatus < 300 ? '— OK' : responseStatus === 401 ? '— Unauthorized' : responseStatus === 404 ? '— Not Found' : '— Error'}
                </span>
              )}
              {durationMs !== null && (
                <span className="text-[11px] text-slate-400">{durationMs}ms</span>
              )}
              {responseRaw && (
                <span className="text-[11px] text-slate-400">{formatBytes(new Blob([responseRaw]).size)}</span>
              )}
              {response?.value && (
                <span className="text-[11px] text-slate-500">
                  <Hash className="w-3 h-3 inline mr-0.5 text-slate-400" />
                  {response.value.length} record{response.value.length !== 1 ? 's' : ''}
                  {response['@odata.count'] && ` / ${response['@odata.count']} total`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {responseRaw && (
                <>
                  <button onClick={copyResponse} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={downloadResponse} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
                    <Download className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => { setResponse(null); setResponseRaw(''); setResponseStatus(null); setError(null); }} className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Response tabs */}
          {(response !== null || error) && (
            <div className="shrink-0 flex items-center gap-0 border-b border-slate-200 bg-white px-4">
              {(['pretty', 'raw', 'headers', 'table'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab}
                  {tab === 'table' && tableRows && (
                    <span className="ml-1.5 bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-full">
                      {tableRows.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Response body */}
          <div className="flex-1 overflow-auto bg-slate-50">
            {error && (
              <div className="p-6">
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-1">Request Failed</p>
                    <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                    {error.includes('CORS') || error.includes('Failed to fetch') ? (
                      <p className="text-xs text-slate-500 mt-2">
                        Tip: Direct browser requests to Dynamics 365 are blocked by CORS. You'll need to proxy this through a local backend or use the Vite dev server proxy config.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {!error && response === null && responseRaw === '' && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <FlaskConical className="w-10 h-10 text-slate-300 mb-4" />
                <p className="text-slate-400 text-sm font-medium">No request sent yet</p>
                <p className="text-slate-400 text-xs mt-1 max-w-xs">Configure your connection, choose an entity, apply filters, and hit Send.</p>
              </div>
            )}

            {loading && response === null && (
              <div className="flex items-center justify-center h-full gap-3 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                <span className="text-sm">Fetching from Dataverse…</span>
              </div>
            )}

            {/* Pretty tab */}
            {!error && activeTab === 'pretty' && response !== null && (
              <pre
                className="p-5 text-xs leading-relaxed overflow-auto h-full text-slate-700"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(response, null, 2)) }}
              />
            )}

            {/* Raw tab */}
            {!error && activeTab === 'raw' && responseRaw && (
              <pre className="p-5 text-xs text-slate-600 leading-relaxed overflow-auto h-full whitespace-pre-wrap break-all">
                {responseRaw}
              </pre>
            )}

            {/* Headers tab */}
            {!error && activeTab === 'headers' && (
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 font-bold">Response Headers</p>
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {Object.entries(responseHeaders).map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-200">
                        <td className="py-2 pr-6 text-sky-600 font-semibold align-top w-64 shrink-0">{k}</td>
                        <td className="py-2 text-slate-600 break-all">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table tab */}
            {!error && activeTab === 'table' && (
              tableRows ? (
                <div className="overflow-auto h-full">
                  <table className="min-w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                      <tr>
                        {tableKeys.map(k => (
                          <th key={k} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-200 whitespace-nowrap">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableRows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-white transition-colors">
                          {tableKeys.map(k => {
                            const val = row[k];
                            const display = val === null ? (
                              <span className="text-slate-300 italic">null</span>
                            ) : val === true ? (
                              <span className="text-emerald-600">true</span>
                            ) : val === false ? (
                              <span className="text-red-500">false</span>
                            ) : typeof val === 'object' ? (
                              <span className="text-slate-400 italic">[object]</span>
                            ) : (
                              <span className="text-slate-700">{String(val)}</span>
                            );
                            return (
                              <td key={k} className="px-3 py-2 border-r border-slate-100 whitespace-nowrap max-w-[220px] truncate">
                                {display}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 text-sm text-slate-400 text-center mt-8">
                  Response does not contain a <code className="text-violet-600">.value</code> array. Use the Pretty or Raw tab.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Database Explorer panel ─────────────────────────── */}
      <AnimatePresence>
        {explorerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setExplorerOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="fixed top-0 left-0 h-full w-[900px] bg-white border-r border-slate-200 z-50 flex flex-col shadow-2xl"
            >
              {/* Explorer header */}
              <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-sm text-slate-900">Table Explorer</span>
                  {entities.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded font-semibold">{entities.length} entities</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadEntities()}
                    disabled={entitiesLoading}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${entitiesLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button onClick={() => setExplorerOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">

                {/* ── Entity list ───────────────────────────────── */}
                <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col overflow-hidden">
                  <div className="px-3 py-3 border-b border-slate-100 flex flex-col gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        value={explorerSearch}
                        onChange={e => setExplorerSearch(e.target.value)}
                        placeholder="Search tables…"
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 placeholder:text-slate-400"
                      />
                    </div>
                    <div className="flex gap-1">
                      {(['all', 'custom', 'standard'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setExplorerFilter(f)}
                          className={`flex-1 text-[10px] font-semibold py-1 rounded-lg transition-colors capitalize ${
                            explorerFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {entitiesLoading && (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-xs">Loading entities…</span>
                      </div>
                    )}
                    {entitiesError && (
                      <div className="p-3 m-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-600 font-semibold">Failed to load</p>
                        <p className="text-[10px] text-red-500 mt-0.5">{entitiesError}</p>
                      </div>
                    )}
                    {!entitiesLoading && !entitiesError && entities.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400 text-center px-4">
                        <Database className="w-6 h-6 text-slate-300" />
                        <p className="text-xs">No entities loaded</p>
                        <p className="text-[10px] text-slate-400">Make sure your token is valid and click Refresh.</p>
                      </div>
                    )}
                    {!entitiesLoading && filteredEntities.map(entity => {
                      const label = entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName;
                      const isSelected = selectedEntity?.LogicalName === entity.LogicalName;
                      return (
                        <button
                          key={entity.LogicalName}
                          onClick={() => loadAttributes(entity)}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-2 group transition-colors border-b border-slate-50 ${
                            isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${entity.IsCustomEntity ? 'bg-violet-100' : 'bg-slate-100'}`}>
                            <Table2 className={`w-3 h-3 ${entity.IsCustomEntity ? 'text-violet-600' : 'text-slate-400'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                              {label}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate font-mono">{entity.LogicalName}</div>
                          </div>
                          {entity.IsCustomEntity && (
                            <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 bg-violet-100 text-violet-600 rounded uppercase tracking-wider">custom</span>
                          )}
                        </button>
                      );
                    })}
                    {!entitiesLoading && filteredEntities.length === 0 && entities.length > 0 && (
                      <p className="text-xs text-slate-400 text-center py-8">No entities match your search.</p>
                    )}
                  </div>
                  <div className="shrink-0 px-3 py-2 border-t border-slate-100 bg-slate-50">
                    <p className="text-[10px] text-slate-400 font-mono">{filteredEntities.length} of {entities.length} shown</p>
                  </div>
                </div>

                {/* ── Attribute / schema detail ──────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {!selectedEntity ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
                      <Columns className="w-10 h-10 text-slate-200" />
                      <p className="text-sm text-slate-400 font-medium">Select a table to inspect its schema</p>
                      <p className="text-xs text-slate-400">Fields, types, required levels, and constraints will appear here.</p>
                    </div>
                  ) : (
                    <>
                      {/* Entity metadata header */}
                      <div className="shrink-0 px-5 py-4 border-b border-slate-200 bg-slate-50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-base font-bold text-slate-900">
                                {selectedEntity.DisplayName?.UserLocalizedLabel?.Label || selectedEntity.LogicalName}
                              </h3>
                              {selectedEntity.IsCustomEntity && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-700 border border-violet-300 rounded uppercase tracking-wider">custom</span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-slate-500">{selectedEntity.LogicalName}</p>
                            {selectedEntity.Description?.UserLocalizedLabel?.Label && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedEntity.Description.UserLocalizedLabel.Label}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                              <span><span className="text-slate-400">Set:</span> <span className="font-mono">{selectedEntity.EntitySetName}</span></span>
                              <span><span className="text-slate-400">PK:</span> <span className="font-mono">{selectedEntity.PrimaryIdAttribute}</span></span>
                              <span><span className="text-slate-400">Name field:</span> <span className="font-mono">{selectedEntity.PrimaryNameAttribute || '—'}</span></span>
                            </div>
                          </div>
                          <button
                            onClick={() => useEntityInBuilder(selectedEntity)}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Use in Builder
                          </button>
                        </div>
                      </div>

                      {/* Attribute filters */}
                      <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-white">
                        <div className="relative flex-1 max-w-xs">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <input
                            value={attrSearch}
                            onChange={e => setAttrSearch(e.target.value)}
                            placeholder="Search fields…"
                            className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 placeholder:text-slate-400"
                          />
                        </div>
                        <select
                          value={attrTypeFilter}
                          onChange={e => setAttrTypeFilter(e.target.value)}
                          className={`${SELECT_PROGRAM_CLASS} min-w-[8.5rem]`}
                        >
                          <option value="all">All Types</option>
                          {attrTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {!attrsLoading && (
                          <span className="text-[10px] text-slate-400 ml-auto font-mono">{filteredAttrs.length} of {attributes.length} fields</span>
                        )}
                      </div>

                      {/* Attributes table */}
                      <div className="flex-1 overflow-y-auto">
                        {attrsLoading && (
                          <div className="flex items-center justify-center h-32 gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span className="text-xs">Loading fields…</span>
                          </div>
                        )}
                        {attrsError && (
                          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-600">{attrsError}</p>
                          </div>
                        )}
                        {!attrsLoading && !attrsError && (
                          <table className="w-full text-xs border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_#e2e8f0]">
                              <tr>
                                {['Field Name', 'Display Name', 'Type', 'Required', 'Flags'].map(h => (
                                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredAttrs.map(attr => {
                                const typeName   = attr.AttributeTypeName?.Value ?? '—';
                                const reqLevel   = attr.RequiredLevel?.Value ?? '';
                                const display    = attr.DisplayName?.UserLocalizedLabel?.Label ?? '—';
                                const isExpanded = expandedAttr === attr.LogicalName;
                                const typeColor: Record<string, string> = {
                                  StringType:            'bg-blue-50 text-blue-700 border-blue-200',
                                  IntegerType:           'bg-amber-50 text-amber-700 border-amber-200',
                                  DecimalType:           'bg-orange-50 text-orange-700 border-orange-200',
                                  BooleanType:           'bg-emerald-50 text-emerald-700 border-emerald-200',
                                  DateTimeType:          'bg-violet-50 text-violet-700 border-violet-200',
                                  LookupType:            'bg-sky-50 text-sky-700 border-sky-200',
                                  PicklistType:          'bg-pink-50 text-pink-700 border-pink-200',
                                  MemoType:              'bg-teal-50 text-teal-700 border-teal-200',
                                  UniqueidentifierType:  'bg-slate-100 text-slate-600 border-slate-200',
                                };
                                const badgeColor = typeColor[typeName] ?? 'bg-slate-100 text-slate-500 border-slate-200';

                                return (
                                  <React.Fragment key={attr.LogicalName}>
                                    <tr
                                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                                      onClick={() => setExpandedAttr(isExpanded ? null : attr.LogicalName)}
                                    >
                                      <td className="px-4 py-2.5 align-top">
                                        <div className="flex items-center gap-1.5">
                                          <ChevronRight className={`w-3 h-3 text-slate-300 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                          <div>
                                            <span className={`font-mono font-semibold ${attr.IsPrimaryId ? 'text-blue-600' : attr.IsPrimaryName ? 'text-emerald-600' : 'text-slate-700'}`}>
                                              {attr.LogicalName}
                                            </span>
                                            {attr.IsPrimaryId   && <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 border border-blue-200 px-1 py-0.5 rounded font-bold uppercase tracking-wider">PK</span>}
                                            {attr.IsPrimaryName && <span className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-600 border border-emerald-200 px-1 py-0.5 rounded font-bold uppercase tracking-wider">Name</span>}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-500 align-top">{display}</td>
                                      <td className="px-4 py-2.5 align-top">
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${badgeColor}`}>
                                          {typeName.replace('Type', '')}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 align-top">
                                        {reqLevel === 'ApplicationRequired' ? (
                                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Required</span>
                                        ) : reqLevel === 'Recommended' ? (
                                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Recommended</span>
                                        ) : (
                                          <span className="text-[10px] text-slate-400">Optional</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 align-top">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {attr.IsValidForCreate && <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.5 rounded font-bold uppercase">Create</span>}
                                          {attr.IsValidForUpdate && <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.5 rounded font-bold uppercase">Update</span>}
                                        </div>
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr className="bg-blue-50/50">
                                        <td colSpan={5} className="px-10 py-3">
                                          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[11px]">
                                            {attr.Description?.UserLocalizedLabel?.Label && (
                                              <div className="w-full flex items-start gap-1.5 text-slate-500 italic">
                                                <Info className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                                {attr.Description.UserLocalizedLabel.Label}
                                              </div>
                                            )}
                                            <div><span className="text-slate-400">Full Type:</span> <span className="font-mono text-slate-600">{typeName}</span></div>
                                            <div><span className="text-slate-400">Required Level:</span> <span className="font-mono text-slate-600">{reqLevel || '—'}</span></div>
                                            {attr.MaxLength != null && <div><span className="text-slate-400">Max Length:</span> <span className="font-mono text-slate-600">{attr.MaxLength}</span></div>}
                                            {attr.MinValue  != null && <div><span className="text-slate-400">Min:</span> <span className="font-mono text-slate-600">{attr.MinValue}</span></div>}
                                            {attr.MaxValue  != null && <div><span className="text-slate-400">Max:</span> <span className="font-mono text-slate-600">{attr.MaxValue}</span></div>}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── History drawer ──────────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-[400px] bg-white border-l border-slate-200 z-50 flex flex-col shadow-xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-violet-500" />
                  <span className="font-bold text-sm text-slate-800">Request History</span>
                </div>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button onClick={() => setHistory([])} className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                  <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs mt-12">No requests yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {history.map(item => (
                      <button
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.method === 'GET'    ? 'bg-sky-100 text-sky-700' :
                              item.method === 'POST'   ? 'bg-emerald-100 text-emerald-700' :
                              item.method === 'PATCH'  ? 'bg-amber-100 text-amber-700' :
                                                         'bg-red-100 text-red-700'
                            }`}>{item.method}</span>
                            <span className={`text-[11px] font-semibold ${
                              item.status && item.status < 300 ? 'text-emerald-600' :
                              item.status && item.status < 400 ? 'text-amber-600' : 'text-red-500'
                            }`}>{item.status ?? '—'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{item.durationMs}ms</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{item.url}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.timestamp.toLocaleTimeString()} · {item.responseSize ? formatBytes(item.responseSize) : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
