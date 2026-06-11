import { describe, it, expect, beforeEach } from 'vitest';
import { useMergeStore } from '../store/mergeStore';
import type { ParsedDocument, ParagraphDiff } from '../../shared/types';
import { detectConflicts, applyDecision, mergeDocuments, computeParagraphDiff } from '../utils/diffUtils';

function makeDoc(docId: string, paragraphs: ParsedDocument['paragraphs']): ParsedDocument {
  return { docId, paragraphs };
}

const BASE_DOC: ParsedDocument = makeDoc('doc-1', [
  { id: 'p1', index: 0, type: 'heading', level: 1, content: '# 标题一' },
  { id: 'p2', index: 1, type: 'paragraph', content: '第一段内容。' },
  { id: 'p3', index: 2, type: 'paragraph', content: '第二段内容。' },
  { id: 'p4', index: 3, type: 'paragraph', content: '第三段内容。' },
  { id: 'p5', index: 4, type: 'paragraph', content: '第四段内容。' },
]);

const LEFT_DOC: ParsedDocument = makeDoc('doc-1-left', [
  { id: 'p1', index: 0, type: 'heading', level: 1, content: '# 标题一（已修改）' },
  { id: 'p2', index: 1, type: 'paragraph', content: '第一段内容。' },
  { id: 'p3', index: 2, type: 'paragraph', content: '第二段被用户A修改。' },
  { id: 'p4', index: 3, type: 'paragraph', content: '第三段内容。' },
  { id: 'p5', index: 4, type: 'paragraph', content: '第四段被用户A修改。' },
]);

const RIGHT_DOC: ParsedDocument = makeDoc('doc-1-right', [
  { id: 'p1', index: 0, type: 'heading', level: 1, content: '# 标题一（用户B修改）' },
  { id: 'p2', index: 1, type: 'paragraph', content: '第一段内容。' },
  { id: 'p3', index: 2, type: 'paragraph', content: '第二段被用户B修改。' },
  { id: 'p4', index: 3, type: 'paragraph', content: '第三段内容。' },
  { id: 'p5', index: 4, type: 'paragraph', content: '第四段被用户B修改。' },
]);

describe('diffUtils', () => {
  describe('computeParagraphDiff', () => {
    it('should detect conflict when both sides modified the same paragraph', () => {
      const diff = computeParagraphDiff('p1', '# 标题一', '# 标题一（已修改）', '# 标题一（用户B修改）');
      expect(diff.hasConflict).toBe(true);
      expect(diff.leftLines.some(l => l.type !== 'unchanged')).toBe(true);
      expect(diff.rightLines.some(l => l.type !== 'unchanged')).toBe(true);
    });

    it('should not detect conflict when only one side modified', () => {
      const diff = computeParagraphDiff('p2', '第一段内容。', '第一段内容。', '第一段内容。');
      expect(diff.hasConflict).toBe(false);
    });

    it('should not detect conflict when both sides made identical changes', () => {
      const diff = computeParagraphDiff('p3', '原文', '相同修改', '相同修改');
      expect(diff.hasConflict).toBe(false);
      expect(diff.leftLines.some(l => l.type !== 'unchanged')).toBe(true);
    });
  });

  describe('detectConflicts', () => {
    it('should detect all paragraphs where both sides modified differently', () => {
      const { conflicts, autoMergedParagraphs } = detectConflicts(BASE_DOC, LEFT_DOC, RIGHT_DOC, 'A', 'B');
      expect(conflicts.length).toBe(3);
      expect(autoMergedParagraphs.length).toBe(0);

      const conflictIndices = conflicts.map(c => c.paragraphIndex).sort();
      expect(conflictIndices).toEqual([0, 2, 4]);
    });

    it('should auto-merge paragraphs where only one side changed', () => {
      const rightOnlyDoc = makeDoc('doc-right', [
        { id: 'p1', index: 0, type: 'heading', level: 1, content: '# 标题一' },
        { id: 'p2', index: 1, type: 'paragraph', content: '第一段被B修改。' },
      ]);
      const leftSameDoc = makeDoc('doc-left', [
        { id: 'p1', index: 0, type: 'heading', level: 1, content: '# 标题一' },
        { id: 'p2', index: 1, type: 'paragraph', content: '第一段内容。' },
      ]);
      const baseSame = makeDoc('doc-base', [
        { id: 'p1', index: 0, type: 'heading', level: 1, content: '# 标题一' },
        { id: 'p2', index: 1, type: 'paragraph', content: '第一段内容。' },
      ]);

      const { conflicts, autoMergedParagraphs } = detectConflicts(baseSame, leftSameDoc, rightOnlyDoc, 'A', 'B');
      expect(conflicts.length).toBe(0);
      expect(autoMergedParagraphs.length).toBe(1);
    });

    it('should assign leftAuthor and rightAuthor to conflicts', () => {
      const { conflicts } = detectConflicts(BASE_DOC, LEFT_DOC, RIGHT_DOC, '张明', '李华');
      for (const c of conflicts) {
        expect(c.leftAuthor).toBe('张明');
        expect(c.rightAuthor).toBe('李华');
      }
    });
  });

  describe('applyDecision', () => {
    const conflict = {
      id: 'c1',
      paragraphId: 'p1',
      paragraphIndex: 0,
      paragraphType: 'heading' as const,
      baseContent: '原文',
      leftContent: '左侧版本',
      rightContent: '右侧版本',
      leftAuthor: 'A',
      rightAuthor: 'B',
      status: 'pending' as const,
      diff: {} as ParagraphDiff,
    };

    it('should return left content for left choice', () => {
      expect(applyDecision(conflict, 'left')).toBe('左侧版本');
    });

    it('should return right content for right choice', () => {
      expect(applyDecision(conflict, 'right')).toBe('右侧版本');
    });

    it('should concatenate both sides for both choice', () => {
      expect(applyDecision(conflict, 'both')).toBe('左侧版本\n\n右侧版本');
    });

    it('should return custom content for custom choice', () => {
      expect(applyDecision(conflict, 'custom', '我的自定义')).toBe('我的自定义');
    });

    it('should fallback to base content for custom choice without content', () => {
      expect(applyDecision(conflict, 'custom')).toBe('原文');
    });
  });

  describe('mergeDocuments', () => {
    it('should apply resolved content for conflicts and auto-merge non-conflicts', () => {
      const resolved = new Map<string, string>();
      resolved.set('p1', '合并后的标题');
      resolved.set('p3', '合并后的第二段');

      const result = mergeDocuments(BASE_DOC, LEFT_DOC, RIGHT_DOC, resolved);
      const p1 = result.paragraphs.find(p => p.id === 'p1');
      const p2 = result.paragraphs.find(p => p.id === 'p2');
      const p3 = result.paragraphs.find(p => p.id === 'p3');

      expect(p1?.content).toBe('合并后的标题');
      expect(p2?.content).toBe('第一段内容。');
      expect(p3?.content).toBe('合并后的第二段');
    });
  });
});

