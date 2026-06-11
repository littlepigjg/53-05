import { useState } from 'react';
import {
  History,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Layers,
  Undo2,
  ArrowLeftRight,
  User,
  Clock,
  FileText,
  Eye,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { MergeHistoryEntry, MergeConflict, MergeDecision } from '../../../shared/types';

interface MergeHistoryPanelProps {
  history: MergeHistoryEntry[];
  conflicts: MergeConflict[];
  onJumpToConflict?: (conflictId: string) => void;
  onShowDetails?: (title: string, decisions: MergeDecision[], isUndo?: boolean) => void;
}

const TYPE_LABEL: Record<string, string> = {
  heading: '标题',
  paragraph: '段落',
  list: '列表',
  code: '代码块',
  quote: '引用',
  table: '表格',
};

function actionIcon(action: MergeHistoryEntry['action']) {
  switch (action) {
    case 'resolve':
      return <CheckSquare size={14} />;
    case 'batch-resolve':
      return <Layers size={14} />;
    case 'undo':
      return <Undo2 size={14} />;
    case 'auto-resolve':
      return <ArrowLeftRight size={14} />;
  }
}

function actionBadge(action: MergeHistoryEntry['action']) {
  const map = {
    resolve: { label: '解决', cls: 'bg-emerald-100 text-emerald-700' },
    'batch-resolve': { label: '批量', cls: 'bg-indigo-100 text-indigo-700' },
    undo: { label: '撤销', cls: 'bg-orange-100 text-orange-700' },
    'auto-resolve': { label: '自动', cls: 'bg-cyan-100 text-cyan-700' },
  };
  const cfg = map[action];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold', cfg.cls)}>
      {actionIcon(action)}
      {cfg.label}
    </span>
  );
}

interface DecisionDetailProps {
  dec: MergeDecision;
  isUndo: boolean;
  onJump?: () => void;
}

