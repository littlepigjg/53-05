import { useState, useEffect } from 'react';
import {
  Layers,
  ArrowLeftCircle,
  ArrowRightCircle,
  AlertTriangle,
  X,
  Check,
  Undo2,
  Save,
  FileCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { MergeStats, MergeConflict } from '../../../shared/types';
import { useMergeStore } from '../../store/mergeStore';

interface BatchActionsProps {
  stats: MergeStats;
  conflicts: MergeConflict[];
}

type ConfirmState = null | 'all-left' | 'all-right' | 'save';

export function BatchActions({ stats, conflicts }: BatchActionsProps) {
  const batchResolve = useMergeStore((s) => s.batchResolve);
  const undo = useMergeStore((s) => s.undo);
  const canUndo = useMergeStore((s) => s.canUndo);
  const completeSession = useMergeStore((s) => s.completeSession);
  const hasPending = useMergeStore((s) => s.hasPendingConflicts());

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmText, setConfirmText] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (confirm) setConfirmText('');
  }, [confirm]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const pendingIds = conflicts
    .filter((c) => c.status === 'pending')
    .map((c) => c.id);

  const handleBatchAction = (choice: 'left' | 'right') => {
    if (pendingIds.length === 0) return;
    setConfirm(choice === 'left' ? 'all-left' : 'all-right');
  };

  const confirmBatchAction = () => {
    if (confirm === 'all-left') {
      batchResolve('left', pendingIds);
      setToast(`已批量保留 ${pendingIds.length} 个左侧版本`);
      setConfirm(null);
      return;
    }
    if (confirm === 'all-right') {
      batchResolve('right', pendingIds);
      setToast(`已批量保留 ${pendingIds.length} 个右侧版本`);
      setConfirm(null);
      return;
    }
    if (confirm === 'save') {
      const ok = completeSession();
      if (ok) {
        setToast('已保存最终合并结果！');
      }
      setConfirm(null);
    }
  };

  const handleSave = () => {
    if (hasPending) return;
    setConfirm('save');
  };

  const confirmationPrompt =
    confirm === 'all-left'
      ? `请输入 "全部接受左侧" 确认批量操作`
      : confirm === 'all-right'
      ? `请输入 "全部接受右侧" 确认批量操作`
      : confirm === 'save'
      ? `请输入 "保存合并结果" 确认`
      : '';
  const confirmationMatch =
    confirm === 'all-left'
      ? confirmText === '全部接受左侧'
      : confirm === 'all-right'
      ? confirmText === '全部接受右侧'
      : confirm === 'save'
      ? confirmText === '保存合并结果'
      : false;

  const progressPct =
    stats.totalConflicts > 0
      ? Math.round((stats.resolvedConflicts / stats.totalConflicts) * 100)
      : 100;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-zinc-50 px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Layers size={18} className="text-slate-600" />
              合并进度
            </h3>
            <span className="text-xs px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 font-medium">
              {stats.resolvedConflicts}/{stats.totalConflicts} 已解决
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500 ease-out',
                hasPending
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3 border-b border-slate-100">
          <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowLeftCircle size={14} className="text-blue-600" />
              <span className="text-[11px] font-semibold text-blue-700">左侧修改数</span>
            </div>
            <div className="text-xl font-bold text-blue-800">
              {conflicts.filter((c) => c.leftContent !== c.baseContent).length}
            </div>
          </div>
          <div className="rounded-xl bg-green-50/50 border border-green-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightCircle size={14} className="text-green-600" />
              <span className="text-[11px] font-semibold text-green-700">右侧修改数</span>
            </div>
            <div className="text-xl font-bold text-green-800">
              {conflicts.filter((c) => c.rightContent !== c.baseContent).length}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleBatchAction('left')}
              disabled={pendingIds.length === 0}
              className={clsx(
                'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border-2',
                pendingIds.length === 0
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0'
              )}
            >
              <ArrowLeftCircle size={14} />
              全部保留左侧
              {pendingIds.length > 0 && (
                <span className="ml-0.5 text-[10px] bg-blue-100 px-1.5 py-0.5 rounded-full">
                  {pendingIds.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleBatchAction('right')}
              disabled={pendingIds.length === 0}
              className={clsx(
                'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border-2',
                pendingIds.length === 0
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0'
              )}
            >
              <ArrowRightCircle size={14} />
              全部保留右侧
              {pendingIds.length > 0 && (
                <span className="ml-0.5 text-[10px] bg-green-100 px-1.5 py-0.5 rounded-full">
                  {pendingIds.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={undo}
            disabled={!canUndo()}
            className={clsx(
              'w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border-2',
              canUndo()
                ? 'bg-white border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300'
                : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            <Undo2 size={14} />
            撤销上一步
          </button>

          <button
            onClick={handleSave}
            disabled={hasPending}
            className={clsx(
              'w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm',
              hasPending
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 hover:shadow-md hover:-translate-y-0.5'
            )}
          >
            <Save size={15} />
            {hasPending ? `还有 ${stats.pendingConflicts} 个冲突待解决` : '保存并完成合并'}
            {!hasPending && <FileCheck size={15} />}
          </button>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div
              className={clsx(
                'px-5 py-4 flex items-center gap-3',
                confirm === 'save' ? 'bg-emerald-50' : 'bg-amber-50'
              )}
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  confirm === 'save' ? 'bg-emerald-200 text-emerald-700' : 'bg-amber-200 text-amber-700'
                )}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">
                  {confirm === 'save' ? '确认保存合并结果' : '确认批量操作'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {confirm === 'save'
                    ? '保存后合并结果将不可再批量撤销'
                    : `此操作将覆盖 ${pendingIds.length} 个未解决冲突的选择`}
                </p>
              </div>
              <button
                onClick={() => setConfirm(null)}
                className="ml-auto w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center text-slate-500 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">操作详情</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {confirm === 'all-left' && (
                    <>
                      对所有 <span className="font-semibold text-blue-700">{pendingIds.length} 个待解决冲突</span>
                      ，<strong>一律保留用户 A 的左侧版本</strong>。
                    </>
                  )}
                  {confirm === 'all-right' && (
                    <>
                      对所有 <span className="font-semibold text-green-700">{pendingIds.length} 个待解决冲突</span>
                      ，<strong>一律保留用户 B 的右侧版本</strong>。
                    </>
                  )}
                  {confirm === 'save' && (
                    <>
                      文档共 <span className="font-semibold text-emerald-700">{stats.totalConflicts} 个冲突</span>
                      已全部解决，自动合并段落 {stats.autoMergedParagraphs} 个。
                    </>
                  )}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  二次确认输入
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmationPrompt.split('"')[1] || ''}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5">{confirmationPrompt}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setConfirm(null)}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmBatchAction}
                  disabled={!confirmationMatch}
                  className={clsx(
                    'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    confirmationMatch
                      ? confirm === 'save'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-sm'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-sm'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Check size={15} />
                  确认执行
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-2xl border border-slate-700">
            <Check size={15} className="text-emerald-400" />
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
