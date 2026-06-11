import { useEffect, useState } from 'react';
import { Check, AlertCircle, Info, X, Eye, Copy, CheckCheck } from 'lucide-react';
import { clsx } from 'clsx';
import type { ToastItem } from './useToast';
import type { MergeDecision } from '../../../shared/types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  onShowDetails: (title: string, decisions: MergeDecision[], isUndo?: boolean) => void;
}

const iconMap = {
  success: <Check size={15} className="text-emerald-400" />,
  error: <AlertCircle size={15} className="text-red-400" />,
  info: <Info size={15} className="text-blue-400" />,
};

interface ToastItemViewProps {
  item: ToastItem;
  onRemove: (id: string) => void;
  onShowDetails: (title: string, decisions: MergeDecision[], isUndo?: boolean) => void;
}

function ToastItemView({ item, onRemove, onShowDetails }: ToastItemViewProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const autoCloseMs = item.autoCloseMs ?? (item.decisions && item.decisions.length > 0 ? 30000 : 6000);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(item.id), 300);
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [item.id, item.autoCloseMs, item.decisions, onRemove]);

  const handleCopyDetails = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.details || item.details.length === 0) return;
    try {
      await navigator.clipboard.writeText(item.details.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const hasDetails = item.decisions && item.decisions.length > 0;

  return (
    <div
      className={clsx(
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className="inline-flex flex-col items-stretch rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 overflow-hidden min-w-[320px] max-w-[520px]">
        <div className="flex items-center gap-2 px-4 py-3">
          {iconMap[item.type]}
          <span className="text-sm font-medium flex-1">{item.message}</span>
          {item.details && item.details.length > 0 && (
            <button
              onClick={handleCopyDetails}
              className={clsx(
                'w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center transition-colors',
                copied ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
              )}
              title={copied ? '已复制' : '复制列表'}
            >
              {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
            </button>
          )}
          {hasDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails(item.message, item.decisions!, item.isUndo);
              }}
              className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="查看完整变更详情"
            >
              <Eye size={13} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
              setTimeout(() => onRemove(item.id), 300);
            }}
            className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        </div>
        {item.details && item.details.length > 0 && (
          <div className="border-t border-slate-700/50 bg-slate-800/50 px-4 py-2 max-h-40 overflow-auto">
            <ul className="space-y-0.5">
              {item.details.map((d, i) => (
                <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0 mt-1.5" />
                  <span className="flex-1 break-all">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasDetails && (
          <div className="border-t border-slate-700/50 bg-slate-800/50 px-4 py-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {item.decisions!.length} 个段落受影响
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails(item.message, item.decisions!, item.isUndo);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Eye size={11} />
              查看完整变更对比
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove, onShowDetails }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <ToastItemView key={t.id} item={t} onRemove={onRemove} onShowDetails={onShowDetails} />
      ))}
    </div>
  );
}
