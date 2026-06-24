/**
 * Regex Script types — spec Phần 3.4
 */

export interface RegexScript {
  id: string;           // uuid v4
  scriptName: string;
  findRegex: string;    // "/pattern/flags" hoặc plain string
  replaceString: string;
  trimStrings: string[];
  placement: RegexPlacement[];
  disabled: boolean;
  markdownOnly: boolean;
  promptOnly: boolean;
  runOnEdit: boolean;
  substituteRegex: 0 | 1 | 2;
  minDepth: number | null;
  maxDepth: number | null;
}

/**
 * 1=User Input, 2=AI Output, 3=Slash Commands, 4=World Info, 5=Reasoning
 */
export type RegexPlacement = 1 | 2 | 3 | 4 | 5;

/** Bảng tra substituteRegex — Phần 3.10 */
export const SUBSTITUTE_REGEX_LABELS: Record<0 | 1 | 2, string> = {
  0: 'None',
  1: 'Raw',
  2: 'Escaped',
};

/** Bảng tra placement — Phần 3.9 */
export const PLACEMENT_LABELS: Record<RegexPlacement, string> = {
  1: 'User Input',
  2: 'AI Output',
  3: 'Slash Commands',
  4: 'World Info',
  5: 'Reasoning',
};

// ═══════════════════════════════════════════════════════════════════════════
// REPLACE STRING STRUCTURE ANALYSIS — Guide §4
// ═══════════════════════════════════════════════════════════════════════════

/** A contiguous region within a replaceString */
export interface Zone {
  start: number;
  end: number;
  content: string;
}

/** Declared function found inside <script> blocks */
export interface FunctionInfo {
  name: string;
  params: string[];
  line: number;
}

/** Result of analyzing a replaceString's internal structure */
export interface ReplaceStringStructure {
  htmlZones: Zone[];
  scriptZones: Zone[];
  styleZones: Zone[];
  ejsBlocks: Zone[];
  captureGroups: string[];
  functions: FunctionInfo[];
  jqueryReadyBlocks: Zone[];
  hasScript: boolean;
  hasStyle: boolean;
  hasEjs: boolean;
}

/** Where to inject code within a replaceString — Guide §6.2 */
export type InjectionPosition =
  | 'auto'
  | 'before_script_end'
  | 'end_of_script'
  | 'after_style'
  | 'before_closing_div'
  | 'new_script_block'
  | 'append';

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION — Guide §7
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

export interface ReplaceStringValidation {
  valid: boolean;
  jsIssues: ValidationIssue[];
  htmlIssues: ValidationIssue[];
}
