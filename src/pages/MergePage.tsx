import { useEffect } from 'react';
import { useMergeStore } from '../store/mergeStore';
import { ConflictList } from '../components/merge/ConflictList';
import { ThreeWayDiffView } from '../components/merge/ThreeWayDiffView';
import { ConflictResolutionPanel } from '../components/merge/ConflictResolutionPanel';
import { MergeHistoryPanel } from '../components/merge/MergeHistoryPanel';
import { BatchActions } from '../components/merge/BatchActions';
import type { ParsedDocument } from '../../shared/types';
import {
  GitMerge,
  FileText,
  BookOpen,
  Code,
} from 'lucide-react';

const BASE_DOC: ParsedDocument = {
  docId: 'demo-doc-001',
  paragraphs: [
    {
      id: 'p1',
      index: 0,
      type: 'heading',
      level: 1,
      content: '# 产品需求规格说明书\n\n## 概述\n\n本文档详细描述了 V2.0 版本的核心功能需求与设计规范。',
    },
    {
      id: 'p2',
      index: 1,
      type: 'heading',
      level: 2,
      content: '## 第三章 数据模型设计\n\n本章介绍系统中的核心数据结构及其关系。',
    },
    {
      id: 'p3',
      index: 2,
      type: 'paragraph',
      content:
        '用户数据模型包含基本信息字段：用户名、邮箱地址、联系电话。\n密码字段采用加密存储，不允许明文访问。\n角色字段用于权限控制，支持多角色配置。',
    },
    {
      id: 'p4',
      index: 3,
      type: 'code',
      content:
        'interface User {\n  id: string;\n  username: string;\n  email: string;\n  phone: string;\n  roles: string[];\n  createdAt: Date;\n}',
    },
    {
      id: 'p5',
      index: 4,
      type: 'paragraph',
      content:
        '订单数据模型关联用户与商品信息，支持状态流转跟踪。\n订单号采用雪花算法生成，保证全局唯一性。',
    },
    {
      id: 'p6',
      index: 5,
      type: 'list',
      content:
        '- 待支付：用户下单后未完成支付\n- 已支付：支付成功等待发货\n- 已发货：商品已出库配送中\n- 已完成：用户确认收货\n- 已取消：订单被关闭退款',
    },
  ],
};

const LEFT_DOC: ParsedDocument = {
  docId: 'demo-doc-001-left',
  paragraphs: [
    {
      id: 'p1',
      index: 0,
      type: 'heading',
      level: 1,
      content: '# 产品需求规格说明书\n\n## 概述\n\n本文档详细描述了 V2.1 版本的核心功能需求、设计规范与验收标准。',
    },
    {
      id: 'p2',
      index: 1,
      type: 'heading',
      level: 2,
      content: '## 第三章 数据模型与架构设计\n\n本章介绍系统中的核心数据结构、关系映射与整体架构选型。',
    },
    {
      id: 'p3',
      index: 2,
      type: 'paragraph',
      content:
        '用户数据模型包含基本信息字段：用户名、邮箱地址、联系电话、头像 URL。\n密码字段采用 bcrypt 加盐哈希存储，绝对禁止明文访问或日志记录。\n角色字段用于 RBAC 权限控制，支持多角色叠加配置。\n新增状态字段用于账户启用/禁用管理。',
    },
    {
      id: 'p4',
      index: 3,
      type: 'code',
      content:
        'interface User {\n  id: string;\n  username: string;\n  email: string;\n  phone: string;\n  avatarUrl?: string;\n  roles: string[];\n  status: "active" | "disabled";\n  createdAt: Date;\n  updatedAt: Date;\n}',
    },
    {
      id: 'p5',
      index: 4,
      type: 'paragraph',
      content:
        '订单数据模型关联用户与商品信息，支持完整的状态流转跟踪。\n订单号采用雪花算法（Snowflake）生成，保证全局唯一性与时间有序性。',
    },
    {
      id: 'p6',
      index: 5,
      type: 'list',
      content:
        '- 待支付：用户下单后未完成支付\n- 已支付：支付成功等待发货\n- 已发货：商品已出库配送中\n- 已完成：用户确认收货\n- 已取消：订单被关闭退款',
    },
  ],
};