function DecisionDetail({ dec, isUndo, onJump }: DecisionDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const choiceLabel = isUndo
    ? `撤销${dec.choice === 'left' ? '左侧' : dec.choice === 'right' ? '右侧' : dec.choice === 'both' ? '合并' : '自定义'}决策`
    : dec.choice === 'left'
    ? '保留左侧'
    : dec.choice === 'right'
    ? '保留右侧'
    : dec.choice === 'both'
    ? '合并两边'
    : '自定义内容';
  const choiceCls = isUndo
    ? 'bg-orange-100 text-orange-700'
    : dec.choice === 'left'
    ? 'bg-blue-100 text-blue-700'
    : dec.choice === 'right'
    ? 'bg-green-100 text-green-700'
    : dec.choice === 'both'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-amber-100 text-amber-700';

  const copy = async (k: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(k);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <li className="hover:bg-white transition-colors">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {expanded ? <ChevronDown size={12} className="text-slate-400 shrink-0" /> : <ChevronRight size={12} className="text-slate-400 shrink-0" />}
          <span className={clsx('shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded', choiceCls)}>
            {choiceLabel}
          </span>
          <span className="text-xs text-slate-700 font-semibold shrink-0">
            段落 #{dec.paragraphIndex}
          </span>
          {dec.paragraphType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
              {TYPE_LABEL[dec.paragraphType] ?? dec.paragraphType}
            </span>
          )}
          <span className="text-[10px] text-slate-500 truncate flex-1 min-w-0">
            {dec.contentSummary}
          </span>
        </div>
        {onJump && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onJump(); }}
            className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:underline font-medium shrink-0"
          >
            跳转
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-0">
              <div className="border-r border-slate-200">
                <div className="px-2 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-600">
                    {isUndo ? '被撤销的原内容' : '修改前'}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copy(`prev-${dec.id}`, dec.previousContent); }}
                    className={clsx(
                      'inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium',
                      copied === `prev-${dec.id}`
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    {copied === `prev-${dec.id}` ? <Check size={9} /> : <Copy size={9} />}
                    {copied === `prev-${dec.id}` ? '已复制' : '复制'}
                  </button>
                </div>
                <pre className={clsx(
                  'px-2 py-2 text-[10px] whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-auto',
                  isUndo ? 'bg-orange-50/40 text-slate-700' : 'bg-red-50/40 text-slate-700'
                )}>
{dec.previousContent || '（空）'}
                </pre>
              </div>

              <div className="w-6 bg-slate-50 border-r border-slate-200 flex items-center justify-center">
                <ArrowRight size={10} className="text-slate-400" />
              </div>

              <div>
                <div className="px-2 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-600">
                    {isUndo ? '撤销回退后' : '修改后'}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copy(`new-${dec.id}`, dec.newContent); }}
                    className={clsx(
                      'inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium',
                      copied === `new-${dec.id}`
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    {copied === `new-${dec.id}` ? <Check size={9} /> : <Copy size={9} />}
                    {copied === `new-${dec.id}` ? '已复制' : '复制'}
                  </button>
                </div>
                <pre className={clsx(
                  'px-2 py-2 text-[10px] whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-auto',
                  isUndo ? 'bg-orange-50/30 text-slate-700' : 'bg-green-50/40 text-slate-700'
                )}>
{dec.newContent || '（空）'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function MergeHistoryPanel({ history, conflicts, onJumpToConflict, onShowDetails }: MergeHistoryPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const conflictsById = new Map(conflicts.map((c) => [c.id, c]));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="bg-gradient-to-r from-slate-50 to-stone-50 px-5 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <History size={18} className="text-slate-600" />
            操作历史
          </h3>
          <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
            共 {history.length} 条
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">完整可追溯的合并决策过程</p>
      </div>

      <div className="flex-1 overflow-auto divide-y divide-slate-100">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <History size={26} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 font-medium">暂无操作记录</p>
            <p className="text-xs text-slate-400 mt-1">解决冲突后决策过程会显示在这里</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[30px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-200 via-slate-200 to-slate-100" />
            {[...history].reverse().map((entry) => {
              const expanded = expandedIds.has(entry.id);
              const decisionsCount = entry.decisions.length;
              const isUndo = entry.action === 'undo';
              return (
                <div key={entry.id} className="relative pl-14 pr-4 py-3 group">
                  <div className="absolute left-[18px] top-4 w-6 h-6 rounded-full bg-white border-2 border-slate-200 group-hover:border-indigo-400 flex items-center justify-center transition-colors z-10 shadow-sm">
                    <div
                      className={clsx(
                        'w-2.5 h-2.5 rounded-full',
                        entry.action === 'resolve'
                          ? 'bg-emerald-500'
                          : entry.action === 'batch-resolve'
                          ? 'bg-indigo-500'
                          : entry.action === 'undo'
                          ? 'bg-orange-500'
                          : 'bg-cyan-500'
                      )}
                    />
                  </div>

                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggle(entry.id)}
                      className="mt-0.5 p-0.5 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {actionBadge(entry.action)}
                        <span className="text-xs font-semibold text-slate-700 truncate flex-1 min-w-0">
                          {entry.description}
                        </span>
                        {decisionsCount > 0 && onShowDetails && (
                          <button
                            onClick={() => onShowDetails(entry.description, entry.decisions, isUndo)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-colors shrink-0"
                          >
                            <Eye size={10} />
                            查看完整对比
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User size={10} />
                          {entry.actor}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(entry.timestamp).toLocaleString('zh-CN', {
                            hour12: false,
                          })}
                        </span>
                        {decisionsCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <FileText size={10} />
                            {decisionsCount} 个决策
                          </span>
                        )}
                      </div>

                      {expanded && decisionsCount > 0 && (
                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
                          <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-600">
                              {isUndo ? '撤销详情（以下决策被回退）' : '决策详情'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              点击每条可展开完整对比
                            </span>
                          </div>
                          <ul className="divide-y divide-slate-200">
                            {entry.decisions.map((dec) => {
                              const conflict = conflictsById.get(dec.conflictId);
                              return (
                                <DecisionDetail
                                  key={dec.id}
                                  dec={dec}
                                  isUndo={isUndo}
                                  onJump={
                                    onJumpToConflict && conflict
                                      ? () => onJumpToConflict(conflict.id)
                                      : undefined
                                  }
                                />
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
