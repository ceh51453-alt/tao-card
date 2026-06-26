/**
 * src/lib/tokenBudget/configOptimizer.ts — Phase 4: Local Config Optimization
 * 
 * Tối ưu config cho tất cả entries dựa trên analysis results.
 * KHÔNG sửa content, chỉ sửa settings (scan_depth, group, insertion_order...).
 */

import type { LorebookEntry } from '../../types/lorebook.types';
import type { TctrlAnalysis, TctrlGroup } from './groupBuilder';
import type { AnalyzedEntry } from './tokenAnalyzer';
import type { ConfigPatch } from './tctrlGenerator';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN OPTIMIZER
// ═══════════════════════════════════════════════════════════════════════════

export function optimizeConfigs(
  entries: LorebookEntry[],
  analysis: TctrlAnalysis,
  analyzedEntries: AnalyzedEntry[],
  log: (msg: string) => void,
): ConfigPatch[] {
  const patches: ConfigPatch[] = [];
  const analyzedMap = new Map(analyzedEntries.map(e => [e.entryId, e]));
  const deadIds = new Set(analysis.deadEntries.map(e => e.entryId));
  const dupIds = new Set(analysis.duplicates.map(d => d.remove));

  log('\n🔧 PHASE 4: Tối ưu config entries...');

  // Build entry → group mapping
  const entryToGroup = new Map<number, TctrlGroup>();
  for (const group of analysis.groups) {
    for (const entryId of group.entries) {
      entryToGroup.set(entryId, group);
    }
  }

  let disabledCount = 0;
  let configChangedCount = 0;

  for (const entry of entries) {
    // Skip @@TCTRL entries (don't modify our own controllers)
    if (entry.comment.startsWith('@@TCTRL::')) continue;

    const analyzed = analyzedMap.get(entry.id);
    const group = entryToGroup.get(entry.id);

    // 1. Disable dead entries
    if (deadIds.has(entry.id) && entry.enabled) {
      patches.push({
        entryId: entry.id,
        patches: { enabled: false },
        reason: `Entry "chết": ${analyzed?.reason ?? 'no keys, no constant'}`,
      });
      disabledCount++;
      continue;
    }

    // 2. Disable duplicate entries
    if (dupIds.has(entry.id) && entry.enabled) {
      const dup = analysis.duplicates.find(d => d.remove === entry.id);
      patches.push({
        entryId: entry.id,
        patches: { enabled: false },
        reason: `Trùng với entry #${dup?.keep}`,
      });
      disabledCount++;
      continue;
    }

    // 3. Optimize based on group hierarchy
    if (group) {
      const extPatches: Partial<LorebookEntry['extensions']> = {};
      let needsPatch = false;

      // ═══ CRITICAL FIX: Entries managed by TCTRL must be non-constant ═══
      // In SillyTavern, `constant: true` entries are ALWAYS injected into context
      // regardless of setEntryEnabled(). To allow TCTRL EJS to control them,
      // we must set constant=false so setEntryEnabled() actually works.
      //
      // Exception: Core system entries (hierarchy 1-2) stay constant because
      // TCTRL won't disable them anyway (they're critical).
      if (entry.constant && group.strategy !== 'constant') {
        patches.push({
          entryId: entry.id,
          patches: {
            constant: false,
          },
          reason: `constant → false: Để @@TCTRL có thể điều khiển bật/tắt entry "${entry.comment}"`,
        });
        configChangedCount++;
        log(`  ⚙️ "${entry.comment}": constant=false (để EJS điều khiển được)`);
      }

      // ═══ LOW PRIORITY entries in normal groups: ensure non-constant ═══
      if (analyzed?.priority === 'low' && entry.constant) {
        log(`  ⚙️ "${entry.comment}": priority LOW + constant → đổi thành non-constant`);
      }

      // scan_depth optimization
      const targetScanDepth = getScanDepthForGroup(group);
      if (targetScanDepth !== null && entry.extensions.scan_depth !== targetScanDepth) {
        extPatches.scan_depth = targetScanDepth;
        needsPatch = true;
      }

      // group name assignment (for SillyTavern group scoring)
      if (group.entries.length > 15 && entry.extensions.group !== group.name) {
        extPatches.group = group.name;
        extPatches.use_group_scoring = true;
        needsPatch = true;
      }

      // group_weight based on priority
      const targetWeight = getGroupWeight(analyzed?.priority ?? 'medium');
      if (entry.extensions.group_weight !== targetWeight && group.entries.length > 15) {
        extPatches.group_weight = targetWeight;
        needsPatch = true;
      }

      // insertion_order alignment
      const targetOrder = group.stConfig.order + (analyzed?.priority === 'critical' ? 50 : 0);
      if (Math.abs(entry.insertion_order - targetOrder) > 100) {
        needsPatch = true;
      }

      // Recursion protection
      if (!entry.extensions.exclude_recursion || !entry.extensions.prevent_recursion) {
        extPatches.exclude_recursion = true;
        extPatches.prevent_recursion = true;
        needsPatch = true;
      }

      if (needsPatch) {
        const patch: ConfigPatch = {
          entryId: entry.id,
          patches: {
            extensions: extPatches,
          },
          reason: `Group "${group.name}" optimization`,
        };
        if (Math.abs(entry.insertion_order - targetOrder) > 100) {
          patch.patches.insertion_order = targetOrder;
        }
        patches.push(patch);
        configChangedCount++;
      }
    }
  }

  log(`📊 Phase 4 hoàn thành:`);
  log(`  ├─ Entries tắt: ${disabledCount}`);
  log(`  └─ Config cập nhật: ${configChangedCount}`);

  return patches;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getScanDepthForGroup(group: TctrlGroup): number | null {
  switch (group.hierarchy) {
    case 1: return null;  // Core System: unlimited scan
    case 2: return null;  // Worldview: unlimited scan
    case 3: return 2;     // Characters: scan 2 messages
    case 4: return 2;     // Factions: scan 2 messages
    case 5: return 1;     // Locations: scan 1 message
    default: return 1;    // Misc: scan 1 message
  }
}

function getGroupWeight(priority: string): number {
  switch (priority) {
    case 'critical': return 100;
    case 'high': return 80;
    case 'medium': return 60;
    case 'low': return 30;
    default: return 50;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// APPLY PATCHES TO ENTRIES (mutates in place via store)
// ═══════════════════════════════════════════════════════════════════════════

export function applyConfigPatches(
  patches: ConfigPatch[],
  updateEntry: (id: number, patch: Partial<LorebookEntry>) => void,
): void {
  for (const { entryId, patches: p } of patches) {
    const update: Partial<LorebookEntry> = {};

    if (p.enabled !== undefined) {
      update.enabled = p.enabled;
    }
    if (p.constant !== undefined) {
      update.constant = p.constant;
    }
    if (p.insertion_order !== undefined) {
      update.insertion_order = p.insertion_order;
    }
    if (p.extensions) {
      // Extensions need to be merged, not replaced
      // The store's updateEntry should handle deep merge
      update.extensions = p.extensions as LorebookEntry['extensions'];
    }

    updateEntry(entryId, update);
  }
}
