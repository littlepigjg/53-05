import { useEffect, useState } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { ToastItem } from './useToast';

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const iconMap = {
  success: <Check size={15} className="text-emerald-400" />,
  error: <AlertCircle size={15} className="text-red-400" />,
  info: <Info size={15} className="text-blue-400" />,
};

function ToastItemView({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(item.id), 300);
    }, item.details ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [item.id, item.details, onRemove]);

  return (
    <div
      className={clsx(
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className="inline-flex flex-col items-stretch rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 overflow-hidden min-w-[280px] max-w-[420px]">
        <div className="flex items-center gap-2 px-4 py-2.5">
          {iconMap[item.type]}
          <span className="text-sm font-medium flex-1">{item.message}</span>
          <button
            onClick={() => { setVisible(false); setTimeout(() => onRemove(item.id), 300); }}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
        {item.details && item.details.length > 0 && (
          <div className="border-t border-slate-700/50 bg-slate-800/50 px-4 py-2 max-h-32 overflow-auto">
            <ul className="space-y-0.5">
              {item.details.map((d, i) => (
                <li key={i} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <ToastItemView key={t.id} item={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
