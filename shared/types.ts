export type FileType = 'markdown' | 'docx';
export type ParagraphType = 'heading' | 'paragraph' | 'list' | 'code' | 'quote' | 'table';
export type AnnotationType = 'comment' | 'suggestion';
export type AnnotationStatus = 'pending' | 'accepted' | 'rejected';

export type ConflictStatus = 'pending' | 'resolved' | 'auto-resolved';
export type DecisionChoice = 'left' | 'right' | 'both' | 'custom';
export type DiffLineType = 'unchanged' | 'added' | 'removed' | 'modified';

export interface DocumentMeta {
  id: string;
  title: string;
  originalFileName: string;
  fileType: FileType;
  createdAt: string;
  updatedAt: string;
  shareToken?: string;
  sharePassword?: string | null;
  shareExpiresAt?: string | null;
  annotationCount: number;
  reviewerCount: number;
}

export interface Paragraph {
  id: string;
  index: number;
  type: ParagraphType;
  level?: number;
  content: string;
  rawHtml?: string;
}

export interface ParsedDocument {
  docId: string;
  paragraphs: Paragraph[];
}

export interface Annotation {
  id: string;
  docId: string;
  paragraphId: string;
  type: AnnotationType;
  reviewerName: string;
  reviewerEmail?: string;
  content: string;
  suggestedText?: string;
  originalText?: string;
  status: AnnotationStatus;
  ownerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  docId: string;
  totalAnnotations: number;
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  commentCount: number;
  suggestionCount: number;
  byReviewer: { name: string; count: number }[];
  byParagraph: { paragraphId: string; count: number }[];
}

export interface DiffLine {
  lineNumber: number;
  content: string;
  type: DiffLineType;
}

export interface ParagraphDiff {
  paragraphId: string;
  baseLines: DiffLine[];
  leftLines: DiffLine[];
  rightLines: DiffLine[];
  hasConflict: boolean;
}

export interface MergeConflict {
  id: string;
  paragraphId: string;
  paragraphIndex: number;
  paragraphType: ParagraphType;
  baseContent: string;
  leftContent: string;
  rightContent: string;
  leftAuthor: string;
  rightAuthor: string;
  status: ConflictStatus;
  decision?: DecisionChoice;
  resolvedContent?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  diff: ParagraphDiff;
}

export interface MergeDecision {
  id: string;
  conflictId: string;
  paragraphIndex: number;
  contentSummary: string;
  choice: DecisionChoice;
  customContent?: string;
  madeAt: string;
  madeBy: string;
  previousContent: string;
  newContent: string;
}

export interface MergeHistoryEntry {
  id: string;
  action: 'resolve' | 'batch-resolve' | 'undo' | 'auto-resolve';
  decisions: MergeDecision[];
  timestamp: string;
  actor: string;
  description: string;
}

export interface MergeSession {
  id: string;
  docId: string;
  baseVersion: string;
  leftVersion: string;
  rightVersion: string;
  leftAuthor: string;
  rightAuthor: string;
  createdAt: string;
  conflicts: MergeConflict[];
  history: MergeHistoryEntry[];
  autoMergedParagraphs: string[];
  isCompleted: boolean;
}

export interface MergeStats {
  totalConflicts: number;
  resolvedConflicts: number;
  pendingConflicts: number;
  autoResolvedConflicts: number;
  totalParagraphs: number;
  autoMergedParagraphs: number;
}
