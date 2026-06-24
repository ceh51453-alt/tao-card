/**
 * src/lib/ai/documentChunker.ts — Document chunking + extraction pipeline
 * Spec Phần 7.4.2, 7.4.3: Split text, system prompt, extraction runner
 */

import type { CharacterCardV3, LorebookEntry, ChatMessage, ProxyProfile, GenerationParams, AIGeneratedEntry } from '../../types';
import { callAI } from './client';
import { materializeEntry, nextEntryId } from '../converters/cardDefaults';
import { tryExtractJsonArray } from './batchGenerator';
import type { EntryCategory, CardType } from '../worldbook/worldbookConfig';
import { DEFAULT_STEPS } from './worldbuildingDefaults';
import { runSemanticDeduplication } from './deduplicator';

// ═══════════════════════════════════════════════════════════════════════════
// CHUNKING
// ═══════════════════════════════════════════════════════════════════════════

const CHUNK_SIZE = 15000;

interface SplitOptions {
  chunkSize?: number;
  overlapSize?: number;
  keepHeaders?: boolean;
}

export function splitDocument(text: string, options: SplitOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? CHUNK_SIZE;
  const overlapSize = options.overlapSize ?? 1500;
  const keepHeaders = options.keepHeaders ?? true;

  if (!text || text.trim() === '') return [];

  // 1. Parse lines and construct blocks
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ type: 'header' | 'paragraph'; text: string; headerPath?: string[] }> = [];
  
  let currentHeaderPath: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraphLines.join('\n'),
        headerPath: [...currentHeaderPath],
      });
      currentParagraphLines = [];
    }
  };

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      const level = headerMatch[1].length; // 1 to 6
      const title = headerMatch[2].trim();
      
      // Update header path hierarchy based on level
      currentHeaderPath = currentHeaderPath.slice(0, level - 1);
      currentHeaderPath[level - 1] = title;

      blocks.push({
        type: 'header',
        text: line,
        headerPath: [...currentHeaderPath],
      });
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      currentParagraphLines.push(line);
    }
  }
  flushParagraph();

  if (blocks.length === 0) {
    return text.trim() ? [text] : [];
  }

  // 2. Combine blocks into chunks
  const chunks: string[] = [];
  let currentChunkBlocks: typeof blocks = [];

  const buildChunkText = (chunkBlocks: typeof blocks): string => {
    if (chunkBlocks.length === 0) return '';
    
    // Determine header context prefix if requested
    let prefix = '';
    if (keepHeaders) {
      // Find the last block that is a header, or use the headerPath of the last block
      const lastBlock = chunkBlocks[chunkBlocks.length - 1];
      if (lastBlock.headerPath && lastBlock.headerPath.length > 0) {
        prefix = `[Context: ${lastBlock.headerPath.join(' > ')}]\n\n`;
      }
    }
    
    const body = chunkBlocks.map(b => b.text).join('\n\n');
    return prefix + body;
  };

  const getCleanedChunkTextLength = (chunkBlocks: typeof blocks): number => {
    return buildChunkText(chunkBlocks).length;
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    // If a single paragraph/block is larger than chunkSize, we need to split it
    if (block.text.length > chunkSize) {
      // Flush current chunk first
      if (currentChunkBlocks.length > 0) {
        chunks.push(buildChunkText(currentChunkBlocks));
        currentChunkBlocks = [];
      }

      // Split large paragraph into sentences or smaller parts
      const subParts: string[] = [];
      let temp = block.text;
      while (temp.length > 0) {
        if (temp.length <= chunkSize) {
          subParts.push(temp);
          break;
        }
        // Try to find sentence end close to chunkSize
        let splitIdx: number;
        const searchRange = temp.slice(0, chunkSize);
        const sentenceEndMatch = /[.?!]\s+/g;
        let match;
        let lastIdx = -1;
        while ((match = sentenceEndMatch.exec(searchRange)) !== null) {
          lastIdx = match.index + 1; // split after the punctuation
        }
        if (lastIdx > chunkSize * 0.5) {
          splitIdx = lastIdx;
        } else {
          // Fallback to space
          const spaceIdx = searchRange.lastIndexOf(' ');
          if (spaceIdx > chunkSize * 0.5) {
            splitIdx = spaceIdx;
          } else {
            // Hard split
            splitIdx = chunkSize;
          }
        }
        subParts.push(temp.slice(0, splitIdx).trim());
        temp = temp.slice(splitIdx).trim();
      }

      // Add subParts as individual chunks
      for (const part of subParts) {
        chunks.push(buildChunkText([{
          type: 'paragraph',
          text: part,
          headerPath: block.headerPath
        }]));
      }
      continue;
    }

    // Check if adding this block exceeds chunkSize
    const testBlocks = [...currentChunkBlocks, block];
    const testSize = getCleanedChunkTextLength(testBlocks);

    if (testSize > chunkSize && currentChunkBlocks.length > 0) {
      // Emit current chunk
      chunks.push(buildChunkText(currentChunkBlocks));

      // Implement overlapping: find how many blocks we can retain from the end of the current chunk
      const overlapBlocks: typeof blocks = [];
      let overlapLen = 0;
      for (let j = currentChunkBlocks.length - 1; j >= 0; j--) {
        const ob = currentChunkBlocks[j];
        if (overlapLen + ob.text.length <= overlapSize) {
          overlapBlocks.unshift(ob);
          overlapLen += ob.text.length + 2; // +2 for '\n\n'
        } else {
          break;
        }
      }
      
      currentChunkBlocks = [...overlapBlocks, block];
    } else {
      currentChunkBlocks.push(block);
    }
  }

  if (currentChunkBlocks.length > 0) {
    chunks.push(buildChunkText(currentChunkBlocks));
  }

  return chunks;
}

