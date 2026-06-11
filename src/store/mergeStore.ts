import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  MergeSession,
  MergeConflict,
  MergeDecision,
  MergeHistoryEntry,
  MergeStats,
  DecisionChoice,
  ParsedDocument,
} from '../../shared/types';
import { detectConflicts, applyDecision, mergeDocuments } from '../utils/diffUtils';

interface Snapshot {
  conflicts: MergeConflict[];
  history: MergeHistoryEntry[];
}

interface MergeStore {
  session: MergeSession | null;
  selectedConflictId: string | null;
  snapshots: Snapshot[];
  baseDoc: ParsedDocument | null;
  leftDoc: ParsedDocument | null;
  rightDoc: ParsedDocument | null;

  initializeSession: (
    docId: string,
    baseDoc: ParsedDocument,
    leftDoc: ParsedDocument,
    rightDoc: ParsedDocument,
    leftAuthor: string,
    rightAuthor: string
  ) => void;

  selectConflict: (conflictId: string | null) => void;
  resolveConflict: (
    conflictId: string,
    choice: DecisionChoice,
    customContent?: string,
    actor?: string
  ) => void;
  batchResolve: (
    choice: 'left' | 'right',
    conflictIds: string[],
    actor?: string
  ) => void;
  undo: () => void;
  canUndo: () => boolean;
  getStats: () => MergeStats;
  hasPendingConflicts: () => boolean;
  getResolvedContentMap: () => Map<string, string>;
  getMergedDocument: () => ParsedDocument | null;
  completeSession: () => boolean;
}