const RIGHT_DOC: ParsedDocument = {
  docId: 'demo-doc-001-right',
  paragraphs: [
    {
      id: 'p1',
      index: 0,
      type: 'heading',
      level: 1,
      content: '# 产品需求规格说明书\n\n## 概述\n\n本文档详细描述了 V2.0 Enterprise 版本的核心功能需求与设计规范。',
    },
    {
      id: 'p2',
      index: 1,
      type: 'heading',
      level: 2,
      content: '## 第三章 企业级数据模型设计\n\n本章介绍面向企业场景的核心数据结构、审计字段及关系约束。',
    },
    {
      id: 'p3',
      index: 2,
      type: 'paragraph',
      content:
        '用户数据模型包含基本信息字段：用户名、邮箱地址、联系电话、所属部门 ID。\n密码字段采用 Argon2id 加密存储，不允许明文访问，支持密码历史策略。\n角色字段用于权限控制，支持多角色配置与继承关系。',
    },
    {
      id: 'p4',
      index: 3,
      type: 'code',
      content:
        'interface User {\n  id: string;\n  username: string;\n  email: string;\n  phone: string;\n  departmentId: string;\n  roles: Role[];\n  passwordHash: string;\n  lastLoginAt?: Date;\n  createdAt: Date;\n}',
    },
    {
      id: 'p5',
      index: 4,
      type: 'paragraph',
      content:
        '订单数据模型关联用户与商品信息，支持状态流转跟踪与操作审计日志。\n订单号采用分布式 ID 生成器（UUID v7），保证全局唯一性。',
    },
    {
      id: 'p6',
      index: 5,
      type: 'list',
      content:
        '- 待支付：用户下单后未完成支付，超时 30 分钟自动取消\n- 已支付：支付成功等待发货，自动通知仓储系统\n- 已发货：商品已出库配送中，支持物流信息追踪\n- 已完成：用户确认收货，7 天后自动结算\n- 已取消：订单被关闭退款，记录取消原因',
    },
  ],
};

export function MergePage() {
  const session = useMergeStore((s) => s.session);
  const selectedConflictId = useMergeStore((s) => s.selectedConflictId);
  const selectConflict = useMergeStore((s) => s.selectConflict);
  const initializeSession = useMergeStore((s) => s.initializeSession);
  const getStats = useMergeStore((s) => s.getStats);
  const getMergedDocument = useMergeStore((s) => s.getMergedDocument);

  useEffect(() => {
    initializeSession(
      'demo-doc-001',
      BASE_DOC,
      LEFT_DOC,
      RIGHT_DOC,
      '张明（产品部）',
      '李华（架构组）'
    );
  }, [initializeSession]);

  const stats = getStats();
  const selectedConflict = session?.conflicts.find((c) => c.id === selectedConflictId) ?? null;
  const mergedDoc = getMergedDocument();

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">正在初始化合并会话...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <GitMerge size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                文档差异合并冲突解决器
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <FileText size={11} />
                产品需求规格说明书
                <span className="text-slate-300">·</span>
                基础版本 v1
                <span className="text-slate-300">·</span>
                <span className="text-blue-600">{session.leftAuthor}</span>
                <span className="text-slate-400">vs</span>
                <span className="text-green-600">{session.rightAuthor}</span>
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
              会话 ID：{session.id.slice(0, 8)}
            </span>
            {session.isCompleted && (
              <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold">
                ✓ 合并已完成
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-2 space-y-4">
            <div className="h-[calc(100vh-200px)]">
              <ConflictList
                conflicts={session.conflicts}
                selectedId={selectedConflictId}
                onSelect={selectConflict}
              />
            </div>
          </aside>

          <section className="col-span-7 space-y-4">
            {selectedConflict ? (
              <>
                <ThreeWayDiffView conflict={selectedConflict} history={session.history} />
                <ConflictResolutionPanel conflict={selectedConflict} />
              </>
            ) : session.conflicts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={30} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">没有检测到冲突</h2>
                <p className="text-sm text-slate-500 mb-4">
                  系统已自动合并 {session.autoMergedParagraphs.length} 个非冲突段落
                </p>
              </div>
            ) : stats.pendingConflicts === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-10 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                  <Code size={36} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-emerald-800 mb-1">所有冲突已解决！</h2>
                  <p className="text-sm text-emerald-600">
                    请在右侧工具栏点击"保存并完成合并"按钮
                  </p>
                </div>
                {mergedDoc && (
                  <div className="text-left bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 mt-4 max-h-96 overflow-auto">
                    <p className="text-xs font-semibold text-emerald-700 mb-3">最终合并结果预览</p>
                    <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
{mergedDoc.paragraphs.map((p) => p.content).join('\n\n───\n\n')}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <p className="text-slate-500 text-sm">请从左侧列表选择一个冲突进行处理</p>
              </div>
            )}
          </section>

          <aside className="col-span-3 space-y-4">
            <BatchActions stats={stats} conflicts={session.conflicts} />
            <div className="h-[calc(100vh-420px)]">
              <MergeHistoryPanel
                history={session.history}
                conflicts={session.conflicts}
                onJumpToConflict={(id) => selectConflict(id)}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
