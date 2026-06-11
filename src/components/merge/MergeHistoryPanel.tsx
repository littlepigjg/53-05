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
} from 'lucide-react';
import { clsx } from 'clsx';
import type { MergeHistoryEntry, MergeConflict } from '../../../shared/types';

interface MergeHistoryPanelProps {
  history: MergeHistoryEntry[];
  conflicts: MergeConflict[];
  onJumpToConflict?: (conflictId: string) => void;
}

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

export function MergeHistoryPanel({ history, conflicts, onJumpToConflict }: MergeHistoryPanelProps) {
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
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {entry.description}
                        </span>
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
                          <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-600">
                              {entry.action === 'undo' ? '撤销详情（以下决策被回退）' : '决策详情'}
                            </span>
                          </div>
                          <ul className="divide-y divide-slate-200">
                            {entry.decisions.map((dec) => {
                              const conflict = conflictsById.get(dec.conflictId);
                              const isUndoEntry = entry.action === 'undo';
                              const choiceLabel =
                                isUndoEntry
                                  ? `撤销${dec.choice === 'left' ? '左侧' : dec.choice === 'right' ? '右侧' : dec.choice === 'both' ? '合并' : '自定义'}决策`
                                  : dec.choice === 'left'
                                  ? '保留左侧'
                                  : dec.choice === 'right'
                                  ? '保留右侧'
                                  : dec.choice === 'both'
                                  ? '合并两边'
                                  : '自定义内容';
                              const choiceCls =
                                isUndoEntry
                                  ? 'bg-orange-100 text-orange-700'
                                  : dec.choice === 'left'
                                  ? 'bg-blue-100 text-blue-700'
                                  : dec.choice === 'right'
                                  ? 'bg-green-100 text-green-700'
                                  : dec.choice === 'both'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-amber-100 text-amber-700';
                              return (
                                <li
                                  key={dec.id}
                                  className="px-3 py-2.5 hover:bg-white transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className={clsx('shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded', choiceCls)}>
                                        {choiceLabel}
                                      </span>
                                      <span className="text-xs text-slate-600 truncate">
                                        段落 #{conflict?.paragraphIndex ?? '?'}
                                      </span>
                                    </div>
                                    {onJumpToConflict && conflict && (
                                      <button
                                        onClick={() => onJumpToConflict(conflict.id)}
                                        className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:underline font-medium shrink-0"
                                      >
                                        查看
                                      </button>
                                    )}
                                  </div>
                                  {isUndoEntry && dec.previousContent && (
                                    <div className="mt-1.5 pl-2 border-l-2 border-orange-200">
                                      <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                                        原决策内容：{dec.previousContent.slice(0, 80)}{dec.previousContent.length > 80 ? '…' : ''}
                                      </p>
                                    </div>
                                  )}
                                </li>
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