export const useMergeStore = create<MergeStore>((set, get) => ({
  session: null,
  selectedConflictId: null,
  snapshots: [],
  baseDoc: null,
  leftDoc: null,
  rightDoc: null,

  initializeSession: (docId, baseDoc, leftDoc, rightDoc, leftAuthor, rightAuthor) => {
    const { conflicts, autoMergedParagraphs } = detectConflicts(
      baseDoc,
      leftDoc,
      rightDoc,
      leftAuthor,
      rightAuthor
    );

    const session: MergeSession = {
      id: nanoid(),
      docId,
      baseVersion: 'v1',
      leftVersion: 'v2-A',
      rightVersion: 'v2-B',
      leftAuthor,
      rightAuthor,
      createdAt: new Date().toISOString(),
      conflicts,
      history: [],
      autoMergedParagraphs,
      isCompleted: false,
    };

    set({
      session,
      baseDoc,
      leftDoc,
      rightDoc,
      selectedConflictId: conflicts.length > 0 ? conflicts[0].id : null,
      snapshots: [],
    });
  },

  selectConflict: (conflictId) => {
    set({ selectedConflictId: conflictId });
  },

  resolveConflict: (conflictId, choice, customContent, actor = '当前用户') => {
    const { session, snapshots } = get();
    if (!session) return;

    const snapshot: Snapshot = {
      conflicts: JSON.parse(JSON.stringify(session.conflicts)),
      history: JSON.parse(JSON.stringify(session.history)),
    };

    const conflict = session.conflicts.find((c) => c.id === conflictId);
    if (!conflict || conflict.status === 'resolved') return;

    const resolvedContent = applyDecision(conflict, choice, customContent);
    const now = new Date().toISOString();

    const decision: MergeDecision = {
      id: nanoid(),
      conflictId,
      choice,
      customContent,
      madeAt: now,
      madeBy: actor,
      previousContent: conflict.baseContent,
      newContent: resolvedContent,
    };

    const historyEntry: MergeHistoryEntry = {
      id: nanoid(),
      action: 'resolve',
      decisions: [decision],
      timestamp: now,
      actor,
      description: `解决段落 #${conflict.paragraphIndex} 冲突：选择${
        choice === 'left' ? '左侧版本' : choice === 'right' ? '右侧版本' : choice === 'both' ? '合并两边' : '自定义内容'
      }`,
    };

    const updatedConflicts = session.conflicts.map((c) =>
      c.id === conflictId
        ? {
            ...c,
            status: 'resolved' as const,
            decision: choice,
            resolvedContent,
            resolvedAt: now,
            resolvedBy: actor,
          }
        : c
    );

    const firstPending = updatedConflicts.find((c) => c.status === 'pending');

    set({
      session: {
        ...session,
        conflicts: updatedConflicts,
        history: [...session.history, historyEntry],
      },
      selectedConflictId: firstPending?.id ?? null,
      snapshots: [...snapshots, snapshot],
    });
  },

  batchResolve: (choice, conflictIds, actor = '当前用户') => {
    const { session, snapshots } = get();
    if (!session) return;

    const snapshot: Snapshot = {
      conflicts: JSON.parse(JSON.stringify(session.conflicts)),
      history: JSON.parse(JSON.stringify(session.history)),
    };

    const now = new Date().toISOString();
    const decisions: MergeDecision[] = [];
    const updatedConflictIds = new Set<string>();

    const updatedConflicts = session.conflicts.map((c) => {
      if (conflictIds.includes(c.id) && c.status === 'pending') {
        const resolvedContent = applyDecision(c, choice);
        decisions.push({
          id: nanoid(),
          conflictId: c.id,
          choice,
          madeAt: now,
          madeBy: actor,
          previousContent: c.baseContent,
          newContent: resolvedContent,
        });
        updatedConflictIds.add(c.id);
        return {
          ...c,
          status: 'resolved' as const,
          decision: choice,
          resolvedContent,
          resolvedAt: now,
          resolvedBy: actor,
        };
      }
      return c;
    });

    if (decisions.length === 0) return;

    const historyEntry: MergeHistoryEntry = {
      id: nanoid(),
      action: 'batch-resolve',
      decisions,
      timestamp: now,
      actor,
      description: `批量解决 ${decisions.length} 个冲突：全部选择${choice === 'left' ? '左侧版本' : '右侧版本'}`,
    };

    const firstPending = updatedConflicts.find((c) => c.status === 'pending');

    set({
      session: {
        ...session,
        conflicts: updatedConflicts,
        history: [...session.history, historyEntry],
      },
      selectedConflictId: firstPending?.id ?? null,
      snapshots: [...snapshots, snapshot],
    });
  },

  undo: () => {
    const { session, snapshots } = get();
    if (!session || snapshots.length === 0) return;

    const lastSnapshot = snapshots[snapshots.length - 1];
    const now = new Date().toISOString();
    const actor = '当前用户';

    const currentResolvedMap = new Map(
      session.conflicts
        .filter((c) => c.status === 'resolved')
        .map((c) => [c.id, c])
    );

    const snapshotResolvedMap = new Map(
      lastSnapshot.conflicts
        .filter((c) => c.status === 'resolved')
        .map((c) => [c.id, c])
    );

    const reversedDecisions: MergeDecision[] = [];

    for (const [cid, currentConflict] of currentResolvedMap) {
      const snapConflict = snapshotResolvedMap.get(cid);
      if (!snapConflict) {
        reversedDecisions.push({
          id: nanoid(),
          conflictId: cid,
          choice: currentConflict.decision ?? 'left',
          madeAt: now,
          madeBy: actor,
          previousContent: currentConflict.resolvedContent ?? '',
          newContent: lastSnapshot.conflicts.find((c) => c.id === cid)?.baseContent ?? currentConflict.baseContent,
        });
      } else if (
        currentConflict.decision !== snapConflict.decision ||
        currentConflict.resolvedContent !== snapConflict.resolvedContent
      ) {
        reversedDecisions.push({
          id: nanoid(),
          conflictId: cid,
          choice: currentConflict.decision ?? 'left',
          madeAt: now,
          madeBy: actor,
          previousContent: currentConflict.resolvedContent ?? '',
          newContent: snapConflict.resolvedContent ?? snapConflict.baseContent,
        });
      }
    }

    const undoEntry: MergeHistoryEntry = {
      id: nanoid(),
      action: 'undo',
      decisions: reversedDecisions,
      timestamp: now,
      actor,
      description: reversedDecisions.length > 0
        ? `撤销上一步操作，恢复 ${reversedDecisions.length} 个冲突为待处理状态`
        : '撤销上一步操作',
    };

    set({
      session: {
        ...session,
        conflicts: lastSnapshot.conflicts,
        history: [...lastSnapshot.history, undoEntry],
      },
      snapshots: snapshots.slice(0, -1),
      selectedConflictId:
        lastSnapshot.conflicts.find((c) => c.status === 'pending')?.id ?? null,
    });
  },

  canUndo: () => {
    return get().snapshots.length > 0;
  },

  getStats: () => {
    const { session } = get();
    if (!session) {
      return {
        totalConflicts: 0,
        resolvedConflicts: 0,
        pendingConflicts: 0,
        autoResolvedConflicts: 0,
        totalParagraphs: 0,
        autoMergedParagraphs: 0,
      };
    }

    const totalConflicts = session.conflicts.length;
    const resolvedConflicts = session.conflicts.filter(
      (c) => c.status === 'resolved'
    ).length;
    const pendingConflicts = session.conflicts.filter(
      (c) => c.status === 'pending'
    ).length;
    const autoResolvedConflicts = session.conflicts.filter(
      (c) => c.status === 'auto-resolved'
    ).length;

    return {
      totalConflicts,
      resolvedConflicts,
      pendingConflicts,
      autoResolvedConflicts,
      totalParagraphs: (get().baseDoc?.paragraphs.length ?? 0),
      autoMergedParagraphs: session.autoMergedParagraphs.length,
    };
  },

  hasPendingConflicts: () => {
    const { session } = get();
    if (!session) return false;
    return session.conflicts.some((c) => c.status === 'pending');
  },

  getResolvedContentMap: () => {
    const { session } = get();
    const map = new Map<string, string>();
    if (!session) return map;

    for (const conflict of session.conflicts) {
      if (conflict.status === 'resolved' && conflict.resolvedContent) {
        map.set(conflict.paragraphId, conflict.resolvedContent);
      }
    }
    return map;
  },

  getMergedDocument: () => {
    const { baseDoc, leftDoc, rightDoc, getResolvedContentMap } = get();
    if (!baseDoc || !leftDoc || !rightDoc) return null;
    return mergeDocuments(baseDoc, leftDoc, rightDoc, getResolvedContentMap());
  },

  completeSession: () => {
    const { session, hasPendingConflicts } = get();
    if (!session || hasPendingConflicts()) return false;

    set({
      session: {
        ...session,
        isCompleted: true,
      },
    });
    return true;
  },
}));
