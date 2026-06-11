import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Combine,
  Pencil,
  Check,
  User,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { MergeConflict, DecisionChoice } from '../../../shared/types';
import { useMergeStore } from '../../store/mergeStore';

interface ConflictResolutionPanelProps {
  conflict: MergeConflict;
}

export function ConflictResolutionPanel({ conflict }: ConflictResolutionPanelProps) {
  const resolveConflict = useMergeStore((s) => s.resolveConflict);
  const [customMode, setCustomMode] = useState(false);
  const [customContent, setCustomContent] = useState(conflict.baseContent);
  const [hoveredChoice, setHoveredChoice] = useState<DecisionChoice | null>(null);

  useEffect(() => {
    setCustomMode(false);
    setCustomContent(conflict.baseContent);
  }, [conflict.id, conflict.baseContent]);

  const isResolved = conflict.status === 'resolved';
  const effectiveChoice = hoveredChoice ?? conflict.decision ?? null;

  const previewContent = (() => {
    if (customMode) return customContent;
    switch (effectiveChoice) {
      case 'left':
        return conflict.leftContent;
      case 'right':
        return conflict.rightContent;
      case 'both':
        return `${conflict.leftContent}\n\n${conflict.rightContent}`;
      default:
        return conflict.baseContent;
    }
  })();

  const handleResolve = (choice: DecisionChoice) => {
    if (choice === 'custom') {
      setCustomMode(true);
      return;
    }
    resolveConflict(conflict.id, choice);
  };

  const handleCustomConfirm = () => {
    resolveConflict(conflict.id, 'custom', customContent);
    setCustomMode(false);
  };

  interface ColorClassSet {
    active: string;
    idle: string;
    hover: string;
    resolved: string;
    iconBg: string;
    text: string;
  }
  const choiceButton = (
    choice: DecisionChoice,
    icon: React.ReactNode,
    label: string,
    description: string,
    colorClass: ColorClassSet,
    disabled = false
  ) => {
    const isActive = conflict.decision === choice;
    const isHovered = hoveredChoice === choice;
    return (
      <button
        onClick={() => handleResolve(choice)}
        onMouseEnter={() => setHoveredChoice(choice)}
        onMouseLeave={() => setHoveredChoice(null)}
        disabled={isResolved || disabled}
        className={clsx(
          'relative flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200 group',
          isActive && !isResolved && colorClass.active,
          !isActive && !isResolved && !disabled && colorClass.idle,
          !isActive && !isResolved && !disabled && colorClass.hover,
          isResolved && isActive && colorClass.resolved,
          isResolved && !isActive && 'opacity-60 bg-gray-50 border-gray-200 cursor-not-allowed',
          disabled && 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200',
          (isHovered || isActive) && 'shadow-md -translate-y-0.5'
        )}
      >
        {isActive && isResolved && (
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
            <Check size={14} />
          </div>
        )}
        <div className="flex items-center gap-2 mb-1.5">
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', colorClass.iconBg)}>
            {icon}
          </div>
          <div>
            <div className={clsx('font-semibold text-sm', colorClass.text)}>{label}</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-indigo-100">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Shield size={18} className="text-indigo-600" />
          冲突解决方案
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          选择如何处理此段落中的冲突修改
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {choiceButton(
            'left',
            <ArrowLeft size={16} className="text-blue-600" />,
            `保留用户 A`,
            `采用 ${conflict.leftAuthor} 的修改版本`,
            {
              active: 'border-blue-400 bg-blue-50',
              idle: 'border-gray-200 bg-white',
              hover: 'hover:border-blue-300 hover:bg-blue-50/50',
              resolved: 'border-blue-400 bg-blue-50',
              iconBg: 'bg-blue-100',
              text: 'text-blue-700',
            }
          )}
          {choiceButton(
            'right',
            <ArrowRight size={16} className="text-green-600" />,
            `保留用户 B`,
            `采用 ${conflict.rightAuthor} 的修改版本`,
            {
              active: 'border-green-400 bg-green-50',
              idle: 'border-gray-200 bg-white',
              hover: 'hover:border-green-300 hover:bg-green-50/50',
              resolved: 'border-green-400 bg-green-50',
              iconBg: 'bg-green-100',
              text: 'text-green-700',
            }
          )}
          {choiceButton(
            'both',
            <Combine size={16} className="text-purple-600" />,
            '合并两边',
            '同时保留双方修改，按顺序拼接',
            {
              active: 'border-purple-400 bg-purple-50',
              idle: 'border-gray-200 bg-white',
              hover: 'hover:border-purple-300 hover:bg-purple-50/50',
              resolved: 'border-purple-400 bg-purple-50',
              iconBg: 'bg-purple-100',
              text: 'text-purple-700',
            }
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-dashed border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400 font-medium">或</span>
          </div>
        </div>

        <button
          onClick={() => setCustomMode(!customMode)}
          disabled={isResolved}
          className={clsx(
            'w-full rounded-xl border-2 border-dashed p-3 text-sm font-medium transition-all flex items-center justify-center gap-2',
            customMode
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : isResolved
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-600 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700'
          )}
        >
          <Pencil size={15} />
          {customMode ? '关闭自定义编辑' : '手动编辑合并内容'}
        </button>

        {customMode && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <textarea
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              disabled={isResolved}
              className="w-full h-32 rounded-lg border border-amber-200 bg-white p-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-y"
              placeholder="在此输入自定义合并后的内容..."
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <User size={12} />
                <span>手动编辑模式，可自由组合两边内容</span>
              </div>
              <button
                onClick={handleCustomConfirm}
                disabled={isResolved || !customContent.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-sm"
              >
                <Check size={14} />
                确认自定义内容
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">结果预览</span>
              {effectiveChoice && !isResolved && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                  {effectiveChoice === 'left'
                    ? `用户 A · ${conflict.leftAuthor}`
                    : effectiveChoice === 'right'
                    ? `用户 B · ${conflict.rightAuthor}`
                    : effectiveChoice === 'both'
                    ? '合并双方'
                    : '自定义编辑'}
                </span>
              )}
              {isResolved && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  已确认
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {previewContent.length} 字符
            </span>
          </div>
          <div className="p-4 bg-white">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap break-all font-mono leading-relaxed min-h-[60px]">
{previewContent || <span className="text-slate-400 italic">（请选择合并方案查看预览）</span>}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
