import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, X, Check, Info } from 'lucide-react';
import { clsx } from 'clsx';

export interface ConfirmDialogConfig {
  title: string;
  subtitle?: string;
  dangerLevel?: 'warning' | 'danger' | 'info';
  confirmText: string;
  detailContent?: React.ReactNode;
  affectedItems?: { id: string; label: string }[];
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmDialogProps {
  config: ConfirmDialogConfig | null;
}

export function ConfirmDialog({ config }: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const confirmTextRef = useRef('');
  const onConfirmRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (config) {
      setInputValue('');
      confirmTextRef.current = config.confirmText;
      onConfirmRef.current = config.onConfirm;
    } else {
      confirmTextRef.current = '';
      onConfirmRef.current = null;
    }
  }, [config]);

  const isMatch = config ? inputValue === config.confirmText : false;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!config) return;
      if (inputValue !== confirmTextRef.current) return;
      if (onConfirmRef.current) {
        onConfirmRef.current();
      }
    },
    [config, inputValue]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (config) config.onCancel();
      }
    },
    [config]
  );

  if (!config) return null;

  const levelCfg = {
    warning: { headerBg: 'bg-amber-50', iconBg: 'bg-amber-200 text-amber-700', btnGradient: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' },
    danger: { headerBg: 'bg-red-50', iconBg: 'bg-red-200 text-red-700', btnGradient: 'from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600' },
    info: { headerBg: 'bg-emerald-50', iconBg: 'bg-emerald-200 text-emerald-700', btnGradient: 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600' },
  }[config.dangerLevel ?? 'warning'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
      onClick={config.onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx('px-5 py-4 flex items-center gap-3', levelCfg.headerBg)}>
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', levelCfg.iconBg)}>
            {config.dangerLevel === 'info' ? <Info size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800">{config.title}</h3>
            {config.subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{config.subtitle}</p>
            )}
          </div>
          <button
            onClick={config.onCancel}
            type="button"
            className="ml-auto w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center text-slate-500 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {config.detailContent && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                {config.detailContent}
              </div>
            )}

            {config.affectedItems && config.affectedItems.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">受影响的段落</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
                    {config.affectedItems.length} 项
                  </span>
                </div>
                <ul className="max-h-40 overflow-auto divide-y divide-slate-100">
                  {config.affectedItems.map((item) => (
                    <li key={item.id} className="px-3 py-2 text-xs text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                二次确认输入
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={config.confirmText}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                请输入「<span className="font-semibold text-slate-700">{config.confirmText}</span>」确认操作
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={config.onCancel}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!isMatch}
                className={clsx(
                  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  isMatch
                    ? `bg-gradient-to-r ${levelCfg.btnGradient} text-white shadow-sm`
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}
              >
                <Check size={15} />
                确认执行
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
