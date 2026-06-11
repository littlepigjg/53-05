import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ChevronRight,
  Filter,
  ListFilter,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { MergeConflict, ConflictStatus } from '../../../shared/types';
import { useState } from 'react';

interface ConflictListProps {
  conflicts: MergeConflict[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type FilterType = 'all' | 'pending' | 'resolved';

export function ConflictList({ conflicts, selectedId, onSelect }: ConflictListProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = conflicts.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return c.status === 'pending';
    if (filter === 'resolved') return c.status === 'resolved';
    return true;
  });

  const pendingCount = conflicts.filter((c) => c.status === 'pending').length;
  const resolvedCount = conflicts.filter((c) => c.status === 'resolved').length;

  const statusIcon = (status: ConflictStatus, decision?: string) => {
    if (status === 'pending') {
      return <AlertCircle size={13} className="text-amber-500" />;
    }
    const colorClass =
      decision === 'left'
        ? 'text-blue-500'
        : decision === 'right'
        ? 'text-green-500'
        : decision === 'both'
        ? 'text-purple-500'
        : 'text-amber-500';
    return <CheckCircle2 size={13} className={colorClass} />;
  };

  const paraTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      heading: '标题',
      paragraph: '段落',
      list: '列表',
      code: '代码',
      quote: '引用',
      table: '表格',
    };
    return map[type] || type;
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: conflicts.length },
    { key: 'pending', label: '待处理', count: pendingCount },
    { key: 'resolved', label: '已解决', count: resolvedCount },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="bg-gradient-to-r from-stone-50 to-slate-50 px-4 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <ListFilter size={17} className="text-slate-600" />
            冲突列表
          </h3>
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1',
                filter === f.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {f.label}
              <span
                className={clsx(
                  'text-[10px] px-1.5 py-px rounded-full',
                  filter === f.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Filter size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">没有匹配的冲突</p>
            <p className="text-xs text-slate-400 mt-1">尝试切换筛选条件</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((conflict) => {
              const isSelected = conflict.id === selectedId;
              const isPending = conflict.status === 'pending';
              return (
                <li key={conflict.id}>
                  <button
                    onClick={() => onSelect(conflict.id)}
                    className={clsx(
                      'w-full text-left px-4 py-3 transition-all group',
                      isSelected
                        ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {statusIcon(conflict.status, conflict.decision)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={clsx(
                              'text-xs font-bold tabular-nums',
                              isSelected ? 'text-indigo-700' : 'text-slate-700'
                            )}
                          >
                            #{conflict.paragraphIndex}
                          </span>
                          <span className="text-[10px] px-1.5 py-px rounded bg-slate-100 text-slate-600 font-medium">
                            {paraTypeLabel(conflict.paragraphType)}
                          </span>
                          {isPending && (
                            <span className="text-[10px] px-1.5 py-px rounded bg-amber-100 text-amber-700 font-semibold">
                              待处理
                            </span>
                          )}
                          {!isPending && conflict.decision && (
                            <span
                              className={clsx(
                                'text-[10px] px-1.5 py-px rounded font-semibold',
                                conflict.decision === 'left'
                                  ? 'bg-blue-100 text-blue-700'
                                  : conflict.decision === 'right'
                                  ? 'bg-green-100 text-green-700'
                                  : conflict.decision === 'both'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-amber-100 text-amber-700'
                              )}
                            >
                              {conflict.decision === 'left'
                                ? '左侧'
                                : conflict.decision === 'right'
                                ? '右侧'
                                : conflict.decision === 'both'
                                ? '合并'
                                : '自定义'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {conflict.baseContent.slice(0, 80) || '（空段落）'}
                          {conflict.baseContent.length > 80 && '…'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                          <Circle size={8} className="fill-blue-400 text-blue-400" />
                          <span className="truncate">{conflict.leftAuthor}</span>
                          <span className="text-slate-300">vs</span>
                          <Circle size={8} className="fill-green-400 text-green-400" />
                          <span className="truncate">{conflict.rightAuthor}</span>
                        </div>
                      </div>
                      <ChevronRight
                        size={15}
                        className={clsx(
                          'mt-0.5 shrink-0 transition-all',
                          isSelected
                            ? 'text-indigo-500 translate-x-0'
                            : 'text-slate-300 -translate-x-1 group-hover:translate-x-0 group-hover:text-slate-500'
                        )}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