describe('mergeStore', () => {
  beforeEach(() => {
    const store = useMergeStore.getState();
    store.initializeSession('doc-1', BASE_DOC, LEFT_DOC, RIGHT_DOC, '张明', '李华');
  });

  describe('initializeSession', () => {
    it('should create session with correct number of conflicts', () => {
      const { session } = useMergeStore.getState();
      expect(session).not.toBeNull();
      expect(session!.conflicts.length).toBe(3);
      expect(session!.history.length).toBe(0);
      expect(session!.isCompleted).toBe(false);
    });

    it('should select the first conflict by default', () => {
      const { selectedConflictId, session } = useMergeStore.getState();
      expect(selectedConflictId).toBe(session!.conflicts[0].id);
    });

    it('should have all conflicts in pending status', () => {
      const { session } = useMergeStore.getState();
      for (const c of session!.conflicts) {
        expect(c.status).toBe('pending');
      }
    });
  });

  describe('resolveConflict', () => {
    it('should resolve a conflict with left choice', () => {
      const store = useMergeStore.getState();
      const conflictId = store.session!.conflicts[0].id;
      store.resolveConflict(conflictId, 'left');

      const updated = useMergeStore.getState();
      const resolved = updated.session!.conflicts.find(c => c.id === conflictId);
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.decision).toBe('left');
      expect(resolved?.resolvedContent).toBe(LEFT_DOC.paragraphs[0].content);
    });

    it('should add history entry with paragraphIndex and contentSummary', () => {
      const store = useMergeStore.getState();
      const conflictId = store.session!.conflicts[0].id;
      store.resolveConflict(conflictId, 'right');

      const updated = useMergeStore.getState();
      const lastHistory = updated.session!.history[updated.session!.history.length - 1];
      expect(lastHistory.action).toBe('resolve');
      expect(lastHistory.decisions.length).toBe(1);
      expect(lastHistory.decisions[0].paragraphIndex).toBe(0);
      expect(lastHistory.decisions[0].contentSummary).toBeTruthy();
      expect(lastHistory.decisions[0].choice).toBe('right');
    });

    it('should not resolve an already resolved conflict', () => {
      const store = useMergeStore.getState();
      const conflictId = store.session!.conflicts[0].id;
      store.resolveConflict(conflictId, 'left');

      const afterFirst = useMergeStore.getState();
      const historyLen = afterFirst.session!.history.length;

      store.resolveConflict(conflictId, 'right');
      const afterSecond = useMergeStore.getState();
      expect(afterSecond.session!.history.length).toBe(historyLen);
    });

    it('should auto-select next pending conflict after resolution', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');

      const updated = useMergeStore.getState();
      const nextPending = updated.session!.conflicts.find(c => c.status === 'pending');
      expect(updated.selectedConflictId).toBe(nextPending?.id ?? null);
    });
  });

  describe('batchResolve', () => {
    it('should resolve all pending conflicts with left choice', () => {
      const store = useMergeStore.getState();
      const pendingIds = store.session!.conflicts
        .filter(c => c.status === 'pending')
        .map(c => c.id);

      store.batchResolve('left', pendingIds);

      const updated = useMergeStore.getState();
      const resolvedCount = updated.session!.conflicts.filter(c => c.status === 'resolved').length;
      expect(resolvedCount).toBe(3);
    });

    it('should create history entry with all decisions containing paragraphIndex', () => {
      const store = useMergeStore.getState();
      const pendingIds = store.session!.conflicts
        .filter(c => c.status === 'pending')
        .map(c => c.id);

      store.batchResolve('right', pendingIds);

      const updated = useMergeStore.getState();
      const lastHistory = updated.session!.history[updated.session!.history.length - 1];
      expect(lastHistory.action).toBe('batch-resolve');
      expect(lastHistory.decisions.length).toBe(3);
      for (const dec of lastHistory.decisions) {
        expect(dec.paragraphIndex).toBeGreaterThanOrEqual(0);
        expect(dec.contentSummary).toBeTruthy();
        expect(dec.choice).toBe('right');
      }
    });

    it('should not resolve already-resolved conflicts in batch', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');

      const afterOne = useMergeStore.getState();
      const remainingIds = afterOne.session!.conflicts
        .filter(c => c.status === 'pending')
        .map(c => c.id);

      store.batchResolve('right', remainingIds);

      const afterBatch = useMergeStore.getState();
      const firstConflict = afterBatch.session!.conflicts.find(c => c.id === firstId);
      expect(firstConflict?.decision).toBe('left');
    });
  });

  describe('undo - Bug Fix Verification', () => {
    it('BUG FIX: undo should preserve all previous history entries', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');

      const afterResolve = useMergeStore.getState();
      const resolveHistoryCount = afterResolve.session!.history.length;
      expect(resolveHistoryCount).toBe(1);

      store.undo();
      const afterUndo = useMergeStore.getState();

      expect(afterUndo.session!.history.length).toBe(2);
      expect(afterUndo.session!.history[0].action).toBe('resolve');
      expect(afterUndo.session!.history[1].action).toBe('undo');
    });

    it('BUG FIX: undo should populate decisions with paragraphIndex and contentSummary', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');
      store.undo();

      const afterUndo = useMergeStore.getState();
      const undoEntry = afterUndo.session!.history[afterUndo.session!.history.length - 1];
      expect(undoEntry.action).toBe('undo');
      expect(undoEntry.decisions.length).toBeGreaterThan(0);

      for (const dec of undoEntry.decisions) {
        expect(dec.paragraphIndex).toBeGreaterThanOrEqual(0);
        expect(dec.contentSummary).toBeTruthy();
        expect(dec.previousContent).toBeTruthy();
        expect(typeof dec.newContent).toBe('string');
      }
    });

    it('BUG FIX: undo after batch should have detailed decisions for each reversed conflict', () => {
      const store = useMergeStore.getState();
      const pendingIds = store.session!.conflicts
        .filter(c => c.status === 'pending')
        .map(c => c.id);

      store.batchResolve('left', pendingIds);
      store.undo();

      const afterUndo = useMergeStore.getState();
      const undoEntry = afterUndo.session!.history[afterUndo.session!.history.length - 1];
      expect(undoEntry.decisions.length).toBe(3);

      for (const dec of undoEntry.decisions) {
        expect(dec.paragraphIndex).toBeDefined();
        expect(typeof dec.paragraphIndex).toBe('number');
      }
    });

    it('BUG FIX: undo should not lose individual resolve history entries', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      const secondId = store.session!.conflicts[1].id;

      store.resolveConflict(firstId, 'left');
      store.resolveConflict(secondId, 'right');

      const beforeUndo = useMergeStore.getState();
      expect(beforeUndo.session!.history.length).toBe(2);

      store.undo();

      const afterUndo = useMergeStore.getState();
      expect(afterUndo.session!.history.length).toBe(3);
      expect(afterUndo.session!.history[0].action).toBe('resolve');
      expect(afterUndo.session!.history[1].action).toBe('resolve');
      expect(afterUndo.session!.history[2].action).toBe('undo');
    });

    it('should restore conflicts to pending state after undo', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');
      store.undo();

      const afterUndo = useMergeStore.getState();
      const conflict = afterUndo.session!.conflicts.find(c => c.id === firstId);
      expect(conflict?.status).toBe('pending');
      expect(conflict?.decision).toBeUndefined();
      expect(conflict?.resolvedContent).toBeUndefined();
    });

    it('should support multiple undo operations preserving history each time', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      const secondId = store.session!.conflicts[1].id;

      store.resolveConflict(firstId, 'left');
      store.resolveConflict(secondId, 'right');
      store.undo();
      store.undo();

      const afterDoubleUndo = useMergeStore.getState();
      expect(afterDoubleUndo.session!.history.length).toBe(4);
      expect(afterDoubleUndo.session!.history[0].action).toBe('resolve');
      expect(afterDoubleUndo.session!.history[1].action).toBe('resolve');
      expect(afterDoubleUndo.session!.history[2].action).toBe('undo');
      expect(afterDoubleUndo.session!.history[3].action).toBe('undo');

      const pendingCount = afterDoubleUndo.session!.conflicts.filter(c => c.status === 'pending').length;
      expect(pendingCount).toBe(3);
    });

    it('should correctly compute reversed decisions for batch undo', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;

      store.resolveConflict(firstId, 'left');

      const afterResolve = useMergeStore.getState();
      const remainingIds = afterResolve.session!.conflicts
        .filter(c => c.status === 'pending')
        .map(c => c.id);

      store.batchResolve('right', remainingIds);
      store.undo();

      const afterUndo = useMergeStore.getState();
      const undoEntry = afterUndo.session!.history[afterUndo.session!.history.length - 1];

      expect(undoEntry.decisions.length).toBe(2);
      for (const dec of undoEntry.decisions) {
        expect(dec.choice).toBe('right');
        expect(dec.previousContent).toBeTruthy();
      }
    });
  });

  describe('canUndo', () => {
    it('should return false when no snapshots exist', () => {
      const store = useMergeStore.getState();
      expect(store.canUndo()).toBe(false);
    });

    it('should return true after at least one operation', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');
      expect(useMergeStore.getState().canUndo()).toBe(true);
    });

    it('should return false after undoing all operations', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');
      store.undo();
      expect(useMergeStore.getState().canUndo()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct stats after operations', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');

      const stats = useMergeStore.getState().getStats();
      expect(stats.totalConflicts).toBe(3);
      expect(stats.resolvedConflicts).toBe(1);
      expect(stats.pendingConflicts).toBe(2);
    });

    it('should update stats after undo', () => {
      const store = useMergeStore.getState();
      const firstId = store.session!.conflicts[0].id;
      store.resolveConflict(firstId, 'left');
      store.undo();

      const stats = useMergeStore.getState().getStats();
      expect(stats.resolvedConflicts).toBe(0);
      expect(stats.pendingConflicts).toBe(3);
    });
  });

  describe('completeSession', () => {
    it('should fail when pending conflicts remain', () => {
      const store = useMergeStore.getState();
      const result = store.completeSession();
      expect(result).toBe(false);
      expect(useMergeStore.getState().session!.isCompleted).toBe(false);
    });

    it('should succeed when all conflicts are resolved', () => {
      const store = useMergeStore.getState();
      const pendingIds = store.session!.conflicts.map(c => c.id);
      store.batchResolve('left', pendingIds);

      const result = store.completeSession();
      expect(result).toBe(true);
      expect(useMergeStore.getState().session!.isCompleted).toBe(true);
    });
  });

  describe('hasPendingConflicts', () => {
    it('should return true when conflicts are pending', () => {
      expect(useMergeStore.getState().hasPendingConflicts()).toBe(true);
    });

    it('should return false when all conflicts are resolved', () => {
      const store = useMergeStore.getState();
      const pendingIds = store.session!.conflicts.map(c => c.id);
      store.batchResolve('left', pendingIds);
      expect(useMergeStore.getState().hasPendingConflicts()).toBe(false);
    });
  });

  describe('getMergedDocument', () => {
    it('should produce merged document with resolved content', () => {
      const store = useMergeStore.getState();
      const pendingIds = store.session!.conflicts.map(c => c.id);
      store.batchResolve('left', pendingIds);

      const merged = useMergeStore.getState().getMergedDocument();
      expect(merged).not.toBeNull();
      expect(merged!.paragraphs.length).toBe(BASE_DOC.paragraphs.length);

      const p1 = merged!.paragraphs.find(p => p.id === 'p1');
      expect(p1?.content).toBe(LEFT_DOC.paragraphs[0].content);
    });
  });
});
