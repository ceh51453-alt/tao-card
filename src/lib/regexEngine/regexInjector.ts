/**
 * src/lib/regexEngine/regexInjector.ts — ReplaceString Structure Analyzer & Code Injector
 * Guide §4, §6: Phân tích replaceString thành zones, inject code an toàn
 */

import type {
  ReplaceStringStructure, Zone, FunctionInfo, InjectionPosition,
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURE ANALYSIS — Guide §4
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze a replaceString into structural zones.
 * Detects: <script>, <style>, <% EJS %>, capture groups ($1,$2,$&), functions, jQuery ready blocks.
 */
export function analyzeReplaceString(content: string): ReplaceStringStructure {
  const scriptZones = extractTagZones(content, 'script');
  const styleZones = extractTagZones(content, 'style');
  const ejsBlocks = extractEjsBlocks(content);
  const captureGroups = extractCaptureGroups(content);
  const functions = extractFunctions(content, scriptZones);
  const jqueryReadyBlocks = extractJQueryReady(content, scriptZones);
  const htmlZones = extractHtmlZones(content, scriptZones, styleZones, ejsBlocks);

  return {
    htmlZones,
    scriptZones,
    styleZones,
    ejsBlocks,
    captureGroups,
    functions,
    jqueryReadyBlocks,
    hasScript: scriptZones.length > 0,
    hasStyle: styleZones.length > 0,
    hasEjs: ejsBlocks.length > 0,
  };
}

/**
 * Build a human-readable summary of the structure.
 * Example: "1 style | 2 scripts | 3 functions: initBox, showStats, hideStats | Captures: $1, $2 | jQuery ready"
 */
export function structureSummary(structure: ReplaceStringStructure): string {
  const parts: string[] = [];

  if (structure.styleZones.length > 0) {
    parts.push(`${structure.styleZones.length} style`);
  }
  if (structure.scriptZones.length > 0) {
    parts.push(`${structure.scriptZones.length} script${structure.scriptZones.length > 1 ? 's' : ''}`);
  }
  if (structure.functions.length > 0) {
    const names = structure.functions.map(f => f.name).join(', ');
    parts.push(`${structure.functions.length} function${structure.functions.length > 1 ? 's' : ''}: ${names}`);
  }
  if (structure.captureGroups.length > 0) {
    parts.push(`Captures: ${structure.captureGroups.join(', ')}`);
  }
  if (structure.ejsBlocks.length > 0) {
    parts.push(`${structure.ejsBlocks.length} EJS`);
  }
  if (structure.jqueryReadyBlocks.length > 0) {
    parts.push('jQuery ready');
  }

  return parts.length > 0 ? parts.join(' | ') : 'Pure text (no HTML/JS/CSS)';
}

// ═══════════════════════════════════════════════════════════════════════════
// CODE INJECTION — Guide §6
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inject JavaScript code into the replaceString at the specified position.
 * Guide §6.1: Auto mode selects the best injection point.
 */
export function injectCode(
  content: string,
  code: string,
  position: InjectionPosition = 'auto',
): string {
  if (position === 'auto') {
    return injectCodeAuto(content, code);
  }

  switch (position) {
    case 'before_script_end': {
      const lastClose = content.lastIndexOf('</script>');
      if (lastClose === -1) return injectCodeAuto(content, code);
      return content.slice(0, lastClose) + '\n' + code + '\n' + content.slice(lastClose);
    }

    case 'end_of_script': {
      const lastClose = content.lastIndexOf('</script>');
      if (lastClose === -1) return content + '\n<script>\n' + code + '\n</script>';
      const afterClose = lastClose + '</script>'.length;
      return content.slice(0, afterClose) + '\n<script>\n' + code + '\n</script>' + content.slice(afterClose);
    }

    case 'after_style': {
      const lastStyleClose = content.lastIndexOf('</style>');
      if (lastStyleClose === -1) return content + '\n<script>\n' + code + '\n</script>';
      const after = lastStyleClose + '</style>'.length;
      return content.slice(0, after) + '\n<script>\n' + code + '\n</script>' + content.slice(after);
    }

    case 'before_closing_div': {
      const lastDiv = content.lastIndexOf('</div>');
      if (lastDiv === -1) return content + '\n<script>\n' + code + '\n</script>';
      return content.slice(0, lastDiv) + '\n<script>\n' + code + '\n</script>\n' + content.slice(lastDiv);
    }

    case 'new_script_block':
      return content + '\n<script>\n' + code + '\n</script>';

    case 'append':
      return content + '\n' + code;

    default:
      return injectCodeAuto(content, code);
  }
}

/**
 * Inject CSS rules into the replaceString.
 * Guide §6.4: Auto-detect best position for CSS injection.
 */
export function injectCSS(content: string, css: string): string {
  // Has existing <style>? → inject before </style>
  const lastStyleClose = content.lastIndexOf('</style>');
  if (lastStyleClose !== -1) {
    return content.slice(0, lastStyleClose) + '\n' + css + '\n' + content.slice(lastStyleClose);
  }

  // Has <script>? → create <style> before first <script>
  const firstScript = content.indexOf('<script');
  if (firstScript !== -1) {
    return content.slice(0, firstScript) + '<style>\n' + css + '\n</style>\n' + content.slice(firstScript);
  }

  // No style or script → create <style> at the beginning
  return '<style>\n' + css + '\n</style>\n' + content;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Auto-mode injection — Guide §6.1 flowchart.
 */
function injectCodeAuto(content: string, code: string): string {
  // Has <script> block? → inject before last </script>
  const lastClose = content.lastIndexOf('</script>');
  if (lastClose !== -1) {
    return content.slice(0, lastClose) + '\n' + code + '\n' + content.slice(lastClose);
  }

  // Has </div> at end? → create <script> before last </div>
  const lastDiv = content.lastIndexOf('</div>');
  if (lastDiv !== -1) {
    return content.slice(0, lastDiv) + '\n<script>\n' + code + '\n</script>\n' + content.slice(lastDiv);
  }

  // Fallback → create <script> at end
  return content + '\n<script>\n' + code + '\n</script>';
}

/** Extract <tag>...</tag> zones from content */
function extractTagZones(content: string, tagName: string): Zone[] {
  const zones: Zone[] = [];
  const openTag = new RegExp(`<${tagName}[^>]*>`, 'gi');
  const closeTag = `</${tagName}>`;

  let match: RegExpExecArray | null;
  while ((match = openTag.exec(content)) !== null) {
    const start = match.index;
    const innerStart = start + match[0].length;
    const closeIdx = content.indexOf(closeTag, innerStart);
    if (closeIdx === -1) continue;

    const end = closeIdx + closeTag.length;
    zones.push({
      start,
      end,
      content: content.slice(innerStart, closeIdx),
    });
  }

  return zones;
}

/** Extract <% ... %> EJS blocks */
function extractEjsBlocks(content: string): Zone[] {
  const zones: Zone[] = [];
  const regex = /<%[\s\S]*?%>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    zones.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0].slice(2, -2).trim(),
    });
  }

  return zones;
}

