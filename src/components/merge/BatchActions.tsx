import { useState, useCallback } from 'react';
import {
  Layers,
  ArrowLeftCircle,
  ArrowRightCircle,
  Undo2,
  Save,
  FileCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { MergeStats, MergeConflict } from '../../../shared/types';
import { useMergeStore } from '../../store/mergeStore';
import { ConfirmDialog, type ConfirmDialogConfig } from './ConfirmDialog';
import { useToast, type ToastType } from './useToast';
import { ToastContainer } from './Toast';

interface BatchActionsProps {
  stats: MergeStats;
  conflicts: MergeConflict[];
}

type ConfirmTarget = null | 'all-left' | 'all-right' | 'save';

export function BatchActions({ stats, conflicts }: BatchActionsProps) {
  const batchResolve = useMergeStore((s) => s.batchResolve);
  const undo = useMergeStore((s) => s.undo);
  const canUndo = useMergeStore((s) => s.canUndo);
  const completeSession = useMergeStore((s) => s.completeSession);
  const hasPending = useMergeStore((s) => s.hasPendingConflicts());

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const { toasts, addToast, removeToast } = useToast();

  const pendingConflicts = conflicts.filter((c) => c.status === 'pending');
  const pendingIds = pendingConflicts.map((c) => c.id);

  const affectedItems = pendingConflicts.map((c) => ({
    id: c.id,
    label: `段落 #${c.paragraphIndex}（${c.paragraphType === 'heading' ? '标题' : c.paragraphType === 'code' ? '代码' : c.paragraphType === 'list' ? '列表' : '段落'}）— ${c.baseContent.slice(0, 40)}${c.baseContent.length > 40 ? '…' : ''}`,
  }));

  const fireToast = useCallback(
    (message: string, type: ToastType = 'success', details?: string[]) => {
      addToast(message, type, details);
    },
    [addToast]
  );

  const handleBatchLeft = () => {
    if (pendingIds.length === 0) return;
    setConfirmTarget('all-left');
  };

  const handleBatchRight = () => {
    if (pendingIds.length === 0) return;
    setConfirmTarget('all-right');
  };

  const handleSave = () => {
    if (hasPending) return;
    setConfirmTarget('save');
  };

  const handleUndo = () => {
    undo();
    fireToast('已撤销上一步操作', 'info');
  };

  const confirmConfig: ConfirmDialogConfig | null = confirmTarget
    ? {
        title:
          confirmTarget === 'save'
            ? '确认保存合并结果'
            : '确认批量操作',
        subtitle:
          confirmTarget === 'save'
            ? '保存后合并结果将不可再批量撤销'
            : `此操作将覆盖 ${pendingIds.length} 个未解决冲突的选择`,
        dangerLevel: confirmTarget === 'save' ? 'info' : 'danger',
        confirmText:
          confirmTarget === 'all-left'
            ? '全部接受左侧'
            : confirmTarget === 'all-right'
            ? '全部接受右侧'
            : '保存合并结果',
        affectedItems:
          confirmTarget !== 'save' ? affectedItems : undefined,
        detailContent:
          confirmTarget === 'all-left' ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              对所有 <span className="font-semibold text-blue-700">{pendingIds.length} 个待解决冲突</span>
              ，<strong>一律保留用户 A 的左侧版本</strong>。
            </p>
          ) : confirmTarget === 'all-right' ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              对所有 <span className="font-semibold text-green-700">{pendingIds.length} 个待解决冲突</span>
              ，<strong>一律保留用户 B 的右侧版本</strong>。
            </p>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed">
              文档共 <span className="font-semibold text-emerald-700">{stats.totalConflicts} 个冲突</span>
              已全部解决，自动合并段落 {stats.autoMergedParagraphs} 个。
            </p>
          ),
        onConfirm: () => {
          if (confirmTarget === 'all-left') {
            batchResolve('left', pendingIds);
            fireToast(
              `已批量保留 ${pendingIds.length} 个左侧版本`,
              'success',
              affectedItems.map((i) => i.label)
            );
          } else if (confirmTarget === 'all-right') {
            batchResolve('right', pendingIds);
            fireToast(
              `已批量保留 ${pendingIds.length} 个右侧版本`,
              'success',
              affectedItems.map((i) => i.label)
            );
          } else if (confirmTarget === 'save') {
            const ok = completeSession();
            if (ok) {
              fireToast('已保存最终合并结果！', 'success');
            }
          }
          setConfirmTarget(null);
        },
        onCancel: () => {
          setConfirmTarget(null);
        },
      }
    : null;

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
              onClick={handleBatchLeft}
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
              onClick={handleBatchRight}
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
            onClick={handleUndo}
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

      <ConfirmDialog config={confirmConfig} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
