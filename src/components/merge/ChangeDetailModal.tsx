import { useState } from 'react';
import { X, Copy, Check, ArrowRight, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { MergeDecision } from '../../../shared/types';

export interface ChangeDetailModalProps {
  title: string;
  subtitle?: string;
  decisions: MergeDecision[];
  isUndo?: boolean;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  heading: '标题',
  paragraph: '段落',
  list: '列表',
  code: '代码块',
  quote: '引用',
  table: '表格',
};

export function ChangeDetailModal({ title, subtitle, decisions, isUndo, onClose }: ChangeDetailModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(decisions.map(d => d.id)));

  const toggle = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const copyContent = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  const copyAll = async () => {
    const lines: string[] = [];
    for (const d of decisions) {
      lines.push(`=== 段落 #${d.paragraphIndex}（${TYPE_LABEL[d.paragraphType] ?? d.paragraphType}）===\n`);
      lines.push(`[决策] ${d.choice === 'left' ? '保留左侧' : d.choice === 'right' ? '保留右侧' : d.choice === 'both' ? '合并两边' : '自定义'}\n`);
      lines.push(`修改前:\n${d.previousContent}\n\n`);
      lines.push(`修改后:\n${d.newContent}\n\n`);
    }
    try {
      await navigator.clipboard.writeText(lines.join(''));
      setCopiedId('__all__');
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx(
          'px-6 py-4 border-b flex items-start gap-3',
          isUndo ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'
        )}>
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            isUndo ? 'bg-orange-200 text-orange-700' : 'bg-slate-200 text-slate-700'
          )}>
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              共 {decisions.length} 个段落受影响
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyAll}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                copiedId === '__all__'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              )}
            >
              {copiedId === '__all__' ? <Check size={12} /> : <Copy size={12} />}
              {copiedId === '__all__' ? '已复制全部' : '复制全部'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center text-slate-500 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4 bg-slate-50/50">
          {decisions.map((dec) => {
            const expanded = expandedIds.has(dec.id);
            const choiceLabel =
              isUndo
                ? `撤销${dec.choice === 'left' ? '左侧' : dec.choice === 'right' ? '右侧' : dec.choice === 'both' ? '合并' : '自定义'}决策`
                : dec.choice === 'left'
                ? '保留左侧版本'
                : dec.choice === 'right'
                ? '保留右侧版本'
                : dec.choice === 'both'
                ? '合并两边内容'
                : '自定义内容';
            const choiceCls =
              isUndo
                ? 'bg-orange-100 text-orange-700'
                : dec.choice === 'left'
                ? 'bg-blue-100 text-blue-700'
                : dec.choice === 'right'
                ? 'bg-green-100 text-green-700'
                : dec.choice === 'both'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-amber-100 text-amber-700';
            const isCode = dec.paragraphType === 'code';

            return (
              <div
                key={dec.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => toggle(dec.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                >
                  {expanded ? <ChevronDown size={15} className="text-slate-400 shrink-0" /> : <ChevronRight size={15} className="text-slate-400 shrink-0" />}
                  <span className="text-sm font-bold text-slate-700 shrink-0">
                    段落 #{dec.paragraphIndex}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                    {TYPE_LABEL[dec.paragraphType] ?? dec.paragraphType}
                  </span>
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0', choiceCls)}>
                    {choiceLabel}
                  </span>
                  <span className="text-xs text-slate-500 truncate flex-1 min-w-0">
                    {dec.contentSummary}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {dec.madeBy} · {new Date(dec.madeAt).toLocaleTimeString('zh-CN')}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-slate-200">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-0 items-stretch">
                      <div className="border-r border-slate-200">
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-600">
                            {isUndo ? '被撤销的原内容' : '修改前内容'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyContent(`${dec.id}-prev`, dec.previousContent); }}
                            className={clsx(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors',
                              copiedId === `${dec.id}-prev`
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                            )}
                          >
                            {copiedId === `${dec.id}-prev` ? <Check size={10} /> : <Copy size={10} />}
                            {copiedId === `${dec.id}-prev` ? '已复制' : '复制'}
                          </button>
                        </div>
                        <pre className={clsx(
                          'p-3 text-xs whitespace-pre-wrap break-all leading-relaxed max-h-60 overflow-auto',
                          isCode ? 'bg-red-50 text-red-800' : 'bg-red-50/40 text-slate-700'
                        )}>
{dec.previousContent || '（空）'}
                        </pre>
                      </div>

                      <div className="w-8 bg-slate-50 border-r border-slate-200 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-sm">
                          <ArrowRight size={13} className="text-slate-500" />
                        </div>
                      </div>

                      <div>
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-600">
                            {isUndo ? '撤销回退后的内容' : '修改后内容'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyContent(`${dec.id}-new`, dec.newContent); }}
                            className={clsx(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors',
                              copiedId === `${dec.id}-new`
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                            )}
                          >
                            {copiedId === `${dec.id}-new` ? <Check size={10} /> : <Copy size={10} />}
                            {copiedId === `${dec.id}-new` ? '已复制' : '复制'}
                          </button>
                        </div>
                        <pre className={clsx(
                          'p-3 text-xs whitespace-pre-wrap break-all leading-relaxed max-h-60 overflow-auto',
                          isCode ? 'bg-green-50 text-green-800' : 'bg-green-50/40 text-slate-700'
                        )}>
{dec.newContent || '（空）'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            提示：点击段落行可折叠/展开，每项内容和全部内容均支持复制
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
