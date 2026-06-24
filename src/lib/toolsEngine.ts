import type { CopilotContext } from './ai/agentLoop';
import { cascadeSearch } from './ai/webScraper';

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, string>;
  execute: (args: Record<string, unknown>, ctx: CopilotContext) => Promise<string>;
}

export const toolsEngine: Record<string, AITool> = {
  search_lorebook: {
    name: 'search_lorebook',
    description: 'Tìm kiếm lorebook entry bằng từ khóa (trả về danh sách rút gọn).',
    parameters: {
      query: 'string - Từ khóa cần tìm'
    },
    execute: async (args, ctx) => {
      const query = String(args.query || '');
      const card = ctx.getCard();
      const entries = card.data.character_book?.entries ?? [];
      const q = query.toLowerCase();
      const matches = entries.filter(e => 
        e.keys.some(k => k.toLowerCase().includes(q)) || 
        e.comment.toLowerCase().includes(q)
      );
      if (matches.length === 0) return `Không tìm thấy entry nào chứa từ khóa "${query}".`;
      return `Tìm thấy ${matches.length} entries:\n` + matches.map(e => `- ID: ${e.id} | Name: ${e.comment} | Keys: ${e.keys.join(', ')}`).join('\n');
    }
  },
  read_lorebook_entry: {
    name: 'read_lorebook_entry',
    description: 'Đọc nội dung chi tiết của một số lorebook entries thông qua ID.',
    parameters: {
      ids: 'number[] - Mảng các ID cần đọc'
    },
    execute: async (args, ctx) => {
      const ids = args.ids as number[];
      if (!Array.isArray(ids)) return 'Lỗi: tham số ids phải là một mảng số.';
      const card = ctx.getCard();
      const entries = card.data.character_book?.entries ?? [];
      const matches = entries.filter(e => ids.includes(e.id));
      if (matches.length === 0) return `Không tìm thấy entry nào với IDs: ${ids.join(', ')}.`;
      return `Chi tiết ${matches.length} entries:\n\n` + matches.map(e => `[ID: ${e.id} - ${e.comment}]\nKeys: ${e.keys.join(', ')}\nContent:\n${e.content}`).join('\n\n---\n\n');
    }
  },
  get_recent_messages: {
    name: 'get_recent_messages',
    description: 'Lấy các tin nhắn gần nhất trong cuộc trò chuyện (không bao gồm system prompt).',
    parameters: {
      count: 'number - Số lượng tin nhắn cần lấy'
    },
    execute: async (args, ctx) => {
      const count = Number(args.count) || 5;
      const msgs = ctx.chatHistory.filter(m => m.role !== 'system').slice(-count);
      return msgs.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    }
  },
  web_search: {
    name: 'web_search',
    description: 'Tìm kiếm thông tin trên mạng Internet (DuckDuckGo, Wikipedia, Baidu) khi cần cập nhật kiến thức thời gian thực hoặc xác minh thông tin.',
    parameters: {
      query: 'string - Từ khóa tìm kiếm'
    },
    execute: async (args, ctx) => {
      const query = String(args.query || '');
      if (!query) return 'Lỗi: Thiếu từ khóa tìm kiếm.';
      const proxyUrl = ctx.profile.webSearchProxyUrl || 'https://corsproxy.io/?';
      const results = await cascadeSearch(query, proxyUrl);
      if (results.length === 0) return `Không tìm thấy kết quả nào cho "${query}" trên mạng.`;
      return `Kết quả tìm kiếm cho "${query}":\n\n` + results.map(r => `[Nguồn: ${r.source}]\nURL: ${r.url}\nNội dung:\n${r.content}`).join('\n\n---\n\n');
    }
  },
};

export function buildToolsPrompt(): string {
  const toolDefs = Object.values(toolsEngine).map(t => {
    return `- ${t.name}(${JSON.stringify(t.parameters)}): ${t.description}`;
  }).join('\n');
  return `=== HỆ THỐNG CÔNG CỤ (AGENTIC TOOLS) ===
Bạn có thể gọi các công cụ sau bằng cách trả về một action với type "tool_call":
{"type": "tool_call", "data": {"tool": "tên_công_cụ", "args": {...}}}

Danh sách công cụ khả dụng:
${toolDefs}

QUAN TRỌNG:
1. Khi gọi tool, hãy gán status = "CONTINUE" để đợi hệ thống trả về kết quả trong lượt tiếp theo.
2. Không gọi nhiều tool trong cùng một action block nếu nó tốn quá nhiều API tokens.
3. Nếu cần tìm kiếm dữ liệu, hãy gọi tool trước, đợi kết quả (được gửi lại dưới vai trò "system"), rồi mới trả lời người dùng.`;
}
