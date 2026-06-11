import { useMemo } from 'react';
import type { DiffLine, DiffLineType, MergeConflict, MergeHistoryEntry } from '../../../shared/types';
import { Clock, GitBranch, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { clsx } from 'clsx';

interface DiffColumnProps {
  title: string;
  subtitle?: string;
  lines: DiffLine[];
  accentColor: 'gray' | 'blue' | 'green';
  highlightActive?: boolean;
  badge?: React.ReactNode;
}

function lineBgClass(type: DiffLineType, accent: 'gray' | 'blue' | 'green'): string {
  switch (type) {
    case 'added':
      return accent === 'blue' ? 'bg-blue-50' : accent === 'green' ? 'bg-green-50' : 'bg-gray-100';
    case 'removed':
      return 'bg-red-50 line-through decoration-red-400';
    case 'modified':
      return accent === 'blue' ? 'bg-blue-100' : accent === 'green' ? 'bg-green-100' : 'bg-gray-200';
    default:
      return 'bg-white';
  }
}

function lineTextClass(type: DiffLineType): string {
  switch (type) {
    case 'added':
      return 'text-green-700';
    case 'removed':
      return 'text-red-600';
    case 'modified':
      return 'text-indigo-700 font-medium';
    default:
      return 'text-gray-700';
  }
}

function linePrefix(type: DiffLineType): string {
  switch (type) {
    case 'added':
      return '+';
    case 'removed':
      return '−';
    case 'modified':
      return '~';
    default:
      return ' ';
  }
}

function DiffColumn({ title, subtitle, lines, accentColor, highlightActive, badge }: DiffColumnProps) {
  const accentHeaderBg =
    accentColor === 'blue'
      ? 'bg-blue-50 border-blue-200'
      : accentColor === 'green'
      ? 'bg-green-50 border-green-200'
      : 'bg-gray-50 border-gray-200';
  const accentTitle =
    accentColor === 'blue' ? 'text-blue-700' : accentColor === 'green' ? 'text-green-700' : 'text-gray-700';
  const accentBorder =
    accentColor === 'blue' ? 'border-blue-400' : accentColor === 'green' ? 'border-green-400' : 'border-gray-400';

  return (
    <div
      className={clsx(
        'flex flex-col rounded-xl border overflow-hidden transition-all duration-200',
        highlightActive ? 'ring-2 ring-offset-1 shadow-lg' : 'shadow-sm',
        accentBorder
      )}
    >
      <div className={clsx('px-4 py-3 border-b flex items-center justify-between', accentHeaderBg)}>
        <div>
          <h3 className={clsx('font-semibold text-sm', accentTitle)}>{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className="flex-1 overflow-auto bg-white font-mono text-xs leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr
                key={idx}
                className={clsx(
                  'border-b border-gray-100 last:border-b-0',
                  lineBgClass(line.type, accentColor)
                )}
              >
                <td className="w-8 select-none text-right pr-2 py-1 text-gray-400 border-r border-gray-100 align-top">
                  {line.lineNumber}
                </td>
                <td className="w-6 select-none text-center pr-1 py-1 text-gray-400 align-top font-bold">
                  {linePrefix(line.type)}
                </td>
                <td className={clsx('pr-3 py-1 whitespace-pre-wrap break-all align-top', lineTextClass(line.type))}>
                  {line.content || '\u00A0'}
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-400 italic">
                  （空段落）
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ThreeWayDiffViewProps {
  conflict: MergeConflict;
  history?: MergeHistoryEntry[];
}

export function ThreeWayDiffView({ conflict }: ThreeWayDiffViewProps) {
  const isPending = conflict.status === 'pending';

  const statusBadge = useMemo(() => {
    if (conflict.status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
          <AlertCircle size={12} />
          待处理
        </span>
      );
    }
    const label =
      conflict.decision === 'left'
        ? '采用左侧'
        : conflict.decision === 'right'
        ? '采用右侧'
        : conflict.decision === 'both'
        ? '合并两边'
        : '自定义内容';
    const colorClass =
      conflict.decision === 'left'
        ? 'bg-blue-100 text-blue-700'
        : conflict.decision === 'right'
        ? 'bg-green-100 text-green-700'
        : 'bg-purple-100 text-purple-700';
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', colorClass)}>
        <CheckCircle2 size={12} />
        {label}
      </span>
    );
  }, [conflict.status, conflict.decision]);

  const paraTypeLabel = {
    heading: `标题${conflict.diff.baseLines.length > 0 ? '' : ''}`,
    paragraph: '段落',
    list: '列表',
    code: '代码块',
    quote: '引用',
    table: '表格',
  }[conflict.paragraphType] || '段落';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
            <GitBranch size={18} className="text-slate-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                段落 #{conflict.paragraphIndex}
              </span>
              <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                {paraTypeLabel}
              </span>
              {isPending && (
                <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-200">
                  ⚠ 冲突
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              左侧：<span className="font-medium text-blue-600">{conflict.leftAuthor}</span>
              <span className="mx-1.5 text-slate-300">|</span>
              右侧：<span className="font-medium text-green-600">{conflict.rightAuthor}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock size={12} />
            {new Date().toLocaleTimeString('zh-CN')}
          </span>
          {statusBadge}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <DiffColumn
          title="基础版本"
          subtitle="修改前原文"
          lines={conflict.diff.baseLines}
          accentColor="gray"
          badge={<span className="text-[10px] font-medium text-gray-500">BASE</span>}
        />
        <DiffColumn
          title={`用户 A：${conflict.leftAuthor}`}
          subtitle="左侧修改版本"
          lines={conflict.diff.leftLines}
          accentColor="blue"
          highlightActive={isPending || conflict.decision === 'left'}
          badge={
            <span className="flex items-center gap-1">
              <User size={10} className="text-blue-600" />
              <span className="text-[10px] font-semibold text-blue-700">LEFT</span>
            </span>
          }
        />
        <DiffColumn
          title={`用户 B：${conflict.rightAuthor}`}
          subtitle="右侧修改版本"
          lines={conflict.diff.rightLines}
          accentColor="green"
          highlightActive={isPending || conflict.decision === 'right'}
          badge={
            <span className="flex items-center gap-1">
              <User size={10} className="text-green-600" />
              <span className="text-[10px] font-semibold text-green-700">RIGHT</span>
            </span>
          }
        />
      </div>

      {conflict.resolvedContent && conflict.status === 'resolved' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h4 className="text-sm font-semibold text-emerald-800">已解决结果预览</h4>
            <span className="text-xs text-emerald-600">
              解决者：{conflict.resolvedBy} · {conflict.resolvedAt && new Date(conflict.resolvedAt).toLocaleString('zh-CN')}
            </span>
          </div>
          <pre className="text-sm text-emerald-900 bg-white/70 rounded-lg p-3 whitespace-pre-wrap font-mono border border-emerald-100">
{conflict.resolvedContent}
          </pre>
        </div>
      )}
    </div>
  );
}