// Helper to validate individual entries in completeness mode
function validateCompletenessEntries(arr: unknown[]): AIGeneratedEntry[] {
  const valid: AIGeneratedEntry[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    if (typeof e.comment !== 'string' || !Array.isArray(e.keys) || typeof e.content !== 'string') continue;
    if (!e.comment.trim() || !e.content.trim() || e.keys.length === 0) continue;
    valid.push({
      comment: e.comment,
      keys: e.keys.map(String),
      secondary_keys: Array.isArray(e.secondary_keys) ? e.secondary_keys.map(String) : undefined,
      content: e.content,
      constant: typeof e.constant === 'boolean' ? e.constant : undefined,
      selective: typeof e.selective === 'boolean' ? e.selective : undefined,
      insertion_order: typeof e.insertion_order === 'number' ? e.insertion_order : undefined,
    });
  }
  return valid;
}

export function tryExtractCompletenessJson(text: string): { status: 'CONTINUE' | 'DONE'; entries: AIGeneratedEntry[] } | null {
  const cleanText = text.trim();

  // 1. Fallback: If it's a direct JSON array of entries, return immediately
  if (cleanText.startsWith('[')) {
    const directArray = tryExtractJsonArray(text);
    if (directArray) {
      return { status: 'DONE', entries: directArray };
    }
  }

  // Try parsing as JSON object first
  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if ('status' in parsed || 'entries' in parsed) {
        const status = parsed.status === 'CONTINUE' ? 'CONTINUE' : 'DONE';
        const entries = Array.isArray(parsed.entries) ? validateCompletenessEntries(parsed.entries) : [];
        return { status, entries };
      }
    }
  } catch { /* continue */ }

  // Try extracting from code fence ```json ... ``` or ``` ... ```
  const fenceMatch = cleanText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if ('status' in parsed || 'entries' in parsed) {
          const status = parsed.status === 'CONTINUE' ? 'CONTINUE' : 'DONE';
          const entries = Array.isArray(parsed.entries) ? validateCompletenessEntries(parsed.entries) : [];
          return { status, entries };
        }
      }
    } catch { /* continue */ }
  }

  // Try finding the first '{' and last '}'
  const startIdx = cleanText.indexOf('{');
  const endIdx = cleanText.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try {
      const parsed = JSON.parse(cleanText.slice(startIdx, endIdx + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if ('status' in parsed || 'entries' in parsed) {
          const status = parsed.status === 'CONTINUE' ? 'CONTINUE' : 'DONE';
          const entries = Array.isArray(parsed.entries) ? validateCompletenessEntries(parsed.entries) : [];
          return { status, entries };
        }
      }
    } catch { /* continue */ }
  }

  // Fallback: Check if it's a direct JSON array of entries (if it didn't start with '[')
  const directArray = tryExtractJsonArray(text);
  if (directArray) {
    return { status: 'DONE', entries: directArray };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

export interface DocExtractConfig {
  additionalInstructions: string;
  useCardContext: boolean;
  defaultPosition: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  insertionOrderStart: number;
  maxRetriesPerChunk: number;
  category?: EntryCategory;
  cardType?: CardType;
}

export interface DocExtractProgress {
  chunk: number;
  totalChunks: number;
  entriesCreated: number;
  status: 'running' | 'done' | 'error' | 'stopped';
}

export interface DocExtractContext {
  card: CharacterCardV3;
  profile: ProxyProfile;
  generationParams: GenerationParams;
  stopped: boolean;
  log: (msg: string) => void;
  onProgress: (progress: DocExtractProgress) => void;
  appendEntry: (entry: LorebookEntry) => void;
  deleteEntry?: (id: number) => void;
  updateEntry?: (id: number, patch: Partial<LorebookEntry>) => void;
}

export async function runDocumentExtraction(
  chunks: string[],
  config: DocExtractConfig,
  ctx: DocExtractContext,
) {
  let entriesCreated = 0;
  const createdEntries: LorebookEntry[] = [];
  const activeEntries = [...(ctx.card.data.character_book?.entries ?? [])];

  ctx.log(`📄 Bắt đầu trích xuất tài liệu qua các bước cấu hình. Tổng số: ${chunks.length} chunks.`);
  
  const profile = ctx.profile;
  const enableCompleteness = profile.enableCompletenessProtocol ?? false;
  
  // Lấy các bước hoạt động từ profile, nếu không có thì dùng DEFAULT_STEPS
  const steps = (profile.steps || DEFAULT_STEPS).filter(s => s.enabled);
  if (steps.length === 0) {
    ctx.log('⚠️ Không có bước nào được kích hoạt. Tiến trình trích xuất kết thúc.');
    ctx.onProgress({ chunk: chunks.length, totalChunks: chunks.length, entriesCreated, status: 'done' });
    return;
  }

  // Tạo system prompt nền tảng
  const systemPromptParts: string[] = [];
  if (profile.masterInstruction) {
    systemPromptParts.push(`### HƯỚNG DẪN TỔNG (MASTER INSTRUCTION)\n${profile.masterInstruction}`);
  }
  if (profile.aiPipelineMemory) {
    systemPromptParts.push(`### Ghi nhớ về Hướng dẫn tổng:\n${profile.aiPipelineMemory}`);
  }

  const formatInstruction = enableCompleteness 
    ? `Bắt buộc chỉ trả về một đối tượng JSON có cấu trúc sau:
{
  "status": "CONTINUE" hoặc "DONE",
  "entries": [
    {
      "comment": "Tên/Chủ đề của entry",
      "keys": ["tên chính", "các từ khóa kích hoạt viết thường"],
      "content": "Nội dung chi tiết của entry, viết ở ngôi thứ ba khách quan, chia nhỏ ý bằng gạch đầu dòng"
    }
  ]
}
Tuyệt đối không có text thừa bên ngoài, không markdown code blocks.`
    : `Bắt buộc chỉ trả về một mảng JSON các entries có cấu trúc sau:
[
  {
    "comment": "Tên/Chủ đề của entry",
    "keys": ["tên chính", "các từ khóa kích hoạt viết thường"],
    "content": "Nội dung chi tiết của entry, viết ở ngôi thứ ba khách quan, chia nhỏ ý bằng gạch đầu dòng"
  }
]
Tuyệt đối không có text thừa bên ngoài, không markdown code blocks.`;

  systemPromptParts.push(`### QUY TẮC PHẢN HỒI (ĐỊNH DẠNG ĐẦU RA BẮT BUỘC)\n${formatInstruction}`);
  const systemPrompt = systemPromptParts.join('\n\n');

  // Chạy lần lượt các bước
  for (let sIdx = 0; sIdx < steps.length; sIdx++) {
    if (ctx.stopped) { ctx.log('⏹ Đã dừng.'); break; }

    const step = steps[sIdx];
    ctx.log(`\n🚀 [BƯỚC ${sIdx + 1}/${steps.length}]: ${step.name}`);

    // Xác định các chunks cần chạy cho bước này
    const chunksToRun = step.singleton ? [chunks[0]] : chunks;
    if (step.singleton) {
      ctx.log(`ℹ️ Bước này là Singleton, chỉ quét chunk đầu tiên để thu thập tổng quát.`);
    }

    for (let cIdx = 0; cIdx < chunksToRun.length; cIdx++) {
      if (ctx.stopped) break;

      const chunk = chunksToRun[cIdx];
      const chunkLabel = step.singleton ? 'Singleton Chunk' : `Chunk ${cIdx + 1}/${chunks.length}`;

      if (enableCompleteness) {
        let chunkDone = false;
        let loopCount = 0;
        const maxLoops = 5;
        const extractedThisChunk: AIGeneratedEntry[] = [];

        while (!chunkDone && loopCount < maxLoops) {
          if (ctx.stopped) break;
          loopCount++;

          const userParts: string[] = [];
          userParts.push(`### CHỈ DẪN TRÍCH XUẤT CHO BƯỚC NÀY:\n${step.prompt}`);

          if (config.useCardContext) {
            userParts.push(`### Ngữ cảnh nhân vật\nTên: ${ctx.card.data.name}\nDescription: ${ctx.card.data.description.slice(0, 500)}`);
          }
          if (config.additionalInstructions) {
            userParts.push(`### Hướng dẫn thêm từ người dùng\n${config.additionalInstructions}`);
          }
          userParts.push(`### Tài liệu cần trích xuất — ${chunkLabel}\n${chunk}`);

          if (loopCount > 1 && extractedThisChunk.length > 0) {
            const listText = extractedThisChunk.map((e, idx) => `${idx + 1}. Tên: "${e.comment}" - Keys: [${e.keys.join(', ')}]`).join('\n');
            userParts.push(`### Các entries đã trích xuất ở các bước trước từ chunk này (TUYỆT ĐỐI KHÔNG TẠO LẠI CÁC CHỦ ĐỀ NÀY):\n${listText}`);
            userParts.push(`Hãy tiếp tục trích xuất các thông tin quan trọng KHÁC trong tài liệu chưa được trích xuất ở trên. Trả về status "CONTINUE" nếu vẫn còn thông tin khác chưa trích xuất hết, hoặc "DONE" nếu đã hoàn thành trích xuất tất cả bối cảnh từ chunk này.`);
          } else {
            userParts.push(`Tạo Lorebook entries từ chunk trên. Trả về status "CONTINUE" nếu bạn cảm thấy thông tin quá nhiều và cần thêm lượt gọi để trích xuất hết, hoặc "DONE" nếu đã trích xuất xong.`);
          }

          const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userParts.join('\n\n') },
          ];

          let success = false;
          let attemptResult: { status: 'CONTINUE' | 'DONE'; entries: AIGeneratedEntry[] } | null = null;

          for (let attempt = 0; attempt <= config.maxRetriesPerChunk; attempt++) {
            if (ctx.stopped) break;
            try {
              ctx.log(`📡 [${step.name}] - ${chunkLabel} (Vòng lặp completeness ${loopCount}/${maxLoops}${attempt > 0 ? `, thử lại ${attempt}` : ''})...`);
              const raw = await callAI({ profile: ctx.profile, params: ctx.generationParams, messages });
              attemptResult = tryExtractCompletenessJson(raw.text);
              if (attemptResult) {
                success = true;
                break;
              }
              ctx.log(`⚠️ Vòng lặp completeness ${loopCount} — không parse được JSON, thử lại...`);
            } catch (err) {
              ctx.log(`⚠️ Vòng lặp completeness ${loopCount} — lỗi: ${err instanceof Error ? err.message : String(err)}`);
            }
          }

          if (success && attemptResult) {
            const { status, entries } = attemptResult;
            ctx.log(`📥 Vòng lặp completeness ${loopCount}: Trích xuất thành công ${entries.length} entries. Trạng thái: ${status}`);
            
            for (const ai of entries) {
              const isDup = extractedThisChunk.some(prev => prev.comment.toLowerCase() === ai.comment.toLowerCase() || 
                (prev.keys.some((k: string) => ai.keys.includes(k)) && prev.content.slice(0, 30) === ai.content.slice(0, 30)));
              if (isDup) {
                ctx.log(`⏭️ Bỏ qua entry trùng lặp nội bộ: "${ai.comment}"`);
                continue;
              }

              extractedThisChunk.push(ai);
              const id = nextEntryId(activeEntries);
              const entry = materializeEntry(ai, {
                category: config.category,
                cardType: config.cardType,
                defaultPosition: config.defaultPosition,
                insertionOrderStart: config.insertionOrderStart + entriesCreated,
              }, id);
              
              activeEntries.push(entry);
              createdEntries.push(entry);
              ctx.appendEntry(entry);
              entriesCreated++;
              ctx.log(`✅ "${entry.comment}" (${entry.keys.join(', ')})`);
            }

            if (status === 'DONE' || entries.length === 0) {
              chunkDone = true;
            }
          } else {
            ctx.log(`❌ Vòng lặp completeness ${loopCount} thất bại hoàn toàn. Dừng vòng lặp chunk này.`);
            chunkDone = true;
          }
        }
      } else {
        const userParts: string[] = [];
        userParts.push(`### CHỈ DẪN TRÍCH XUẤT CHO BƯỚC NÀY:\n${step.prompt}`);

        if (config.useCardContext) {
          userParts.push(`### Ngữ cảnh nhân vật\nTên: ${ctx.card.data.name}\nDescription: ${ctx.card.data.description.slice(0, 500)}`);
        }
        if (config.additionalInstructions) {
          userParts.push(`### Hướng dẫn thêm từ người dùng\n${config.additionalInstructions}`);
        }
        userParts.push(`### Tài liệu cần trích xuất — ${chunkLabel}\n${chunk}`);
        userParts.push(`Tạo Lorebook entries từ chunk trên. KHÔNG bỏ sót thông tin quan trọng.`);

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userParts.join('\n\n') },
        ];

        let success = false;
        for (let attempt = 0; attempt <= config.maxRetriesPerChunk; attempt++) {
          try {
            ctx.log(`📡 [${step.name}] - ${chunkLabel}${attempt > 0 ? ` (thử lại ${attempt})` : ''}...`);
            const raw = await callAI({ profile: ctx.profile, params: ctx.generationParams, messages });
            const entries = tryExtractJsonArray(raw.text);
            if (entries) {
              for (const ai of entries) {
                const id = nextEntryId(activeEntries);
                const entry = materializeEntry(ai, {
                  category: config.category,
                  cardType: config.cardType,
                  defaultPosition: config.defaultPosition,
                  insertionOrderStart: config.insertionOrderStart + entriesCreated,
                }, id);
                
                activeEntries.push(entry);
                createdEntries.push(entry);
                ctx.appendEntry(entry);
                entriesCreated++;
                ctx.log(`✅ "${entry.comment}" (${entry.keys.join(', ')})`);
              }
              success = true;
              break;
            }
            ctx.log(`⚠️ Không parse được JSON, thử lại...`);
          } catch (err) {
            ctx.log(`⚠️ Lỗi: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        if (!success) {
          ctx.log(`❌ Quét ${chunkLabel} thất bại.`);
        }
      }

      // Cập nhật progress động
      ctx.onProgress({
        chunk: sIdx + 1,
        totalChunks: steps.length,
        entriesCreated,
        status: 'running'
      });
    }
  }

  // ─── Semantic Deduplication ───
  if (profile.semanticDedup !== false && !ctx.stopped && createdEntries.length > 0) {
    ctx.log(`\n🧹 Bắt đầu chạy cơ chế dọn trùng lặp ngữ nghĩa (Semantic Deduplication)...`);
    try {
      const dedupResult = await runSemanticDeduplication(
        createdEntries,
        profile,
        ctx.generationParams,
        ctx.log
      );

      // Thực hiện xóa/gộp entries
      if (dedupResult.deletedIds.length > 0 && ctx.deleteEntry) {
        for (const delId of dedupResult.deletedIds) {
          ctx.deleteEntry(delId);
        }
      }

      if (ctx.updateEntry) {
        for (const entry of dedupResult.mergedEntries) {
          if (!dedupResult.deletedIds.includes(entry.id)) {
            ctx.updateEntry(entry.id, {
              comment: entry.comment,
              keys: entry.keys,
              content: entry.content
            });
          }
        }
      }

      const actualCreated = createdEntries.length - dedupResult.deletedIds.length;
      ctx.log(`✅ Hoàn thành dọn trùng lặp ngữ nghĩa. Đã gộp/xóa ${dedupResult.deletedIds.length} entries.`);
      ctx.log(`\n🏁 Hoàn thành toàn bộ quy trình: Đã tạo thực tế ${actualCreated} entries (Gốc: ${createdEntries.length}, đã gộp: ${dedupResult.deletedIds.length}) từ ${chunks.length} chunks.`);
      
      ctx.onProgress({
        chunk: steps.length,
        totalChunks: steps.length,
        entriesCreated: actualCreated,
        status: 'done'
      });
      return;
    } catch (dedupErr) {
      ctx.log(`⚠️ Lỗi dọn trùng lặp ngữ nghĩa: ${dedupErr instanceof Error ? dedupErr.message : String(dedupErr)}`);
    }
  }

  ctx.onProgress({ chunk: steps.length, totalChunks: steps.length, entriesCreated, status: ctx.stopped ? 'stopped' : 'done' });
  ctx.log(`\n🏁 Hoàn thành toàn bộ quy trình: ${entriesCreated} entries được tạo từ ${chunks.length} chunks.`);
}
