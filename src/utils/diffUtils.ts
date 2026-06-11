import type {
  Paragraph,
  DiffLine,
  DiffLineType,
  ParagraphDiff,
  MergeConflict,
  ParsedDocument,
} from '../../shared/types';
import { nanoid } from 'nanoid';

export function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

export function computeLineDiff(baseLines: string[], modifiedLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const m = baseLines.length;
  const n = modifiedLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (baseLines[i - 1] === modifiedLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const operations: { type: DiffLineType; content: string }[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && baseLines[i - 1] === modifiedLines[j - 1]) {
      operations.unshift({ type: 'unchanged', content: baseLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      operations.unshift({ type: 'added', content: modifiedLines[j - 1] });
      j--;
    } else {
      operations.unshift({ type: 'removed', content: baseLines[i - 1] });
      i--;
    }
  }

  const merged: { type: DiffLineType; content: string }[] = [];
  for (let k = 0; k < operations.length; k++) {
    const op = operations[k];
    if (op.type === 'removed' && k + 1 < operations.length && operations[k + 1].type === 'added') {
      merged.push({ type: 'modified', content: operations[k + 1].content });
      k++;
    } else if (op.type === 'added' && k + 1 < operations.length && operations[k + 1].type === 'removed') {
      merged.push({ type: 'modified', content: op.content });
      k++;
    } else {
      merged.push(op);
    }
  }

  let lineNum = 1;
  for (const op of merged) {
    result.push({
      lineNumber: lineNum++,
      content: op.content,
      type: op.type,
    });
  }

  return result;
}

export function computeParagraphDiff(
  paragraphId: string,
  baseContent: string,
  leftContent: string,
  rightContent: string
): ParagraphDiff {
  const baseLines = splitLines(baseContent);
  const leftLines = splitLines(leftContent);
  const rightLines = splitLines(rightContent);

  const leftDiff = computeLineDiff(baseLines, leftLines);
  const rightDiff = computeLineDiff(baseLines, rightLines);

  const baseDiffLines: DiffLine[] = baseLines.map((line, idx) => ({
    lineNumber: idx + 1,
    content: line,
    type: 'unchanged' as DiffLineType,
  }));

  const leftChanged = leftDiff.some((l) => l.type !== 'unchanged');
  const rightChanged = rightDiff.some((l) => l.type !== 'unchanged');
  const hasConflict = leftChanged && rightChanged && leftContent !== rightContent;

  return {
    paragraphId,
    baseLines: baseDiffLines,
    leftLines: leftDiff,
    rightLines: rightDiff,
    hasConflict,
  };
}

export function detectConflicts(
  baseDoc: ParsedDocument,
  leftDoc: ParsedDocument,
  rightDoc: ParsedDocument,
  leftAuthor: string,
  rightAuthor: string
): { conflicts: MergeConflict[]; autoMergedParagraphs: string[] } {
  const conflicts: MergeConflict[] = [];
  const autoMergedParagraphs: string[] = [];

  const allIndices = new Set<number>();
  baseDoc.paragraphs.forEach((p) => allIndices.add(p.index));
  leftDoc.paragraphs.forEach((p) => allIndices.add(p.index));
  rightDoc.paragraphs.forEach((p) => allIndices.add(p.index));

  const baseMap = new Map(baseDoc.paragraphs.map((p) => [p.index, p]));
  const leftMap = new Map(leftDoc.paragraphs.map((p) => [p.index, p]));
  const rightMap = new Map(rightDoc.paragraphs.map((p) => [p.index, p]));

  for (const idx of Array.from(allIndices).sort((a, b) => a - b)) {
    const basePara = baseMap.get(idx);
    const leftPara = leftMap.get(idx);
    const rightPara = rightMap.get(idx);

    const baseContent = basePara?.content ?? '';
    const leftContent = leftPara?.content ?? '';
    const rightContent = rightPara?.content ?? '';
    const paragraphId = basePara?.id ?? leftPara?.id ?? rightPara?.id ?? `para-${idx}`;
    const paragraphType = basePara?.type ?? leftPara?.type ?? rightPara?.type ?? 'paragraph';

    const diff = computeParagraphDiff(paragraphId, baseContent, leftContent, rightContent);

    const leftChanged = leftContent !== baseContent;
    const rightChanged = rightContent !== baseContent;

    if (diff.hasConflict) {
      conflicts.push({
        id: nanoid(),
        paragraphId,
        paragraphIndex: idx,
        paragraphType,
        baseContent,
        leftContent,
        rightContent,
        leftAuthor,
        rightAuthor,
        status: 'pending',
        diff,
      });
    } else if (leftChanged || rightChanged) {
      autoMergedParagraphs.push(paragraphId);
    }
  }

  return { conflicts, autoMergedParagraphs };
}

export function applyDecision(
  conflict: MergeConflict,
  choice: 'left' | 'right' | 'both' | 'custom',
  customContent?: string
): string {
  switch (choice) {
    case 'left':
      return conflict.leftContent;
    case 'right':
      return conflict.rightContent;
    case 'both':
      return `${conflict.leftContent}\n\n${conflict.rightContent}`;
    case 'custom':
      return customContent ?? conflict.baseContent;
    default:
      return conflict.baseContent;
  }
}

export function mergeDocuments(
  baseDoc: ParsedDocument,
  leftDoc: ParsedDocument,
  rightDoc: ParsedDocument,
  resolvedConflicts: Map<string, string>
): ParsedDocument {
  const baseMap = new Map(baseDoc.paragraphs.map((p) => [p.index, p]));
  const leftMap = new Map(leftDoc.paragraphs.map((p) => [p.index, p]));
  const rightMap = new Map(rightDoc.paragraphs.map((p) => [p.index, p]));
  const allIndices = new Set<number>();
  baseDoc.paragraphs.forEach((p) => allIndices.add(p.index));
  leftDoc.paragraphs.forEach((p) => allIndices.add(p.index));
  rightDoc.paragraphs.forEach((p) => allIndices.add(p.index));

  const mergedParagraphs: Paragraph[] = [];

  for (const idx of Array.from(allIndices).sort((a, b) => a - b)) {
    const basePara = baseMap.get(idx);
    const leftPara = leftMap.get(idx);
    const rightPara = rightMap.get(idx);

    const paragraphId = basePara?.id ?? leftPara?.id ?? rightPara?.id ?? `para-${idx}`;
    const paragraphType = basePara?.type ?? leftPara?.type ?? rightPara?.type ?? 'paragraph';
    const level = basePara?.level ?? leftPara?.level ?? rightPara?.level;

    let finalContent: string;
    const conflictKey = paragraphId;

    if (resolvedConflicts.has(conflictKey)) {
      finalContent = resolvedConflicts.get(conflictKey)!;
    } else {
      const baseContent = basePara?.content ?? '';
      const leftContent = leftPara?.content ?? '';
      const rightContent = rightPara?.content ?? '';

      if (leftContent !== baseContent) {
        finalContent = leftContent;
      } else if (rightContent !== baseContent) {
        finalContent = rightContent;
      } else {
        finalContent = baseContent;
      }
    }

    mergedParagraphs.push({
      id: paragraphId,
      index: idx,
      type: paragraphType,
      level,
      content: finalContent,
    });
  }

  return {
    docId: baseDoc.docId,
    paragraphs: mergedParagraphs,
  };
}