/** Extract capture group references ($1, $2, ..., $&) */
function extractCaptureGroups(content: string): string[] {
  const groups = new Set<string>();
  const regex = /\$(\d+|&)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    groups.add(match[0]);
  }

  return [...groups].sort((a, b) => {
    if (a === '$&') return -1;
    if (b === '$&') return 1;
    return parseInt(a.slice(1)) - parseInt(b.slice(1));
  });
}

/** Extract function declarations from script zones */
function extractFunctions(content: string, scriptZones: Zone[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const fnRegex = /function\s+(\w+)\s*\(([^)]*)\)/g;

  for (const zone of scriptZones) {
    let match: RegExpExecArray | null;
    while ((match = fnRegex.exec(zone.content)) !== null) {
      const name = match[1];
      const params = match[2].split(',').map(p => p.trim()).filter(Boolean);
      // Estimate line number within content
      const beforeMatch = content.slice(0, zone.start).split('\n').length;
      const withinMatch = zone.content.slice(0, match.index).split('\n').length;
      functions.push({ name, params, line: beforeMatch + withinMatch });
    }
  }

  return functions;
}

/** Extract $(document).ready() blocks within script zones */
function extractJQueryReady(_content: string, scriptZones: Zone[]): Zone[] {
  const blocks: Zone[] = [];
  const readyPattern = /\$\s*\(\s*document\s*\)\s*\.\s*ready\s*\(/g;

  for (const zone of scriptZones) {
    let match: RegExpExecArray | null;
    while ((match = readyPattern.exec(zone.content)) !== null) {
      blocks.push({
        start: zone.start + match.index,
        end: zone.start + match.index + match[0].length,
        content: match[0],
      });
    }
  }

  return blocks;
}

/** Extract HTML zones — everything that's not inside <script>, <style>, or <% %> */
function extractHtmlZones(
  content: string,
  scriptZones: Zone[],
  styleZones: Zone[],
  ejsBlocks: Zone[],
): Zone[] {
  // Collect all non-HTML ranges (script, style, ejs) sorted by start
  const excluded = [...scriptZones, ...styleZones, ...ejsBlocks]
    .sort((a, b) => a.start - b.start);

  const htmlZones: Zone[] = [];
  let cursor = 0;

  for (const ex of excluded) {
    if (ex.start > cursor) {
      const slice = content.slice(cursor, ex.start);
      if (slice.trim()) {
        htmlZones.push({ start: cursor, end: ex.start, content: slice });
      }
    }
    cursor = Math.max(cursor, ex.end);
  }

  // Trailing HTML
  if (cursor < content.length) {
    const slice = content.slice(cursor);
    if (slice.trim()) {
      htmlZones.push({ start: cursor, end: content.length, content: slice });
    }
  }

  return htmlZones;
}
