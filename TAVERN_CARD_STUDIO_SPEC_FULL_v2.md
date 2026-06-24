# 🎴 TAVERN CARD STUDIO — PROMPT ĐẶC TẢ KỸ THUẬT HOÀN CHỈNH v2.0
### Công cụ tạo & chỉnh sửa Character Card V3 + Lorebook + Regex + MVUZOD + EJS cho SillyTavern

> **Ghi chú cho AI coding agent (Cursor/Windsurf/Claude Code/Bolt/v0/Lovable...):**
> Đây là bản đặc tả kỹ thuật (spec) đầy đủ, hoàn chỉnh, tự đủ — **không cần tài liệu nào khác**.
> Hãy đọc **toàn bộ** tài liệu trước khi viết code.
> Chú ý đặc biệt các phần cốt lõi theo thứ tự ưu tiên:
> 1. **Phần 3** — Schema dữ liệu SillyTavern — mọi file `.json` xuất ra phải khớp 100%
> 2. **Phần 3A** — AI Action Schema — cấu trúc JSON AI phải trả về trong mọi lượt gọi
> 3. **Phần 3B** — MVUZOD Schema — Zod + JSON Patch cho TavernHelper RPG engine
> 4. **Phần 9** — Client-Agent Loop — kiến trúc vòng lặp tác nhân trung tâm của app
> Triển khai theo thứ tự Phase ở **Phần 12**.

---

## Mục lục

| # | Phần | Nội dung |
|---|---|---|
| 1 | Tổng quan sản phẩm | Mô tả, 7 trụ cột, Client-Agent Loop |
| 2 | Tech stack & cấu trúc thư mục | Stack, deps, toàn bộ cây thư mục |
| 3 | Schema dữ liệu chuẩn SillyTavern | Card V3, Lorebook, Regex, DepthPrompt, bảng tra |
| 3A | AI Action Schema | AIResponse, AIAction types đầy đủ |
| 3B | MVUZOD Data Schema | **Lorebook-first workflow** · Zod Schema · JSON Patch · Schema Inferencer |
| 4 | Kiến trúc giao diện & điều hướng | Layout, 5 Worldbuilding Modes |
| 5 | Module 1 — Settings | Proxy profiles, model scan, generation params |
| 6 | Module 2 — Card Editor | 5 tab editor đầy đủ |
| 7 | Module 3 — Lorebook Manager & AI Generator | CRUD, Batch, Doc Extract, Wiki Scrape |
| 7F | Completion Verification Loop | Gọi API lặp đến khi đạt đủ tiêu chí |
| 7G | Fandom Priority Search | Ưu tiên Fandom.com khi tra cứu |
| 7H | Anti-Duplication & Coherence Engine | Chống trùng, chống rút gọn, mạch lạc |
| 8 | Module 4 — Regex Lab & Live Preview | Editor, Engine, iframe Preview |
| 8B | EJS Script Studio | EJS template, variable binding, live preview |
| 8C | JS Analyzer — App Hiểu JS Script | AST (Acorn), variable extractor, schema linker |
| 9 | Module 5 — AI Copilot & Client-Agent Loop | Chat UI, Action Loop, DiffView, Undo |
| 9B | RAG Engine (In-Browser) | TF-IDF index, cosine similarity, context builder |
| 9C | Prompts MVUZOD cho Copilot | **5 bước Lorebook→Schema→Scripts→Entries→Runtime** |
| 10 | Module 6 — Import / Export | Auto-detect, convert, 3 nút export |
| 11 | Lưu trữ dữ liệu & quản lý Project | Dexie schema, Snapshot, Undo |
| 12 | Kế hoạch triển khai theo Phase | 15 phases đầy đủ với DoD |
| 13 | Edge cases & lưu ý quan trọng | CORS, hiệu năng, an toàn, Unicode, MVUZOD |

---

## 1. Tổng quan sản phẩm

**Tên gọi:** Tavern Card Studio.

**Mô tả 1 câu:** Một web app (SPA, không cần backend) giúp người dùng **tạo, chỉnh sửa, và xuất file Character Card V3** cho SillyTavern (đầy đủ Lorebook/World Info, Regex Script, MVUZOD RPG engine, EJS templates, Tavern Helper script & variables), với AI hoạt động theo mô hình **Client-Agent Loop** — sinh hàng loạt Lorebook entry theo batch, trích xuất tài liệu `.txt`, cào dữ liệu từ Wiki/Fandom với ưu tiên Fandom, và một **trợ lý AI dạng chat (Copilot)** có thể trực tiếp sửa mọi phần của card theo yêu cầu ngôn ngữ tự nhiên.

**Người dùng mục tiêu:** Người sáng tác character card SillyTavern (cộng đồng RP tiếng Việt), đã quen với khái niệm Lorebook, Regex Script, World Info, @Depth, Author's Note, TavernHelper, MVUZOD...

### 1.1 — 7 trụ cột chính

| # | Tên module | Vai trò |
|---|---|---|
| 1 | **Settings** | Khai báo Proxy URL + API Key, quét model, chỉnh tham số sinh |
| 2 | **Card Editor** | Form chỉnh sửa toàn bộ field của card V3 |
| 3 | **Lorebook Manager & AI Generator** | CRUD entries, AI sinh theo batch/wiki/doc, Completion Verifier, Fandom Priority, Anti-Duplication, Coherence |
| 4 | **Regex Lab** | Tạo/sửa `regex_scripts`, xem trước HTML sau khi áp regex |
| 5 | **AI Assistant (Copilot)** | Chat AI chỉnh sửa card qua Client-Agent Loop — 5 chế độ Worldbuilding |
| 6 | **MVUZOD Studio** | Visual editor cho Zod schema, JSON Patch preview, template library RPG |
| 7 | **EJS Script Studio** | Tạo TavernHelper scripts với EJS template, JS Analyzer hiểu nội dung script |

### 1.2 — Mô hình Client-Agent Loop

```
Người dùng gửi yêu cầu
        ↓
┌─────────────────────────────────────────┐
│         VÒNG LẶP (keepRunning)          │
│                                         │
│  App → gửi Context + RAG + History → AI│
│  AI → trả JSON {thought, message,       │
│         status, actions}                │
│                                         │
│  ┌─ actions có "fetch_fandom_data"?     │
│  │   → Fandom Priority Queue → inject  │
│  ├─ actions có "read_document"?         │
│  │   → Chunk .txt → inject tiếp        │
│  ├─ actions create/update/delete?       │
│  │   → Anti-Dup Check → ActionCard     │
│  └─ actions update_field/regex...?      │
│      → DiffView → chờ user duyệt       │
│                                         │
│  Completion Verifier chạy sau batch     │
│  → nếu chưa đủ → tiếp tục tự động     │
│                                         │
│  status === "CONTINUE" → tiếp tục       │
│  status === "DONE" → thoát vòng lặp    │
└─────────────────────────────────────────┘
        ↓
Hiển thị kết quả cho người dùng
```

**Nguyên tắc quan trọng:** App là **single-page client-side**. Mọi gọi AI gửi trực tiếp từ browser tới `proxyBaseUrl`. Dữ liệu card lưu trong **IndexedDB** (Dexie), cấu hình proxy lưu trong **localStorage**.

---

## 2. Tech stack & cấu trúc thư mục

### 2.1 Stack

- **Build tool:** Vite
- **Framework:** React 18 + TypeScript (strict mode)
- **Styling:** TailwindCSS + `shadcn/ui` — dark mode mặc định
- **State management:** Zustand (middleware `persist` cho settings; card data qua Dexie riêng)
- **DB local:** Dexie.js (IndexedDB) — lưu nhiều Project
- **Form & validate:** react-hook-form + zod
- **Drag & drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Code editor:** CodeMirror 6 (`@uiw/react-codemirror`)
- **Icons:** lucide-react
- **HTML preview:** `<iframe sandbox="allow-scripts" srcDoc=...>` — cách ly CSS/script khỏi UI app
- **Ước lượng token:** `gpt-tokenizer` (browser-compatible)
- **Virtualized list:** `@tanstack/react-virtual` (cho Lorebook >500 entries)
- **HTML parser (wiki scraping):** `DOMParser` native của browser
- **Diff hiển thị:** `diff` / `jsdiff`
- **AST Parser (JS Analyzer):** `acorn` + `acorn-walk` — phân tích TavernHelper scripts
- **RAG (in-browser):** TF-IDF thuần JS, không cần thư viện ngoài

> **Không cần server.** Nếu proxy chặn CORS, ghi chú rõ trong UI (xem Phần 13).

### 2.2 Cấu trúc thư mục đầy đủ

```
src/
├── main.tsx
├── App.tsx
├── types/
│   ├── card.types.ts
│   ├── lorebook.types.ts
│   ├── regex.types.ts
│   ├── tavernHelper.types.ts
│   ├── settings.types.ts
│   ├── aiAgent.types.ts          ← AIResponse, AIAction, WorldbuildingMode
│   └── mvuzod.types.ts           ← MỚI: MVUZODSchema, JSONPatchOp, MVUZODConfig
├── lib/
│   ├── ai/
│   │   ├── client.ts             # unified chat-completion caller
│   │   ├── modelScanner.ts
│   │   ├── agentLoop.ts          ← Client-Agent Loop chính
│   │   ├── actionHandlers.ts     ← xử lý từng loại action
│   │   ├── wikiScraper.ts        ← Fandom Priority + MediaWiki + DOMParser fallback
│   │   ├── documentChunker.ts    ← chia .txt thành chunk 15,000 ký tự
│   │   ├── batchGenerator.ts     ← pipeline batch với RAG + Anti-Dup
│   │   ├── tools.ts              # tool definitions (OpenAI/Claude native)
│   │   ├── jsonExtract.ts        # tryExtractJsonArray (6 strategies)
│   │   └── deduplicator.ts       ← MỚI: 3-layer duplicate detection
│   ├── mvuzod/
│   │   ├── zodSchemaEditor.ts    ← MỚI: build JSON Schema từ MVUZODField[]
│   │   ├── jsonPatchEngine.ts    ← MỚI: apply JSON Patch với validation
│   │   ├── patchExtractor.ts     ← MỚI: trích xuất XML tags + code fence
│   │   ├── schemaInferencer.ts   ← MỚI: phân tích Lorebook → suy diễn schema
│   │   ├── stateRenderer.ts      ← MỚI: render state qua EJS template
│   │   └── schemaDefaults.ts     ← MỚI: template schema (RPG, cultivation, dating...)
│   ├── ejs/
│   │   ├── ejsParser.ts          ← MỚI: tokenizer EJS (<%= %> <% %> <%- %> <%# %>)
│   │   ├── ejsRenderer.ts        ← MỚI: render EJS trong sandbox
│   │   └── ejsValidator.ts       ← MỚI: validate syntax trước khi save
│   ├── jsAnalyzer/
│   │   ├── astParser.ts          ← MỚI: Acorn AST parser
│   │   ├── variableExtractor.ts  ← MỚI: trích xuất this.variables.X.Y read/write
│   │   ├── functionMapper.ts     ← MỚI: map function → mục đích
│   │   ├── schemaLinker.ts       ← MỚI: link biến JS → MVUZOD schema fields
│   │   └── scopeAnalyzer.ts      ← MỚI: scope, closures, event listeners
│   ├── rag/
│   │   ├── tfidfIndexer.ts       ← MỚI: TF-IDF index cho entries
│   │   ├── semanticSearch.ts     ← MỚI: cosine similarity search
│   │   └── ragContextBuilder.ts  ← MỚI: build RAG injection text cho prompt
│   ├── completionVerifier/
│   │   ├── criteria.ts           ← MỚI: CompletionCriteria type
│   │   ├── verifier.ts           ← MỚI: chạy verify loop sau batch
│   │   └── gapDetector.ts        ← MỚI: phát hiện topic chưa được phủ
│   ├── converters/
│   │   ├── lorebookConvert.ts
│   │   └── cardDefaults.ts
│   ├── regexEngine/
│   │   └── applyRegex.ts
│   ├── db/
│   │   ├── db.ts
│   │   └── projectRepo.ts
│   └── tokenizer.ts
├── store/
│   ├── settingsStore.ts
│   ├── cardStore.ts
│   └── chatStore.ts
├── prompts/
│   ├── systemBase.ts
│   ├── modeGenesis.ts
│   ├── modeEvolution.ts
│   ├── modeDocExtract.ts
│   ├── modeDiscussion.ts
│   └── modeMVUZOD.ts             ← MỚI: system prompt cho chế độ MVUZOD
├── components/
│   ├── layout/ (AppShell, Sidebar, TopBar, CopilotDrawer)
│   ├── settings/
│   ├── card-editor/
│   ├── lorebook/ (EntryList, EntryEditorDrawer, BatchGeneratorPanel,
│   │             WikiScraperPanel, DocExtractPanel,
│   │             CompletionCriteriaPanel, RAGDebugPanel)
│   ├── regex-lab/
│   ├── mvuzod/
│   │   ├── SchemaEditorPanel.tsx    ← MỚI: visual editor MVUZODField[]
│   │   ├── PatchPreviewPanel.tsx    ← MỚI: JSON Patch dry-run preview
│   │   ├── StateInspector.tsx       ← MỚI: hiển thị game state dạng tree
│   │   └── MVUZODTemplateLibrary.tsx
│   ├── ejs-studio/
│   │   ├── EJSEditor.tsx            ← MỚI: CodeMirror EJS mode
│   │   ├── EJSPreview.tsx           ← MỚI: live preview
│   │   ├── VariableBindingPanel.tsx ← MỚI: drag-to-insert variable
│   │   └── JSAnalyzerPanel.tsx      ← MỚI: kết quả phân tích AST
│   ├── ai-assistant/ (ChatPanel, MessageBubble, ActionCard, DiffView,
│   │                  ThoughtBubble, AgentStatusBar)
│   └── shared/
└── pages/
    ├── SettingsPage.tsx
    ├── CardEditorPage.tsx
    ├── LorebookPage.tsx
    ├── RegexLabPage.tsx
    ├── MVUZODPage.tsx               ← MỚI: route /mvuzod
    └── EJSStudioPage.tsx            ← MỚI: route /ejs-studio
```


---

## 3. SCHEMA DỮ LIỆU CHUẨN

> ⚠️ **QUAN TRỌNG NHẤT.** Mọi state nội bộ và file `.json` xuất ra phải khớp **chính xác** các interface dưới đây. Sai 1 field/tên/kiểu dữ liệu → SillyTavern không đọc được card.

### 3.1 Character Card V3

```typescript
interface CharacterCardV3 {
  spec: "chara_card_v3";
  spec_version: "3.0";
  data: CharacterData;
  // Mirror fields — PHẢI đồng bộ với data.* khi lưu/export (hàm syncMirrorFields)
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creatorcomment: string;
  avatar: string;           // "none" hoặc tên file ảnh
  talkativeness: string;    // LƯU Ý: STRING "0.5", không phải number
  fav: boolean;
  tags: string[];
  create_date: string;      // ISO 8601
}

interface CharacterData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  tags: string[];
  creator: string;
  character_version: string;
  alternate_greetings: string[];
  extensions: CardExtensions;
  character_book?: Lorebook;
}

interface CardExtensions {
  talkativeness: string;           // STRING "0".."1"
  fav: boolean;
  world: string;
  depth_prompt: DepthPrompt;
  tavern_helper: TavernHelperExtension;
  regex_scripts: RegexScript[];
  mvuzod?: MVUZODConfig;           // MỚI: MVUZOD config — xem Phần 3B
}
```

### 3.2 Lorebook (embedded trong Card)

```typescript
interface Lorebook {
  name: string;
  entries: LorebookEntry[];
}

interface LorebookEntry {
  id: number;
  keys: string[];
  secondary_keys: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  insertion_order: number;
  enabled: boolean;
  position: "before_char" | "after_char";
  use_regex: boolean;
  extensions: LorebookEntryExt;
}

interface LorebookEntryExt {
  position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  exclude_recursion: boolean;
  display_index: number;
  probability: number;
  useProbability: boolean;
  depth: number;
  selectiveLogic: 0 | 1 | 2 | 3;
  outlet_name: string;
  group: string;
  group_override: boolean;
  group_weight: number;
  prevent_recursion: boolean;
  delay_until_recursion: boolean;
  scan_depth: number | null;
  match_whole_words: boolean | null;
  use_group_scoring: boolean;
  case_sensitive: boolean | null;
  automation_id: string;
  role: 0 | 1 | 2 | null;
  vectorized: boolean;
  sticky: number;
  cooldown: number;
  delay: number;
  match_persona_description: boolean;
  match_character_description: boolean;
  match_character_personality: boolean;
  match_character_depth_prompt: boolean;
  match_scenario: boolean;
  match_creator_notes: boolean;
  triggers: string[];
  ignore_budget: boolean;
}

const DEFAULT_ENTRY_EXT: LorebookEntryExt = {
  position: 0, exclude_recursion: true, display_index: 0,
  probability: 100, useProbability: true, depth: 4, selectiveLogic: 0,
  outlet_name: "", group: "", group_override: false, group_weight: 100,
  prevent_recursion: true, delay_until_recursion: false, scan_depth: null,
  match_whole_words: null, use_group_scoring: false, case_sensitive: null,
  automation_id: "", role: null, vectorized: false, sticky: 0, cooldown: 0, delay: 0,
  match_persona_description: false, match_character_description: false,
  match_character_personality: false, match_character_depth_prompt: false,
  match_scenario: false, match_creator_notes: false, triggers: [], ignore_budget: false,
};
// Default entry mới: constant=false, selective=true, enabled=true, use_regex=true,
// position="before_char", secondary_keys=[], insertion_order=100
```

### 3.3 TavernHelper Extension

```typescript
interface TavernHelperExtension {
  scripts: TavernHelperScript[];
  variables: Record<string, unknown>;
}

interface TavernHelperScript {
  type: "script";
  enabled: boolean;
  name: string;
  id: string;       // uuid v4
  content: string;  // JS, có thể >130,000 ký tự
  info: string;
  button: {
    enabled: boolean;
    buttons: { name: string; visible: boolean }[];
  };
  data: Record<string, unknown>;
}
```

### 3.4 Regex Scripts

```typescript
interface RegexScript {
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
type RegexPlacement = 1 | 2 | 3 | 4 | 5;
```

### 3.5 DepthPrompt

```typescript
interface DepthPrompt {
  prompt: string;
  depth: number;            // mặc định 4
  role: "system" | "user" | "assistant";
}
```

### 3.6 Lorebook Standalone (export riêng)

```typescript
interface StandaloneLorebookFile {
  entries: Record<string, StandaloneEntry>;   // key: "0","1","2"...
}

interface StandaloneEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  vectorized: boolean;
  selective: boolean;
  selectiveLogic: number;
  addMemo: boolean;
  order: number;
  position: number;        // 0-7 trực tiếp
  disable: boolean;        // = !enabled
  ignoreBudget: boolean;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;
  delayUntilRecursion: boolean;
  probability: number;
  useProbability: boolean;
  depth: number;
  outletName: string;
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  scanDepth: number | null;
  caseSensitive: boolean | null;
  matchWholeWords: boolean | null;
  useGroupScoring: boolean | null;
  automationId: string;
  role: number | null;
  sticky: number;
  cooldown: number;
  delay: number;
  triggers: string[];
  displayIndex: number;
  characterFilter: { isExclude: boolean; names: string[]; tags: string[] };
}
```

### 3.7 Bảng tra `extensions.position` (0-7)

| Giá trị | Tên SillyTavern | `position` field | Field bổ sung | Ghi chú |
|---|---|---|---|---|
| `0` | Before Char Defs | `"before_char"` | — | Chèn TRƯỚC description/scenario |
| `1` | After Char Defs | `"after_char"` | — | Chèn SAU description/scenario |
| `2` | Top of Author's Note | `"after_char"` | — | |
| `3` | Bottom of Author's Note | `"after_char"` | — | |
| `4` | @Depth | `"after_char"` | `depth`, `role` (0/1/2) | Độ sâu cụ thể trong hội thoại |
| `5` | Before Example Messages | `"after_char"` | — | |
| `6` | After Example Messages | `"after_char"` | — | |
| `7` | Outlet | `"after_char"` | `outlet_name` | Gọi qua `{{outlet::Name}}` |

> Quy tắc: `position = "before_char"` nếu `extensions.position === 0`, ngược lại luôn `"after_char"`.

### 3.8 Bảng tra `selectiveLogic`

| Giá trị | Ý nghĩa |
|---|---|
| `0` | AND ANY (mặc định) |
| `1` | NOT ALL |
| `2` | NOT ANY |
| `3` | AND ALL |

### 3.9 Bảng tra `placement` (regex)

| Giá trị | Ý nghĩa |
|---|---|
| `1` | User Input |
| `2` | AI Output (phổ biến nhất) |
| `3` | Slash Commands |
| `4` | World Info |
| `5` | Reasoning |

### 3.10 Bảng tra `substituteRegex`

| Giá trị | Ý nghĩa |
|---|---|
| `0` | None |
| `1` | Raw |
| `2` | Escaped |

---

## 3A. AI ACTION SCHEMA — Client-Agent Loop

> ⚠️ **PHẦN NÀY QUAN TRỌNG NGANG PHẦN 3.** Định nghĩa cấu trúc JSON thống nhất mà AI **bắt buộc** phải trả về trong mọi lượt gọi.

### 3A.1 Cấu trúc phản hồi AI

```typescript
interface AIResponse {
  thought: string;    // Tư duy nội bộ — hiển thị dạng ThoughtBubble thu gọn
  message: string;    // Lời thoại trả lời người dùng (markdown OK)
  status: "CONTINUE" | "DONE";
  actions: AIAction[];
}

type AIAction =
  | CreateEntryAction | UpdateEntryAction | DeleteEntryAction
  | UpdateFieldAction
  | AddRegexAction | UpdateRegexAction | DeleteRegexAction
  | FetchFandomAction | ReadDocumentAction
  | SetVariableAction;

interface CreateEntryAction  { type: "create_entry"; data: AIGeneratedEntry; }
interface UpdateEntryAction  { type: "update_entry"; target_comment: string; data: Partial<LorebookEntry & LorebookEntryExt>; }
interface DeleteEntryAction  { type: "delete_entry"; target_comment: string; }
interface UpdateFieldAction  { type: "update_field"; path: string; value: string | number | boolean | string[]; }
interface AddRegexAction     { type: "add_regex"; data: Omit<RegexScript, "id">; }
interface UpdateRegexAction  { type: "update_regex"; id: string; patch: Partial<RegexScript>; }
interface DeleteRegexAction  { type: "delete_regex"; id: string; }
interface FetchFandomAction  { type: "fetch_fandom_data"; url: string; }
interface ReadDocumentAction { type: "read_document"; chunk_index: number; }
interface SetVariableAction  { type: "set_variable"; key: string; value: unknown; }
```

### 3A.2 Schema JSON rút gọn cho Batch Generator

```typescript
interface AIGeneratedEntry {
  comment: string;         // BẮT BUỘC — tên/nhãn entry
  keys: string[];          // BẮT BUỘC — 2-6 từ khoá kích hoạt
  secondary_keys?: string[];
  content: string;         // BẮT BUỘC — nội dung thuần túy ngôi thứ ba
  constant?: boolean;      // default false
  selective?: boolean;     // default true
  insertion_order?: number;
}
```

### 3A.3 Fallback JSON (cho provider không hỗ trợ native tool-calling)

```json
{
  "thought": "Người dùng muốn cập nhật tính cách. Tôi sẽ đọc field hiện tại...",
  "message": "Tôi sẽ điều chỉnh tính cách của [tên char] theo hướng bạn yêu cầu nhé.",
  "status": "DONE",
  "actions": [
    { "type": "update_field", "path": "data.personality", "value": "Lạnh lùng, kiệm lời..." }
  ]
}
```

---

## 3B. MVUZOD DATA SCHEMA

> Bổ sung cho Phần 3. Kiểu dữ liệu cho hệ thống MVUZOD (Macro Variable Updater — Zod/JSON Patch) tích hợp với TavernHelper.

### 3B.0 Nguyên tắc cốt lõi — Lorebook First, Schema Second

> ⚠️ **QUAN TRỌNG:** Schema MVUZOD **không được tạo trước**. Schema phải được **suy diễn từ nội dung Lorebook** đã có. Đây là khác biệt then chốt so với cách tiếp cận thông thường.

```
ĐÚNG:   Lorebook (lore, NPC, rules) → Phân tích → Schema → Scripts
SAI:    Schema → Lorebook (schema quyết định content)
```

**Lý do:** Schema biến của game (enum era, loại cảnh, thuộc tính nhân vật...) phải phản ánh chính xác những gì Lorebook mô tả. Ví dụ từ card Đấu La Đại Lục thực tế:
- Lorebook có 125 entries "Đấu 1", 198 entries "Đấu 2", 271 entries "Đấu 3" → Schema cần `"Thời đại hiện tại": enum["Đấu 1","Đấu 2","Đấu 3"]`
- Lorebook có entries về "Hàng ngày, Chiến đấu, Tu luyện, Liệp hồn..." → Schema cần `"Loại cảnh hiện tại": enum[...]`
- Lorebook có entries NPC với data JSON → Schema cần `NPC: Record<tên, {level, race, ...}>`

### 3B.1 Kiến trúc MVUZOD trong Card

MVUZOD thay thế MVU regex-based bằng JSON Patch có Zod validation. Trong card SillyTavern, MVUZOD sống ở:

```
data.character_book.entries[]            ← [BƯỚC 1] Lorebook — nền tảng của mọi thứ
data.extensions.tavern_helper.scripts[]  ← [BƯỚC 2] Zod Schema + MVU Engine (JS)
data.character_book.entries[] (special)  ← [BƯỚC 3] 5 entries hệ thống MVUZOD
data.extensions.mvuzod                   ← Config meta (extractor regex, templates)
```

**Quy trình tạo MVUZOD card (thứ tự bắt buộc):**

```
┌─────────────────────────────────────────────────────────┐
│  BƯỚC 1 — XÂY DỰNG LOREBOOK (nội dung thế giới)        │
│  Tạo đầy đủ: lore, NPC, rules, timeline, hệ thống...   │
│  Đây là "database" mà schema sẽ phản ánh               │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  BƯỚC 2 — PHÂN TÍCH LOREBOOK → SUY DIỄN SCHEMA         │
│  schemaInferencer.ts quét toàn bộ entries:              │
│  • Tìm categories/nhóm → enum fields                    │
│  • Tìm thuộc tính nhân vật → object children           │
│  • Tìm NPC patterns → Record fields                     │
│  • Tìm số liệu cần track → number + clamp              │
│  AI tổng hợp → đề xuất MVUZODSchema phù hợp            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  BƯỚC 3 — TẠO 5 ENTRIES HỆ THỐNG MVUZOD               │
│  [EJS Controller]  — @@preprocessing đọc biến,         │
│                      chọn entries theo state hiện tại   │
│  [mvu_update] Rules — hướng dẫn AI cập nhật biến       │
│  [mvu_update] Format — định dạng <UpdateVariable>...   │
│  [mvu_update] Emphasis — nhắc AI luôn xuất update      │
│  [initvar]    — giá trị ban đầu (mirror schema default) │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  BƯỚC 4 — TẠO TAVERN HELPER SCRIPTS                    │
│  Script 1: import MVU library từ jsdelivr               │
│  Script 2: registerMvuSchema(schema) — Zod validation   │
│  Script 3+: combat sim, economy sim... (tùy game)       │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  RUNTIME (khi người dùng chơi trong SillyTavern)       │
│  AI Response → <UpdateVariable>[...]</UpdateVariable>   │
│  TavernHelper trích xuất → JSON Patch ops              │
│  Zod validation (clamp/prefault/coerce)                │
│  → variables cập nhật → EJS controller chọn entries   │
│  → AI thấy state mới trong context lượt tiếp           │
└─────────────────────────────────────────────────────────┘
```

**Định dạng output của AI (runtime) — dùng XML tags, không phải code fence:**
```
<UpdateVariable>
[
  {"op":"replace","path":"/Trạng thái thế giới/Thời đại hiện tại","value":"Đấu 1"},
  {"op":"delta",  "path":"/Người chơi/Trạng thái tu luyện/Cấp bậc hồn lực","value":1},
  {"op":"insert", "path":"/Người chơi/Thông tin võ hồn/Thanh Long/Hồn hoàn/1","value":{"Màu sắc":"Trắng","Niên hạn":"Trăm năm","Hồn thú nguồn gốc":"Hồn thú trắng"}}
]
</UpdateVariable>
```

> **Lưu ý:** Extractor regex mặc định là `/<UpdateVariable>([\s\S]+?)<\/UpdateVariable>/gi` (dùng XML tags như card Đấu La thực tế). Có thể config sang ` ```mvuzod ``` ` qua `MVUZODConfig.extractorRegex`.

### 3B.1B Schema Inferencer (`lib/mvuzod/schemaInferencer.ts`)

Module phân tích Lorebook để đề xuất schema — **đây là module trung tâm của workflow MVUZOD**.

```typescript
// src/lib/mvuzod/schemaInferencer.ts

export interface InferenceResult {
  proposedSchema: MVUZODSchema;
  inferenceReport: InferenceReport;
}

export interface InferenceReport {
  entryCount: number;
  detectedGroups: Array<{ name: string; count: number; sample: string[] }>;
  detectedEnums: Array<{ path: string; values: string[]; source: string }>;
  detectedNPCPattern: boolean;
  detectedCultivationSystem: boolean;
  suggestedFields: Array<{ path: string; reason: string; confidence: number }>;
  warnings: string[];
}

// ===== PHÂN TÍCH CẤU TRÚC ENTRIES =====

export function analyzeLorebookForSchema(entries: LorebookEntry[]): InferenceReport {
  const report: InferenceReport = {
    entryCount: entries.length,
    detectedGroups: [],
    detectedEnums: [],
    detectedNPCPattern: false,
    detectedCultivationSystem: false,
    suggestedFields: [],
    warnings: [],
  };

  // 1. Phân tích nhóm từ prefix của comment
  //    Ví dụ: "Đấu 1: ...", "Đấu 2: ...", "Đấu 3: ..." → enum ["Đấu 1","Đấu 2","Đấu 3"]
  const prefixCounts = new Map<string, number>();
  for (const entry of entries) {
    const prefix = entry.comment.match(/^([^:：\[\]]+)[:：]/)?.[1]?.trim();
    if (prefix) prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
  }
  const groups = [...prefixCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a);

  report.detectedGroups = groups.map(([name, count]) => ({
    name,
    count,
    sample: entries.filter(e => e.comment.startsWith(name)).slice(0, 3).map(e => e.comment),
  }));

  // Nếu có >= 2 groups có entry nhiều → đề xuất enum "Thời đại / Giai đoạn"
  if (groups.length >= 2 && groups[0][1] >= 5) {
    const enumValues = groups.map(([name]) => name);
    report.detectedEnums.push({
      path: "/Trạng thái thế giới/Giai đoạn hiện tại",
      values: enumValues,
      source: `${groups.length} nhóm entries: ${enumValues.join(", ")}`,
    });
    report.suggestedFields.push({
      path: "/Trạng thái thế giới/Giai đoạn hiện tại",
      reason: `Lorebook có ${groups.length} nhóm rõ ràng (${enumValues.slice(0,3).join(", ")}...)`,
      confidence: 0.9,
    });
  }

  // 2. Phát hiện NPC pattern: comment dạng "[NPC ...]" hoặc "[NPC ...] Name"
  const npcEntries = entries.filter(e =>
    e.comment.match(/^\[NPC/) || e.comment.match(/NPC[-\s]/)
  );
  if (npcEntries.length >= 2) {
    report.detectedNPCPattern = true;
    report.suggestedFields.push({
      path: "/NPC",
      reason: `Phát hiện ${npcEntries.length} entries NPC — cần Record<tên, NPC data>`,
      confidence: 0.85,
    });
  }

  // 3. Phát hiện hệ thống tu luyện / cultivation system
  const cultivationKeywords = ["cấp bậc", "tu luyện", "hồn lực", "cảnh giới", "tu vi", "lực lượng", "level", "exp", "kinh nghiệm"];
  const hasCultivation = entries.some(e =>
    cultivationKeywords.some(kw => e.content.toLowerCase().includes(kw))
  );
  if (hasCultivation) {
    report.detectedCultivationSystem = true;
    report.suggestedFields.push({
      path: "/Người chơi/Trạng thái tu luyện/Cấp bậc",
      reason: "Phát hiện hệ thống tu luyện/level trong content entries",
      confidence: 0.8,
    });
  }

  // 4. Phát hiện loại cảnh từ entries quy tắc
  const sceneTypes = extractSceneTypesFromEntries(entries);
  if (sceneTypes.length >= 3) {
    report.detectedEnums.push({
      path: "/Trạng thái thế giới/Loại cảnh hiện tại",
      values: sceneTypes,
      source: "Từ entries quy tắc và event entries",
    });
  }

  // 5. Cảnh báo
  if (entries.length < 10) {
    report.warnings.push("Lorebook có ít entries (<10) — schema sẽ rất đơn giản. Nên tạo thêm entries lore trước.");
  }
  if (groups.length === 0) {
    report.warnings.push("Không tìm thấy nhóm entries rõ ràng. Xem xét thêm prefix vào comment entries.");
  }

  return report;
}

function extractSceneTypesFromEntries(entries: LorebookEntry[]): string[] {
  const sceneKeywords = new Set<string>();
  const patterns = [
    /loại cảnh[:\s]+([^\n,]+)/gi,
    /scene_type[:\s]+([^\n,]+)/gi,
    /cảnh (hàng ngày|chiến đấu|tu luyện|liệp hồn|thân mật|xã giao|mua sắm|thi đấu|khảo hạch)/gi,
  ];
  for (const entry of entries) {
    for (const pattern of patterns) {
      const matches = entry.content.matchAll(pattern);
      for (const match of matches) sceneKeywords.add(match[1].trim());
    }
  }
  return [...sceneKeywords].slice(0, 15);
}

// ===== AI-ASSISTED INFERENCE =====

export async function inferSchemaWithAI(
  entries: LorebookEntry[],
  report: InferenceReport,
  ctx: RunContext
): Promise<MVUZODSchema> {
  // Lấy mẫu đại diện: constant entries + entries theo nhóm
  const sampleEntries = [
    ...entries.filter(e => e.constant).slice(0, 10),
    ...entries.filter(e => !e.constant).slice(0, 20),
  ].slice(0, 25);

  const sampleText = sampleEntries.map(e =>
    `[${e.comment}] (${e.constant ? "constant" : "selective"}):\n${e.content.slice(0, 300)}`
  ).join("\n\n---\n\n");

  const prompt = `Bạn là chuyên gia thiết kế MVUZOD schema cho SillyTavern.

PHÂN TÍCH LOREBOOK (${entries.length} entries):
- Nhóm phát hiện: ${report.detectedGroups.map(g => `"${g.name}" (${g.count} entries)`).join(", ")}
- Enum đề xuất: ${report.detectedEnums.map(e => `${e.path}: [${e.values.join(", ")}]`).join(" | ")}
- NPC pattern: ${report.detectedNPCPattern ? "CÓ" : "KHÔNG"}
- Hệ thống tu luyện: ${report.detectedCultivationSystem ? "CÓ" : "KHÔNG"}

MẪU ENTRIES:
${sampleText}

NHIỆM VỤ: Tạo MVUZODSchema JSON phù hợp với nội dung Lorebook trên.

QUY TẮC THIẾT KẾ SCHEMA:
1. ENUM từ groups: nếu có nhóm "Đấu 1/2/3" → field enum với values đó
2. RECORD cho NPC: Record<tênNPC, {level, race, ...}>
3. NUMBER + clamp cho stats: HP[0,100], cấp bậc[0,200]...
4. ARRAY cho danh sách: kỹ năng, vật phẩm, trạng thái...
5. STRING + prefault("Chờ khởi tạo") cho text chưa biết
6. prefix "_" cho readonly fields (biến hệ thống)
7. KHÔNG tạo field cho thứ không thay đổi trong gameplay
8. Tên field tiếng Việt (giống như content Lorebook để dễ nhất quán)

CHỈ trả về JSON object MVUZODSchema hợp lệ, không giải thích.`;

  const raw = await callAI(
    [{ role: "system", content: "Trả về JSON thuần túy, không markdown, không giải thích." },
     { role: "user", content: prompt }],
    ctx.profile,
    { ...ctx.generationParams, max_tokens: 4096 }
  );

  try {
    const jsonStr = raw.match(/\{[\s\S]+\}/)?.[0] ?? raw;
    return JSON.parse(jsonStr) as MVUZODSchema;
  } catch {
    // Fallback: trả về schema tối giản từ report
    return buildMinimalSchemaFromReport(report);
  }
}

function buildMinimalSchemaFromReport(report: InferenceReport): MVUZODSchema {
  const fields: MVUZODField[] = [];

  // Trạng thái thế giới
  const worldChildren: MVUZODField[] = [
    { path: "/Ngày tháng hiện tại", type: "string", label: "Ngày tháng", defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
    { path: "/Khu vực hiện tại",    type: "string", label: "Khu vực",    defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
    { path: "/Cảnh hiện tại",       type: "string", label: "Cảnh",       defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
  ];

  if (report.detectedGroups.length >= 2) {
    worldChildren.unshift({
      path: "/Giai đoạn hiện tại",
      type: "string",
      label: "Giai đoạn",
      defaultValue: report.detectedGroups[0].name,
      constraints: { prefault: "Chờ khởi tạo" },
      description: `enum[${report.detectedGroups.map(g=>g.name).join(", ")}]`,
    });
  }

  fields.push({ path: "/Trạng thái thế giới", type: "object", label: "Thế giới", defaultValue: {}, constraints: { prefault: {} }, children: worldChildren });

  // Người chơi
  const playerChildren: MVUZODField[] = [
    { path: "/Họ tên",  type: "string", label: "Tên",    defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
    { path: "/Giới tính", type: "string", label: "Giới tính", defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
  ];

  if (report.detectedCultivationSystem) {
    playerChildren.push({ path: "/Cấp bậc", type: "number", label: "Cấp bậc", defaultValue: 0, constraints: { coerce: true, min: 0, prefault: 0 } });
  }

  fields.push({ path: "/Người chơi", type: "object", label: "Người chơi", defaultValue: {}, constraints: { prefault: {} }, children: playerChildren });

  if (report.detectedNPCPattern) {
    fields.push({ path: "/NPC", type: "record", label: "Danh sách NPC", defaultValue: {}, constraints: { prefault: {} }, description: "Record<tênNPC, {level, race, present}>" });
  }

  return { version: "1.0", fields };
}

### 3B.2 TypeScript Types cho MVUZOD

```typescript
// === MVUZOD FIELD DEFINITION ===
interface MVUZODField {
  path: string;          // JSON Pointer: "/Người_Chơi/HP"
  type: "string" | "number" | "boolean" | "record" | "array" | "object";
  label: string;         // Hiển thị trong UI
  defaultValue: unknown;
  constraints: {
    min?: number;        // cho number
    max?: number;        // cho number
    coerce?: boolean;    // auto-convert type
    prefault?: unknown;  // giá trị thay thế khi AI trả về null/undefined
    readOnly?: boolean;  // AI không được ghi
    hidden?: boolean;    // Ẩn khỏi AI hoàn toàn (private)
    clamp?: [number, number];   // [min, max] transform
    pattern?: string;    // regex validate cho string
  };
  description?: string;  // Mô tả cho AI (đưa vào JSON Schema)
  children?: MVUZODField[];  // cho nested object
}

interface MVUZODSchema {
  version: string;       // "1.0"
  fields: MVUZODField[];
}

// === JSON PATCH OPERATIONS (RFC 6902 mở rộng) ===
type JSONPatchOp =
  | { op: "replace"; path: string; value: unknown }
  | { op: "delta";   path: string; value: number }    // Mở rộng: cộng/trừ số
  | { op: "insert";  path: string; value: unknown }   // Object key hoặc array "-"
  | { op: "remove";  path: string }
  | { op: "move";    from: string; to: string };

interface MVUZODPatchBlock {
  mvuzod_patch: JSONPatchOp[];
}

// === MVUZOD CONFIG (gắn vào CardExtensions) ===
interface MVUZODConfig {
  schema: MVUZODSchema;
  // Format XML tags: /<UpdateVariable>([\s\S]+?)<\/UpdateVariable>/gi  ← default (card Đấu La)
  // Format code fence: /```mvuzod\s*([\s\S]+?)```/gi                   ← alternative
  extractorRegex: string;
  validationMode: "strict" | "lenient";
  stateHistoryMaxLength: number;   // default 20
  // Key lưu state trong TavernHelper.variables — mặc định "stat_data"
  // EJS dùng: getvar('stat_data.Trạng thái thế giới.Thời đại hiện tại')
  variableKey: string;             // default "stat_data"
  displayTemplate: string;         // EJS template render state cho user xem
  injectionTemplate: string;       // EJS template inject state vào context AI
}

// === VALIDATION RESULT ===
interface PatchValidationResult {
  success: boolean;
  appliedOps: number;
  errors: Array<{
    path: string; op: string; reason: string;
    fallbackApplied?: boolean; fallbackValue?: unknown;
  }>;
  newState: Record<string, unknown>;
}
```

### 3B.3 `patchExtractor.ts`

Hỗ trợ 3 format theo thứ tự ưu tiên:
1. `<UpdateVariable>[...]</UpdateVariable>` — format chuẩn (học từ card Đấu La thực tế)
2. ` ```mvuzod [...] ``` ` — format code fence (tương thích ngược)
3. JSON Patch array trực tiếp trong response (fallback)

```typescript
// src/lib/mvuzod/patchExtractor.ts

// Format 1 (ưu tiên): XML tags — dùng trong card Đấu La và các card MVUZOD thực tế
const XML_EXTRACTOR  = /<UpdateVariable>([\s\S]+?)<\/UpdateVariable>/gi;
// Format 2: Code fence — dùng khi config sang format khác
const FENCE_EXTRACTOR = /```mvuzod\s*([\s\S]+?)```/gi;

export function extractPatches(
  text: string,
  customRegex?: string          // từ MVUZODConfig.extractorRegex — override cả 2 default
): JSONPatchOp[] {
  const allOps: JSONPatchOp[] = [];

  // Nếu có custom regex, chỉ dùng nó
  if (customRegex) {
    const regex = new RegExp(customRegex, "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      allOps.push(...tryParseOps(match[1]));
    }
    return allOps;
  }

  // Format 1: <UpdateVariable>
  let match1;
  const re1 = new RegExp(XML_EXTRACTOR.source, "gi");
  while ((match1 = re1.exec(text)) !== null) {
    allOps.push(...tryParseOps(match1[1]));
  }

  // Format 2: ```mvuzod (chỉ thử nếu Format 1 không tìm thấy gì)
  if (allOps.length === 0) {
    let match2;
    const re2 = new RegExp(FENCE_EXTRACTOR.source, "gi");
    while ((match2 = re2.exec(text)) !== null) {
      allOps.push(...tryParseOps(match2[1]));
    }
  }

  return allOps;
}

function tryParseOps(raw: string): JSONPatchOp[] {
  try {
    const parsed = JSON.parse(raw.trim());
    // Hỗ trợ cả array trực tiếp và object bọc ngoài
    const ops = Array.isArray(parsed)
      ? parsed
      : (parsed.mvuzod_patch ?? parsed.ops ?? parsed.operations ?? null);
    if (Array.isArray(ops)) return ops as JSONPatchOp[];
  } catch { /* bỏ qua block lỗi JSON */ }
  return [];
}

// Convenience: kiểm tra text có patch không (dùng để quyết định có trigger engine không)
export function hasPatchBlock(text: string, customRegex?: string): boolean {
  if (customRegex) return new RegExp(customRegex, "i").test(text);
  return XML_EXTRACTOR.test(text) || FENCE_EXTRACTOR.test(text);
}
```

### 3B.4 `jsonPatchEngine.ts`

```typescript
// src/lib/mvuzod/jsonPatchEngine.ts
import _ from "lodash";

export function applyPatch(
  state: Record<string, unknown>,
  ops: JSONPatchOp[],
  schema: MVUZODSchema,
  mode: "strict" | "lenient" = "lenient"
): PatchValidationResult {
  const newState = _.cloneDeep(state);
  const errors: PatchValidationResult["errors"] = [];
  let appliedOps = 0;

  for (const op of ops) {
    try {
      const field = findSchemaField(schema, (op as any).path ?? "");
      if (field?.constraints.readOnly) {
        errors.push({ path: (op as any).path, op: op.op, reason: "Field readOnly" });
        continue;
      }
      if (field?.constraints.hidden) {
        errors.push({ path: (op as any).path, op: op.op, reason: "Field hidden/private" });
        continue;
      }

      switch (op.op) {
        case "replace": {
          let val = field?.constraints.coerce ? coerceValue(op.value, field) : op.value;
          val = applyConstraints(val, field);
          _.set(newState, ptr2path(op.path), val);
          break;
        }
        case "delta": {
          const cur = Number(_.get(newState, ptr2path(op.path)) ?? 0);
          let next = cur + op.value;
          if (field?.constraints.clamp) {
            next = Math.min(Math.max(next, field.constraints.clamp[0]), field.constraints.clamp[1]);
          }
          _.set(newState, ptr2path(op.path), next);
          break;
        }
        case "insert": {
          if (op.path.endsWith("/-")) {
            const arr = (_.get(newState, ptr2path(op.path.slice(0, -2))) as unknown[]) ?? [];
            arr.push(op.value);
            _.set(newState, ptr2path(op.path.slice(0, -2)), arr);
          } else {
            _.set(newState, ptr2path(op.path), op.value);
          }
          break;
        }
        case "remove":  _.unset(newState, ptr2path(op.path)); break;
        case "move": {
          const val = _.get(newState, ptr2path(op.from));
          _.unset(newState, ptr2path(op.from));
          _.set(newState, ptr2path(op.to), val);
          break;
        }
      }
      appliedOps++;
    } catch (e) {
      const errItem = { path: (op as any).path ?? "?", op: op.op, reason: String(e) };
      if (mode === "strict") throw new Error(JSON.stringify(errItem));
      const field = findSchemaField(schema, (op as any).path ?? "");
      if (field?.constraints.prefault !== undefined) {
        _.set(newState, ptr2path((op as any).path), field.constraints.prefault);
        errors.push({ ...errItem, fallbackApplied: true, fallbackValue: field.constraints.prefault });
      } else {
        errors.push(errItem);
      }
    }
  }
  return { success: errors.length === 0, appliedOps, errors, newState };
}

const ptr2path = (pointer: string) => pointer.replace(/^\//, "").replace(/\//g, ".");

function coerceValue(val: unknown, field: MVUZODField): unknown {
  if (field.type === "number") return Number(val);
  if (field.type === "boolean") return Boolean(val);
  if (field.type === "string") return String(val ?? "");
  return val;
}

function applyConstraints(val: unknown, field?: MVUZODField): unknown {
  if (!field) return val;
  const c = field.constraints;
  if (field.type === "number" && c.clamp) {
    return Math.min(Math.max(Number(val), c.clamp[0]), c.clamp[1]);
  }
  if (field.type === "string" && c.pattern && !new RegExp(c.pattern).test(String(val ?? ""))) {
    throw new Error(`Giá trị "${val}" không khớp pattern ${c.pattern}`);
  }
  return val;
}

function findSchemaField(schema: MVUZODSchema, pointer: string): MVUZODField | undefined {
  const parts = pointer.replace(/^\//, "").split("/");
  let fields = schema.fields;
  let found: MVUZODField | undefined;
  for (const part of parts) {
    found = fields.find(f => f.path.replace(/^\//, "") === part);
    if (!found) return undefined;
    fields = found.children ?? [];
  }
  return found;
}
```

### 3B.5 Template Schema Library (`schemaDefaults.ts`)

> Templates bên dưới là **điểm khởi đầu** — luôn cần chạy Schema Inferencer trên Lorebook thực tế để tùy chỉnh enum values, field names, và cấu trúc cho phù hợp với thế giới cụ thể.

```typescript
// src/lib/mvuzod/schemaDefaults.ts

// Config mặc định đầy đủ cho card mới
export const DEFAULT_MVUZOD_CONFIG: Omit<MVUZODConfig, "schema"> = {
  extractorRegex: "<UpdateVariable>([\\s\\S]+?)<\\/UpdateVariable>",  // XML tags (chuẩn)
  validationMode: "lenient",
  stateHistoryMaxLength: 20,
  variableKey: "stat_data",   // key trong TavernHelper.variables — dùng nhất quán
  displayTemplate: "",         // Điền sau khi schema xong
  injectionTemplate: "",
};

export const MVUZOD_TEMPLATES: Record<string, MVUZODSchema> = {
  // === RPG CƠ BẢN ===
  rpg_basic: {
    version: "1.0",
    fields: [
      { path: "/Trạng thái thế giới", type: "object", label: "Thế giới", defaultValue: {}, constraints: { prefault: {} }, children: [
        { path: "/Ngày tháng hiện tại", type: "string",  label: "Ngày",       defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
        { path: "/Khu vực hiện tại",   type: "string",  label: "Khu vực",    defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
        { path: "/Loại cảnh hiện tại", type: "string",  label: "Loại cảnh", defaultValue: "Hàng ngày",     constraints: { prefault: "Hàng ngày" }, description: "enum[Hàng ngày,Chiến đấu,Khám phá,Xã giao]" },
      ]},
      { path: "/Người chơi", type: "object", label: "Nhân vật", defaultValue: {}, constraints: { prefault: {} }, children: [
        { path: "/Họ tên",  type: "string", label: "Tên",  defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
        { path: "/HP",      type: "number", label: "HP",   defaultValue: 100, constraints: { coerce: true, clamp: [0, 100], prefault: 100 } },
        { path: "/MP",      type: "number", label: "MP",   defaultValue: 50,  constraints: { coerce: true, clamp: [0, 50],  prefault: 50 } },
        { path: "/Cấp",    type: "number", label: "Cấp",  defaultValue: 1,   constraints: { coerce: true, min: 1, prefault: 1 } },
        { path: "/EXP",    type: "number", label: "EXP",  defaultValue: 0,   constraints: { coerce: true, prefault: 0 } },
        { path: "/Bạc",    type: "number", label: "Bạc",  defaultValue: 0,   constraints: { coerce: true, min: 0, prefault: 0 } },
        { path: "/Túi đồ", type: "record", label: "Đồ",  defaultValue: {}, constraints: { prefault: {} }, description: "Record<tên,{Mô tả,Số lượng}>" },
        { path: "/Kỹ năng",type: "record", label: "Skill",defaultValue: {}, constraints: { prefault: {} } },
        { path: "/Trạng thái", type: "array", label: "Buff/Debuff", defaultValue: [], constraints: { prefault: [] } },
      ]},
      { path: "/NPC", type: "record", label: "NPC", defaultValue: {}, constraints: { prefault: {} }, description: "Record<tên,{level,relation,present}>" },
    ],
  },

  // === TU TIÊN / CULTIVATION ===
  cultivation: {
    version: "1.0",
    fields: [
      { path: "/Trạng thái thế giới", type: "object", label: "Thế giới", defaultValue: {}, constraints: { prefault: {} }, children: [
        { path: "/Thời đại",          type: "string", label: "Thời đại",   defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
        { path: "/Khu vực hiện tại",  type: "string", label: "Khu vực",    defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
        { path: "/Loại cảnh hiện tại",type: "string", label: "Loại cảnh", defaultValue: "Hàng ngày",    constraints: { prefault: "Hàng ngày" }, description: "enum[Hàng ngày,Tu luyện,Chiến đấu,Du lịch,Mua sắm]" },
      ]},
      { path: "/Người chơi", type: "object", label: "Người chơi", defaultValue: {}, constraints: { prefault: {} }, children: [
        { path: "/Thông tin cơ bản", type: "object", label: "Cơ bản", defaultValue: {}, constraints: { prefault: {} }, children: [
          { path: "/Họ tên",     type: "string", label: "Tên",        defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
          { path: "/Tuổi",       type: "number", label: "Tuổi",       defaultValue: 0,   constraints: { coerce: true, prefault: 0 } },
          { path: "/Chủng tộc", type: "string", label: "Chủng tộc", defaultValue: "Nhân loại",   constraints: { prefault: "Nhân loại" } },
        ]},
        { path: "/Trạng thái tu luyện", type: "object", label: "Tu luyện", defaultValue: {}, constraints: { prefault: {} }, children: [
          { path: "/Cảnh giới",          type: "string", label: "Cảnh giới",    defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
          { path: "/Linh lực hiện tại",  type: "number", label: "Linh lực",     defaultValue: 100, constraints: { coerce: true, clamp: [0, 100], prefault: 100 } },
          { path: "/Tiến độ đột phá",   type: "number", label: "Tiến độ",     defaultValue: 0,   constraints: { coerce: true, clamp: [0, 100], prefault: 0 } },
        ]},
        { path: "/Kỹ pháp",  type: "record", label: "Kỹ pháp",  defaultValue: {}, constraints: { prefault: {} }, description: "Record<tên,{cấp,mô tả}>" },
        { path: "/Bí kíp",   type: "record", label: "Bí kíp",   defaultValue: {}, constraints: { prefault: {} } },
        { path: "/Linh thảo",type: "record", label: "Linh thảo",defaultValue: {}, constraints: { prefault: {} } },
        { path: "/Linh khí", type: "number", label: "Linh khí", defaultValue: 0, constraints: { coerce: true, min: 0, prefault: 0 } },
      ]},
      { path: "/NPC", type: "record", label: "NPC", defaultValue: {}, constraints: { prefault: {} } },
    ],
  },

  // === DATING SIM ===
  dating_sim: {
    version: "1.0",
    fields: [
      { path: "/Trạng thái thế giới", type: "object", label: "Thế giới", defaultValue: {}, constraints: { prefault: {} }, children: [
        { path: "/Ngày",            type: "number", label: "Ngày", defaultValue: 1, constraints: { coerce: true, prefault: 1 } },
        { path: "/Thời điểm",      type: "string", label: "Thời điểm", defaultValue: "Sáng", constraints: { prefault: "Sáng" }, description: "enum[Sáng,Trưa,Chiều,Tối]" },
        { path: "/Địa điểm",       type: "string", label: "Địa điểm", defaultValue: "Nhà",  constraints: { prefault: "Nhà" } },
        { path: "/Loại cảnh",      type: "string", label: "Cảnh",      defaultValue: "Hàng ngày", constraints: { prefault: "Hàng ngày" } },
      ]},
      { path: "/Người chơi", type: "object", label: "Người chơi", defaultValue: {}, constraints: { prefault: {} }, children: [
        { path: "/Họ tên",     type: "string", label: "Tên",     defaultValue: "Chờ khởi tạo", constraints: { prefault: "Chờ khởi tạo" } },
        { path: "/Tâm trạng", type: "string", label: "Tâm trạng",defaultValue: "Bình thường",  constraints: { prefault: "Bình thường" } },
      ]},
      { path: "/Quan hệ", type: "record", label: "Quan hệ", defaultValue: {}, constraints: { prefault: {} },
        description: "Record<tênNPC, {tình cảm: number[0-100], ấn tượng: string, sự kiện_đã_mở: string[]}>" },
      { path: "/Sự kiện đã mở", type: "array", label: "Sự kiện", defaultValue: [], constraints: { prefault: [] } },
    ],
  },
};
```


---

## 4. Kiến trúc giao diện & điều hướng

### 4.1 Layout tổng (AppShell)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TopBar: [≡] [Tên Project ▾]  [● Đã lưu 10:42]  [Import][Export] [↩️] [🌙]│
├───────────┬────────────────────────────────────┬──────────────────────────┤
│  Sidebar  │                                     │  Copilot Drawer          │
│ ──────────│           <Page nội dung>           │  [Chế độ: Mở Rộng ▾]   │
│ ⚙ Settings│                                     │  ThoughtBubble (thu gọn)│
│ 📝 Card    │                                     │  [Lịch sử chat]         │
│ 📚 Lorebook│                                     │  AgentStatusBar         │
│ 🧩 Regex   │                                     │  RAG Debug (collapsible)│
│ 🛠 MVUZOD  │                                     │  [Input + Gửi]          │
│ 📜 EJS     │                                     │                          │
│ ──────────│                                     │                          │
│ Projects: │                                     │                          │
│  - Card A │                                     │                          │
│  [+ Mới]  │                                     │                          │
└───────────┴────────────────────────────────────┴──────────────────────────┘
```

### 4.2 Điều hướng nội bộ

- **Card Editor**: tab ngang — Thông tin cơ bản / Tính cách & Bối cảnh / Hội thoại / Prompt hệ thống / Mở rộng
- **Lorebook**: 4 tab — Danh sách Entries / AI Sinh theo Batch / Trích Xuất Tài Liệu / Cào Wiki
- **Regex Lab**: 2 cột — Editor (trái) + Live Preview (phải)
- **MVUZOD Studio**: 4 tab — Schema Inferencer / Schema Editor / Patch Preview / Template Library
  - **Tab "Schema Inferencer"** (tab đầu tiên, bắt buộc làm trước):
    - Nút **"🔍 Phân tích Lorebook"** → gọi `analyzeLorebookForSchema()` → hiển thị report (nhóm phát hiện, enum đề xuất, NPC pattern, warnings)
    - Nút **"✨ AI Đề xuất Schema"** → gọi `inferSchemaWithAI()` → hiển thị schema được đề xuất dạng tree preview
    - Nút **"✅ Áp dụng Schema này"** → lưu vào `card.data.extensions.mvuzod.schema`
    - Nút **"📋 Tạo 5 Entries Hệ thống"** → auto-generate EJS Controller + 3 mvu_update + initvar theo schema vừa tạo
    - Nút **"📝 Tạo TavernHelper Scripts"** → auto-generate Script MVU import + Script registerMvuSchema
  - **Tab "Schema Editor"**: visual tree editor cho MVUZODField[] (sau khi đã có schema)
  - **Tab "Patch Preview"**: dry-run JSON Patch ops, xem state trước/sau
  - **Tab "Template Library"**: chọn template schema có sẵn (rpg_basic, cultivation, dating_sim...)
- **EJS Studio**: 3 cột — Variable Panel / EJS Editor / Live Preview

### 4.3 Worldbuilding Modes (5 chế độ)

| Chế độ | Mã | Mục tiêu | Hành vi AI |
|---|---|---|---|
| **Khởi Tạo** | `genesis` | Tạo mới từ ý tưởng sơ khai | Ưu tiên `create_entry`, nội dung đầy đủ theo chuẩn |
| **Mở Rộng** | `evolution` | Chỉnh sửa, mở rộng, cào Wiki | Style Mimicry + `fetch_fandom_data`, Fandom Priority |
| **Trích Xuất Tài Liệu** | `document_extraction` | Đọc file `.txt`, tạo Lorebook | Client chia chunk; AI đọc qua `read_document` |
| **Thảo Luận** | `discussion` | Hỏi đáp, lên ý tưởng | `actions: []` bắt buộc, chỉ chat |
| **MVUZOD** | `mvuzod` | Tạo Zod schema + JSON Patch scripts | Sinh schema, hướng dẫn patch, kiểm tra JS |

---

## 5. Module 1 — Cài đặt kết nối AI (Settings)

Route: `/settings`.

### 5.1 Kiểu dữ liệu

```typescript
interface ProxyProfile {
  id: string;
  label: string;
  providerType: "openai" | "claude" | "gemini" | "custom";
  baseUrl: string;
  apiKey: string;
  customHeaders: { key: string; value: string }[];
  selectedModel: string;
  cachedModels: ModelInfo[];
  cachedModelsAt: number | null;
  supportsNativeToolCalling: boolean | null;
}

interface GenerationParams {
  max_tokens: number;           // mặc định 4096
  temperature: number;          // 0-2, mặc định 1
  top_p: number;                // mặc định 1
  top_k: number;                // mặc định 0
  top_a: number;                // mặc định 0
  min_p: number;                // mặc định 0
  frequency_penalty: number;    // -2..2, mặc định 0
  presence_penalty: number;     // -2..2, mặc định 0
  repetition_penalty: number;   // mặc định 1
  seed: number;                 // -1 = random
  stop: string[];
  stream: boolean;              // mặc định false
  context_size: number;         // mặc định 32000
  reasoning_effort: "low" | "medium" | "high" | "auto";
  useJsonResponseFormat: boolean;
}
```

### 5.2 UI

| # | Thành phần | Mô tả |
|---|---|---|
| 1 | Combobox chọn Profile | CRUD profile: Thêm / Đổi tên / Xoá / Sao chép |
| 2 | Select "Loại Provider" | OpenAI-compatible / Claude / Gemini / Custom |
| 3 | Input "Proxy URL" | Trim trailing slash khi lưu |
| 4 | Input "API Key" | type=password + nút 👁; ghi chú "Chỉ lưu trên máy bạn" |
| 5 | Accordion "Header tuỳ chỉnh" | key-value, thêm/xoá |
| 6 | Nút "🔍 Quét Model" | Gọi `scanModels()`, lưu `cachedModels` |
| 7 | Combobox "Model" | Searchable; cho phép nhập tay |
| 8 | Toggle "Dùng JSON Response Format" | Bật `useJsonResponseFormat` |
| 9 | Nút "Kiểm tra kết nối + Tool Calling" | Ping + test tool call → set `supportsNativeToolCalling` |
| 10 | Checkbox "Chỉ giữ API Key trong session" | |

### 5.3 Logic quét Model

```typescript
async function scanModels(profile: ProxyProfile): Promise<ModelInfo[]> {
  const base = profile.baseUrl.replace(/\/+$/, "");
  switch (profile.providerType) {
    case "openai":
    case "custom": {
      const url = base.endsWith("/v1") ? `${base}/models` : `${base}/v1/models`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${profile.apiKey}` } });
      const json = await res.json();
      return (json.data ?? []).map((m: any) => ({ id: m.id, ownedBy: m.owned_by }));
    }
    case "claude": {
      const res = await fetch(`${base}/v1/models`, { headers: { "x-api-key": profile.apiKey, "anthropic-version": "2023-06-01" } });
      const json = await res.json();
      return (json.data ?? []).map((m: any) => ({ id: m.id }));
    }
    case "gemini": {
      const res = await fetch(`${base}/v1beta/models?key=${profile.apiKey}`);
      const json = await res.json();
      return (json.models ?? []).map((m: any) => ({ id: m.name }));
    }
  }
}
```

### 5.4 Lưu trữ

`SettingsState` → `localStorage` key `tcs.settings.v1`. Nếu `keepKeyOnlyInSession=true`, apiKey → `sessionStorage` key `tcs.session.apiKey.<profileId>`.

---

## 6. Module 2 — Card Editor

Route: `/editor`. Chỉnh sửa toàn bộ field "phẳng" của `CharacterData`.

### 6.1 Tab "Thông tin cơ bản"

| Field | Input | Ghi chú |
|---|---|---|
| `data.name` | text | Khi đổi → hỏi sync `extensions.world` + `character_book.name` |
| `data.creator` | text | |
| `data.character_version` | text | |
| `data.tags` | tag input | |
| `data.creator_notes` | textarea | |
| `data.extensions.fav` | toggle ⭐ | |
| `data.extensions.talkativeness` | slider 0–1 step 0.05 | **Lưu dạng STRING** |

### 6.2 Tab "Tính cách & Bối cảnh"

| Field | Input | Ghi chú |
|---|---|---|
| `data.description` | CodeMirror | Nút chèn macro `{{char}}`, `{{user}}`... Hiện `~N tokens` |
| `data.personality` | textarea | |
| `data.scenario` | textarea | |

### 6.3 Tab "Hội thoại"

| Field | Input |
|---|---|
| `data.first_mes` | textarea lớn |
| `data.alternate_greetings` | list editor: drag reorder, xoá/thêm |
| `data.mes_example` | CodeMirror; hint box cú pháp `<START>` |

### 6.4 Tab "Prompt hệ thống"

| Field | Input |
|---|---|
| `data.system_prompt` | CodeMirror |
| `data.post_history_instructions` | CodeMirror |
| `data.extensions.depth_prompt.prompt` | textarea |
| `data.extensions.depth_prompt.depth` | number stepper, mặc định 4 |
| `data.extensions.depth_prompt.role` | select system/user/assistant |

### 6.5 Tab "Mở rộng / Nâng cao"

- **Tavern Helper Scripts**: list + Drawer editor (name, info, enabled, CodeMirror JS cho content, button list, data JSON)
  - **JS Analyzer Panel** (accordion dưới mỗi script) — xem Phần 8C
- **Biến toàn cục**: JSON raw editor cho `tavern_helper.variables`
- **MVUZOD Config**: link đến MVUZOD Studio hoặc inline SchemaEditorPanel nhỏ
- **Raw JSON Editor**: fullscreen CodeMirror JSON cho `data.extensions`

### 6.6 Validate & đồng bộ

`syncMirrorFields(card)` chạy trước mỗi lần lưu DB và export. `talkativeness` LUÔN là string.

---

## 7. Module 3 — Lorebook Manager & AI Generator

Route: `/lorebook`. 4 tab: **Danh sách Entries** / **AI Sinh theo Batch** / **Trích Xuất Tài Liệu** / **Cào Wiki**.

### 7.1 Tab "Danh sách Entries"

**Toolbar:** ô tìm kiếm (debounce 300ms), filter Vị trí (multiselect), filter trạng thái, sắp xếp, nút **"+ Thêm Entry"**, thống kê tổng/bật/~tokens, bulk mode.

**Danh sách (virtualized `@tanstack/react-virtual`):** mỗi dòng (`EntryRow`): drag handle, toggle enabled, icon trạng thái, comment, badge keys (tối đa 3), insertion_order, độ dài content, nút Edit/Duplicate/Delete.

### 7.2 Entry Editor (Drawer)

**Cơ bản:** comment, enabled toggle, constant toggle, keys TagInput, selective toggle, secondary_keys, selectiveLogic, CodeMirror content (~N tokens), use_regex toggle.

**Vị trí:** Select 8 option (bảng 3.7), depth (khi position=4), role (khi position=4), outlet_name (khi position=7), insertion_order.

**Nâng cao:** Xác suất & Budget / Recursion / Matching (3-state toggle) / Nhóm & Timing.

Footer: Lưu / Huỷ / Xoá (đỏ, confirm dialog).

### 7.3 Tab "AI Sinh theo Batch"

#### 7.3.1 Cấu hình

```typescript
interface BatchGenConfig {
  topicPrompt: string;
  useCardContext: boolean;
  totalEntries: number;
  entriesPerBatch: number;
  defaultPosition: 0|1|2|3|4|5|6|7;
  defaultDepth?: number;
  defaultRole?: 0|1|2;
  insertionOrderMode: "same" | "increment";
  insertionOrderStart: number;
  maxRetriesPerBatch: number;           // mặc định 2
  maxConsecutiveErrors: number;          // mặc định 3
  modelOverride?: string;
  enableCompletionVerification: boolean; // MỚI: bật Completion Verifier
  criteria?: CompletionCriteria;         // MỚI: tiêu chí verify
}
```

#### 7.3.2 UI

| # | Thành phần |
|---|---|
| 1 | Textarea "Chủ đề / Yêu cầu nội dung" |
| 2 | Checkbox "Dùng Description/Personality/Scenario của card làm ngữ cảnh" |
| 3 | 2 input: "Tổng số Entries" + "Entries / Batch" |
| 4 | Read-only: "→ Sẽ thực hiện ⌈Tổng/Batch⌉ lượt gọi AI" |
| 5 | Select "Vị trí mặc định" (bảng 3.7) |
| 6 | Radio "Insertion Order": giữ nguyên / tăng dần |
| 7 | Accordion nâng cao: Model override, Retry / Consecutive error limit |
| 8 | Accordion **"🎯 Tiêu chí hoàn thành (Verification)"** — xem 7F |
| 9 | Nút **🚀 Bắt đầu sinh** / **⏸ Tạm dừng** / **⏹ Dừng hẳn** |
| 10 | AgentStatusBar: progress bar + log từng batch |
| 11 | Banner tổng kết khi xong |

#### 7.3.3 System prompt (Batch Generator)

```
Bạn là trợ lý chuyên tạo Lorebook (World Info) cho SillyTavern.
Nhiệm vụ: dựa trên YÊU CẦU và NGỮ CẢNH NHÂN VẬT, tạo các mục Lorebook MỚI,
KHÔNG TRÙNG LẶP với danh sách "Entries đã có".

--- QUY TẮC VIẾT CONTENT (ANTI-DATA-LOSS PROTOCOL) ---
1. VIẾT ĐẦY ĐỦ: Mỗi entry phải chứa thông tin hoàn chỉnh, không viết tắt,
   không lược bỏ, không viết "xem thêm ở entry khác".
2. CÁCH LY GIỌNG ĐIỆU: Trường "content" viết ở ngôi thứ ba, khách quan, trung lập.
3. KHÔNG TRÙNG LẶP: Không tạo lại các chủ đề đã có trong danh sách "Entries đã có".
4. KHÔNG TÓM TẮT: Không dùng "...", "[rút gọn]", "v.v.", "tương tự entry X".
5. THÔNG TIN CỤ THỂ: Ghi đầy đủ số liệu, tên riêng, mô tả chi tiết.

--- HƯỚNG DẪN KỸ THUẬT SILLYTAVERN ---
• keys: 2-6 từ/cụm từ ngắn xuất hiện tự nhiên trong hội thoại
• constant: true CHỈ cho luật vật lý, sự thật cơ bản (dùng tiết kiệm)
• selective: true cho hầu hết entry
• insertion_order mặc định 100; dùng 101+ để ghi đè entry cùng chủ đề

CHỈ trả về MỘT MẢNG JSON hợp lệ:
[{"comment":"...","keys":["..."],"content":"..."},...]
KHÔNG thêm giải thích, KHÔNG markdown, KHÔNG code block.
```

#### 7.3.4 User message mỗi batch

```
### Ngữ cảnh nhân vật
Tên: <data.name>
Description: <data.description>
Personality: <data.personality>
Scenario: <data.scenario>

### Yêu cầu nội dung
<topicPrompt>

### RAG Context (KHÔNG tạo lại các entry này)
<ragCtx.injectionText>    ← inject từ TFIDFIndex

### Entries đã có (KHÔNG tạo lại)
- "<comment 1>" — keys: [<keys 1>]
- "<comment 2>" — keys: [<keys 2>]
...

### Yêu cầu batch này
Tạo CHÍNH XÁC <countThisBatch> entry mới (batch <i>/<N>).
```

#### 7.3.5 Pipeline Batch Generator

```typescript
// src/lib/ai/batchGenerator.ts
async function runBatchGeneration(config: BatchGenConfig, ctx: RunContext) {
  const totalBatches = Math.ceil(config.totalEntries / config.entriesPerBatch);
  let created = 0, consecutiveErrors = 0;
  const seen = ctx.card.data.character_book?.entries?.map(e => ({ comment: e.comment, keys: e.keys })) ?? [];

  // Khởi tạo RAG index
  const ragIndex = new TFIDFIndex();
  ragIndex.indexWithSource(ctx.card.data.character_book?.entries ?? []);

  for (let i = 1; i <= totalBatches; i++) {
    if (ctx.stopped) break;
    while (ctx.paused) await sleep(300);

    const countThisBatch = Math.min(config.entriesPerBatch, config.totalEntries - created);
    const ragCtx = buildRAGContext(config.topicPrompt, ragIndex, { topK: 8, includeNegatives: true });
    const messages = [
      { role: "system", content: BATCH_SYSTEM_PROMPT },
      { role: "user",   content: buildBatchUserMessage(config, ctx.card, seen, ragCtx, countThisBatch, i, totalBatches) },
    ];

    let result: AIGeneratedEntry[] | null = null;
    for (let attempt = 0; attempt <= config.maxRetriesPerBatch; attempt++) {
      const raw = await callAI(messages, ctx.profile, ctx.generationParams);
      result = tryExtractJsonArray(raw);
      if (result) break;
      ctx.log(`⚠️ Batch ${i} lỗi JSON, thử lại (${attempt + 1}/${config.maxRetriesPerBatch})`);
    }

    if (!result) {
      ctx.log(`❌ Batch ${i} thất bại`);
      if (++consecutiveErrors >= config.maxConsecutiveErrors) break;
      continue;
    }
    consecutiveErrors = 0;

    for (const ai of result) {
      // Anti-Duplication check (3 lớp — xem 7H)
      const dupCheck = await isDuplicateEntry(ai, ctx.card.data.character_book?.entries ?? [], ragIndex);
      if (dupCheck.isDuplicate) {
        ctx.log(`⏭️ Bỏ qua "${ai.comment}" — trùng với "${dupCheck.conflictWith}" (${dupCheck.reason})`);
        continue;
      }
      // Anti-Summarization check
      const sumCheck = checkAntiSummarization(ai.content);
      if (sumCheck.isSummarized) {
        ctx.log(`⚠️ "${ai.comment}" có dấu hiệu tóm tắt: ${sumCheck.warnings.join("; ")}`);
      }

      const entry = materializeEntry(ai, config, nextEntryId(ctx.card));
      ctx.appendEntry(entry);
      seen.push({ comment: entry.comment, keys: entry.keys });
      created++;
      ragIndex.indexWithSource(ctx.card.data.character_book?.entries ?? []);
      ctx.log(`✅ Batch ${i} · "${entry.comment}"`);
      ctx.onProgress({ batch: i, totalBatches, created, total: config.totalEntries });
    }
  }

  // Completion Verification (sau khi tất cả batches xong)
  if (config.enableCompletionVerification && config.criteria) {
    ctx.log(`🔍 Bắt đầu Completion Verification...`);
    const report = await runWithVerification(config, config.criteria, ctx);
    ctx.showVerificationReport(report);
  }
}
```

### 7.4 Tab "Trích Xuất Tài Liệu"

#### 7.4.1 UI

| # | Thành phần |
|---|---|
| 1 | Vùng kéo-thả file `.txt` |
| 2 | Khi nạp: tên file, dung lượng, số chunk ước tính |
| 3 | Textarea "Hướng dẫn thêm cho AI" |
| 4 | Checkbox "Dùng ngữ cảnh card hiện tại" |
| 5 | Cấu hình vị trí/insertion_order giống Batch |
| 6 | Progress bar: `Chunk <i>/<total>` + số entry đã tạo |

#### 7.4.2 Chunking Algorithm

```typescript
// src/lib/ai/documentChunker.ts
const CHUNK_SIZE = 15000;

export function splitDocument(text: string): string[] {
  const chunks: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    let end = Math.min(pos + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf("\n\n", end);
      if (boundary > pos + CHUNK_SIZE * 0.7) end = boundary + 2;
    }
    chunks.push(text.slice(pos, end));
    pos = end;
  }
  return chunks;
}
```

#### 7.4.3 System prompt (Document Extraction)

```
Bạn là trợ lý trích xuất thông tin từ tài liệu để tạo Lorebook SillyTavern.

NHIỆM VỤ: Đọc từng phần tài liệu và tạo Lorebook entry từ thông tin quan trọng:
nhân vật, địa điểm, sự kiện, hệ thống phép thuật/công nghệ...

QUY TẮC ANTI-DATA-LOSS:
• KHÔNG bỏ sót thông tin quan trọng — thà tạo nhiều entry nhỏ hơn ít entry lớn
• KHÔNG tóm tắt làm mất chi tiết — ghi đầy đủ số liệu, tên riêng, mô tả cụ thể
• KHÔNG suy diễn nội dung không có trong tài liệu
• KHÔNG dùng "..." hoặc "[rút gọn]" — viết đầy đủ hoặc chia nhỏ entry

ĐỊNH DẠNG PHẢN HỒI BẮT BUỘC (JSON):
{
  "thought": "Tôi đang đọc chunk X, phát hiện Y thực thể quan trọng...",
  "message": "Đã tạo N entry từ chunk này.",
  "status": "CONTINUE",
  "actions": [
    {"type": "create_entry", "data": {"comment":"...","keys":[...],"content":"..."}},
    {"type": "read_document", "chunk_index": <N+1>}
  ]
}
Khi hết tài liệu: status = "DONE", không thêm read_document.
```

### 7.5 Tab "Cào Wiki / Fandom"

Xem chi tiết Phần 7G (Fandom Priority Search) cho `fetchWikiPageWithFallback`.

#### 7.5.1 UI

| # | Thành phần |
|---|---|
| 1 | Input "URL trang Wiki/Fandom" |
| 2 | **Priority Display**: danh sách nguồn sẽ thử theo thứ tự (collapsible) |
| 3 | Checkbox "Tự động tìm link liên quan" (multi-page mode) |
| 4 | Textarea "Hướng dẫn thêm" |
| 5 | Input "Giới hạn số entry" (mặc định 30) |
| 6 | Tag-to-Fandom Map Editor (accordion nhỏ, custom mapping) |
| 7 | Checkbox "Chỉ dùng Fandom" |
| 8 | Nút **🕸️ Bắt đầu cào** / Dừng |
| 9 | Log: URL đã tải + badge nguồn + số entry tạo được |

#### 7.5.2 System prompt (Wiki Scraping / Evolution Mode)

```
Bạn là trợ lý tổng hợp dữ liệu từ Wiki/Fandom thành Lorebook SillyTavern.

PHƯƠNG PHÁP STYLE MIMICRY: Phân tích phong cách viết của entries hiện tại
(độ dài, cấu trúc, văn phong) và bắt chước để entries mới nhất quán.

QUY TẮC ANTI-DATA-LOSS (QUAN TRỌNG):
• KHÔNG xoá/rút gọn thông tin khi update_entry
• KHÔNG viết "same as before" hay "giữ nguyên phần trên"
• KHÔNG bịa thông tin không có trong nguồn wiki

CHIẾN LƯỢC KÍCH HOẠT:
• constant:true = luật vật lý thế giới (dùng tiết kiệm)
• selective:true = thông tin chi tiết theo tình huống (hầu hết entry)
• vectorized:true = tìm kiếm ngữ nghĩa (cho entry trừu tượng)

VỊ TRÍ (position): 0=before_char (đặc điểm cố định), 1=after_char (ngữ cảnh),
4=@depth (tình huống), 7=outlet (gọi qua macro)

ĐỊNH DẠNG PHẢN HỒI BẮT BUỘC (JSON):
{"thought":"...","message":"...","status":"CONTINUE|DONE","actions":[...]}
```

---

## 7F. COMPLETION VERIFICATION LOOP

> Sau mỗi batch generation, gọi API thêm đến khi nội dung đạt đủ tiêu chí chất lượng.

### 7F.1 Kiến trúc

```
Sau runBatchGeneration() kết thúc
        ↓
┌──────────────────────────────────────────┐
│        COMPLETION VERIFICATION LOOP      │
│                                          │
│  1. verifier.checkCriteria(entries)     │
│  2. Nếu PASS → kết thúc, báo cáo       │
│  3. Nếu FAIL → gapDetector.findGaps()  │
│     → Tạo targeted prompt bổ sung       │
│     → Gọi AI batch "fill-in"            │
│  4. Lặp tối đa maxVerifyLoops lần      │
└──────────────────────────────────────────┘
```

### 7F.2 Kiểu dữ liệu

```typescript
// src/lib/completionVerifier/criteria.ts
export interface CompletionCriteria {
  minEntryCount?: number;
  minContentLengthPerEntry?: number;
  maxDuplicateRatio?: number;        // default 0.05
  requiredTopics?: Array<{
    topic: string;
    keywords: string[];
    minEntries?: number;
  }>;
  coherenceCheck?: boolean;
  coherenceThreshold?: number;       // default 0.7
  maxVerifyLoops?: number;           // default 3
  maxFillInBatchesPerLoop?: number;  // default 5
}

export interface VerificationReport {
  passed: boolean;
  loopsDone: number;
  checks: Array<{ criteria: string; passed: boolean; detail: string; gap?: string }>;
  addedEntries: number;
}
```

### 7F.3 `verifier.ts`

```typescript
export async function runWithVerification(
  config: BatchGenConfig,
  criteria: CompletionCriteria,
  ctx: RunContext
): Promise<VerificationReport> {
  const maxLoops = criteria.maxVerifyLoops ?? 3;
  const report: VerificationReport = { passed: false, loopsDone: 0, checks: [], addedEntries: 0 };

  for (let loop = 0; loop < maxLoops; loop++) {
    report.loopsDone = loop + 1;
    const entries = ctx.card.data.character_book?.entries ?? [];
    const checks = runChecks(entries, criteria);
    report.checks = checks;

    if (checks.every(c => c.passed)) { report.passed = true; break; }

    const gaps = checks.filter(c => !c.passed && c.gap).map(c => c.gap!);
    if (gaps.length === 0) break;

    ctx.log(`🔍 Verify loop ${loop + 1}: ${gaps.length} khoảng trống, bổ sung...`);
    const fillPrompt = `${config.topicPrompt}\n\n### BỔ SUNG (CÁC KHOẢNG TRỐNG PHÁT HIỆN)\n${gaps.map((g, i) => `${i + 1}. ${g}`).join("\n")}`;
    const fillConfig = { ...config, topicPrompt: fillPrompt, totalEntries: gaps.length * config.entriesPerBatch, enableCompletionVerification: false };
    await runBatchGeneration(fillConfig, ctx);
    report.addedEntries += fillConfig.totalEntries;

    if (criteria.coherenceCheck) {
      const score = await runCoherenceCheck(ctx.card.data.character_book?.entries ?? [], ctx);
      report.checks.push({
        criteria: "coherence", passed: score >= (criteria.coherenceThreshold ?? 0.7),
        detail: `Điểm nhất quán: ${(score * 100).toFixed(0)}%`,
        gap: score < (criteria.coherenceThreshold ?? 0.7) ? "Entries thiếu tính nhất quán timeline/logic" : undefined,
      });
    }
  }
  return report;
}

function runChecks(entries: LorebookEntry[], criteria: CompletionCriteria): VerificationReport["checks"] {
  const checks: VerificationReport["checks"] = [];
  if (criteria.minEntryCount !== undefined) {
    const passed = entries.length >= criteria.minEntryCount;
    checks.push({ criteria: "minEntryCount", passed, detail: `${entries.length}/${criteria.minEntryCount} entries`, gap: passed ? undefined : `Cần thêm ${criteria.minEntryCount - entries.length} entry` });
  }
  if (criteria.minContentLengthPerEntry !== undefined) {
    const short = entries.filter(e => e.content.length < criteria.minContentLengthPerEntry!);
    checks.push({ criteria: "minContentLength", passed: short.length === 0, detail: `${short.length} entry quá ngắn`, gap: short.length > 0 ? short.map(e => e.comment).join(", ") : undefined });
  }
  for (const topic of criteria.requiredTopics ?? []) {
    const relevant = entries.filter(e => topic.keywords.some(kw => e.content.toLowerCase().includes(kw.toLowerCase()) || e.keys.some(k => k.toLowerCase().includes(kw.toLowerCase()))));
    const min = topic.minEntries ?? 1;
    const passed = relevant.length >= min;
    checks.push({ criteria: `topic:${topic.topic}`, passed, detail: `${relevant.length}/${min} entries về "${topic.topic}"`, gap: passed ? undefined : `Thiếu thông tin về: ${topic.topic}` });
  }
  return checks;
}
```

### 7F.4 UI Panel — Completion Criteria Editor

Accordion **"🎯 Tiêu chí hoàn thành"** trong Tab Batch (mặc định collapsed):

| # | Thành phần |
|---|---|
| 1 | Toggle "Bật Completion Verification" |
| 2 | Input "Số entry tối thiểu" |
| 3 | Input "Độ dài tối thiểu / entry (ký tự)" |
| 4 | Topic Coverage: danh sách dynamic — tên topic + keywords (comma-separated) + số entry tối thiểu |
| 5 | Toggle "Kiểm tra Coherence bằng AI" (cảnh báo: tốn thêm API call) |
| 6 | Input "Số vòng lặp verify tối đa" (default 3) |
| 7 | **Verification Report Panel**: bảng checks pass/fail + "Đã thêm N entries bổ sung" |

---

## 7G. FANDOM PRIORITY SEARCH

> Ghi đè `fetchWikiPage` trong spec gốc — thêm hệ thống ưu tiên nguồn dữ liệu.

### 7G.1 Priority Queue

```typescript
// src/lib/ai/wikiScraper.ts

// Bảng map: từ khoá trong tags → tên wiki Fandom
const FANDOM_TAG_MAP: Record<string, string> = {
  genshin: "genshin-impact", "honkai star rail": "honkai-star-rail",
  "honkai impact": "honkai-impact-3", "blue archive": "blue-archive",
  azurlane: "azur-lane", arknights: "arknights", naruto: "naruto",
  "one piece": "onepiece", "attack on titan": "attackontitan",
  "re:zero": "rezero", overlord: "overlordmaruyama",
  "kimetsu no yaiba": "kimetsu-no-yaiba", "my hero academia": "bokunoheroacademia",
};

export function buildFandomSearchQueue(
  subject: string,
  card: CharacterCardV3
): Array<{ priority: number; label: string; url: string }> {
  const queue: Array<{ priority: number; label: string; url: string }> = [];
  const tags = card.data.tags ?? [];
  const cardName = card.data.name;

  // Ưu tiên 1: Tags map → Fandom slug cụ thể
  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    for (const [keyword, wikiSlug] of Object.entries(FANDOM_TAG_MAP)) {
      if (tagLower.includes(keyword)) {
        queue.push({ priority: 1, label: `Fandom (${wikiSlug})`, url: `https://${wikiSlug}.fandom.com/wiki/${encodeURIComponent(subject)}` });
        break;
      }
    }
  }

  // Ưu tiên 2: Card name slug → Fandom
  const slug = cardName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (slug) queue.push({ priority: 2, label: "Fandom (card name)", url: `https://${slug}.fandom.com/wiki/${encodeURIComponent(subject)}` });

  // Ưu tiên 3: Wikia (Fandom cũ)
  if (slug) queue.push({ priority: 3, label: "Wikia", url: `https://${slug}.wikia.com/wiki/${encodeURIComponent(subject)}` });

  // Ưu tiên 4: Wikipedia
  queue.push({ priority: 4, label: "Wikipedia", url: `https://en.wikipedia.org/wiki/${encodeURIComponent(subject)}` });

  // Dedup + sort
  const seen = new Set<string>();
  return queue.filter(i => { const dup = seen.has(i.url); seen.add(i.url); return !dup; }).sort((a, b) => a.priority - b.priority);
}

export async function fetchWikiPageWithFallback(
  subject: string,
  card: CharacterCardV3,
  ctx: RunContext
): Promise<{ text: string; source: string }> {
  const queue = buildFandomSearchQueue(subject, card);
  for (const item of queue) {
    ctx.log(`🔍 Thử [${item.label}]: ${item.url}`);
    try {
      const text = await fetchWikiPage(item.url);
      if (text.length > 500) {
        ctx.log(`✅ Thành công từ [${item.label}]`);
        return { text, source: item.label };
      }
      ctx.log(`⚠️ [${item.label}] ít nội dung (${text.length} ký tự), thử tiếp...`);
    } catch (e) {
      ctx.log(`❌ [${item.label}] lỗi: ${e}`);
    }
  }
  throw new Error(`Không lấy được dữ liệu về "${subject}" từ bất kỳ nguồn nào`);
}

// Hàm gốc fetchWikiPage giữ nguyên (MediaWiki API + DOMParser fallback)
async function fetchWikiPage(url: string): Promise<string> {
  try {
    const domain = new URL(url).origin;
    const title = new URL(url).pathname.split("/wiki/")[1] ?? "";
    const apiUrl = `${domain}/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&origin=*`;
    const res = await fetch(apiUrl);
    const json = await res.json();
    if (json.parse?.wikitext?.["*"]) {
      return json.parse.wikitext["*"]
        .replace(/\{\{[^}]+\}\}/g, "").replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g, "$1")
        .replace(/={2,6}([^=]+)={2,6}/g, "\n$1\n").replace(/<[^>]+>/g, "");
    }
  } catch { /* fallback */ }
  const res = await fetch(url);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,nav,footer,.mw-navigation,.mw-footer").forEach(el => el.remove());
  return doc.body?.innerText ?? doc.body?.textContent ?? "";
}
```

---

## 7H. ANTI-DUPLICATION & COHERENCE ENGINE

> Tích hợp vào mọi pipeline sinh entries (Batch, Doc Extract, Wiki, Copilot).

### 7H.1 Anti-Duplication (3 lớp)

```typescript
// src/lib/ai/deduplicator.ts

// LAYER 1: Key Overlap (O(n), real-time)
export function checkKeyOverlap(
  newKeys: string[], existingEntries: LorebookEntry[], threshold = 0.5
): { isDuplicate: boolean; conflictWith?: string; overlapRatio: number } {
  const newSet = new Set(newKeys.map(k => k.toLowerCase().trim()));
  for (const entry of existingEntries) {
    const existSet = new Set(entry.keys.map(k => k.toLowerCase().trim()));
    const intersection = [...newSet].filter(k => existSet.has(k));
    const ratio = intersection.length / Math.max(newSet.size, existSet.size, 1);
    if (ratio >= threshold) return { isDuplicate: true, conflictWith: entry.comment, overlapRatio: ratio };
  }
  return { isDuplicate: false, overlapRatio: 0 };
}

// LAYER 2: Content Fingerprint — Jaccard bigrams (O(n), real-time)
function getBigrams(text: string): Set<string> {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) bigrams.add(`${words[i]}|${words[i+1]}`);
  return bigrams;
}

export function checkContentSimilarity(
  newContent: string, existingEntries: LorebookEntry[], threshold = 0.6
): { isDuplicate: boolean; conflictWith?: string; similarity: number } {
  const newBigrams = getBigrams(newContent);
  for (const entry of existingEntries) {
    const existBigrams = getBigrams(entry.content);
    const intersection = [...newBigrams].filter(bg => existBigrams.has(bg));
    const union = new Set([...newBigrams, ...existBigrams]);
    const similarity = intersection.length / union.size;
    if (similarity >= threshold) return { isDuplicate: true, conflictWith: entry.comment, similarity };
  }
  return { isDuplicate: false, similarity: 0 };
}

// LAYER 3: RAG Semantic (O(1) sau index, xem 9B)
export async function checkSemanticSimilarity(
  newEntry: AIGeneratedEntry, ragIndex: TFIDFIndex, threshold = 0.85
): Promise<{ isDuplicate: boolean; conflictWith?: string; similarity: number }> {
  const results = ragIndex.search(newEntry.comment + " " + newEntry.content, { topK: 1 });
  if (results.length > 0 && results[0].score >= threshold) {
    return { isDuplicate: true, conflictWith: results[0].entry.comment, similarity: results[0].score };
  }
  return { isDuplicate: false, similarity: results[0]?.score ?? 0 };
}

// Tổng hợp 3 lớp
export async function isDuplicateEntry(
  newEntry: AIGeneratedEntry, existingEntries: LorebookEntry[], ragIndex?: TFIDFIndex
): Promise<{ isDuplicate: boolean; reason?: string; conflictWith?: string }> {
  const k = checkKeyOverlap(newEntry.keys ?? [], existingEntries);
  if (k.isDuplicate) return { isDuplicate: true, reason: "key_overlap", conflictWith: k.conflictWith };
  const c = checkContentSimilarity(newEntry.content, existingEntries);
  if (c.isDuplicate) return { isDuplicate: true, reason: "content_similarity", conflictWith: c.conflictWith };
  if (ragIndex) {
    const s = await checkSemanticSimilarity(newEntry, ragIndex);
    if (s.isDuplicate) return { isDuplicate: true, reason: "semantic_similarity", conflictWith: s.conflictWith };
  }
  return { isDuplicate: false };
}
```

### 7H.2 Anti-Summarization

```typescript
// src/lib/completionVerifier/antiSummarization.ts
const SUMMARIZATION_SIGNALS = [
  /\[\.{3}\]/, /\(xem thêm\)/i, /\(tiếp theo\)/i,
  /tương tự (như|với) (trên|trước)/i, /như đã đề cập/i,
  /v\.v\.|etc\.|và nhiều hơn nữa/i, /chi tiết ở entry/i,
  /\[bỏ qua\]/i, /\[rút gọn\]/i, /\.\.\./,
];

export function checkAntiSummarization(
  newContent: string, originalContent?: string
): { isSummarized: boolean; warnings: string[]; score: number } {
  const warnings: string[] = [];
  let score = 0;
  for (const signal of SUMMARIZATION_SIGNALS) {
    if (signal.test(newContent)) { warnings.push(`Tín hiệu tóm tắt: "${signal}"`); score += 0.2; }
  }
  if (originalContent) {
    const ratio = newContent.length / Math.max(originalContent.length, 1);
    if (ratio < 0.6) {
      warnings.push(`⚠️ Content mới ngắn hơn ${((1-ratio)*100).toFixed(0)}% so với bản cũ`);
      score += 0.4;
    }
  }
  return { isSummarized: score >= 0.4, warnings, score: Math.min(score, 1) };
}
```

### 7H.3 Entry Coherence System

```typescript
// src/lib/ai/coherenceManager.ts

export function buildCoherenceContext(entries: LorebookEntry[]): string {
  if (entries.length === 0) return "";
  const groups: Record<string, LorebookEntry[]> = {};
  for (const e of entries) {
    const g = e.extensions?.group || "Chung";
    if (!groups[g]) groups[g] = [];
    groups[g].push(e);
  }
  const summary = Object.entries(groups)
    .map(([theme, ents]) => `• [${theme}]: ${ents.map(e => `"${e.comment}"`).join(", ")}`)
    .join("\n");

  return `
=== BỐI CẢNH CÁC ENTRIES HIỆN CÓ (DUY TRÌ TÍNH NHẤT QUÁN) ===
${summary}

QUY TẮC MẠCH LẠC (BẮT BUỘC):
• Tên nhân vật/địa điểm phải NHẤT QUÁN với tên đã có
• Số liệu (năm, khoảng cách, tuổi...) phải NHẤT QUÁN
• Mối quan hệ nhân vật không được mâu thuẫn
• Nếu mở rộng entry đã có, dùng @ref:tên_entry_gốc để liên kết
`.trim();
}
```

### 7H.4 Tích hợp vào mọi AI call sinh entry

Thêm vào `buildBatchUserMessage` và mọi system prompt (trừ `discussion`):

```typescript
const coherenceCtx = buildCoherenceContext(ctx.card.data.character_book?.entries ?? []);
// Chèn vào đầu user message:
coherenceCtx + "\n\n" + ragCtx.injectionText + "\n\n" + originalUserMessage
```

### 7H.5 ActionCard cảnh báo (Copilot)

Khi AI trả về `update_entry` action, app kiểm tra:
- Nếu `data.content.length < originalEntry.content.length * 0.6` → hiện cảnh báo vàng trong ActionCard: *"⚠️ Content mới ngắn hơn đáng kể. Kiểm tra kỹ trước khi áp dụng."*


---

## 8. Module 4 — Regex Lab & Live Preview

Route: `/regex`. Quản lý `data.extensions.regex_scripts[]`.

### 8.1 Danh sách Regex Script (cột trái)

Mỗi dòng: drag handle, toggle Bật, scriptName, badge placement, badge MD/Prompt/Edit, nút Edit/Duplicate/Delete.

Toolbar: nút **"+ Thêm Regex"**, nút **"Nhập từ Clipboard"** (JSON object hoặc `RegexScript[]`).

### 8.2 Regex Editor

| Field | Input | Ghi chú |
|---|---|---|
| `scriptName` | text | |
| `findRegex` | text monospace | Chip flag g/i/s/m/u bật/tắt nhanh |
| `replaceString` | CodeMirror HTML mode | Gợi ý macro: `{{match}}`, `$1`–`$9` |
| `trimStrings` | TagInput | |
| `placement` | checkbox group 5 ô | Bảng 3.9 |
| Flags | 4 toggle: disabled (đảo = "Bật"), markdownOnly, promptOnly, runOnEdit | |
| `substituteRegex` | select 3 giá trị (bảng 3.10) | |
| `minDepth`/`maxDepth` | number + checkbox "Không giới hạn" | |

### 8.3 Live Preview (cột phải)

| # | Thành phần |
|---|---|
| 1 | Textarea "Văn bản mẫu" (CodeMirror) |
| 2 | Radio: "Chỉ script đang chọn" / "Tất cả script Bật" |
| 3 | Panel macro giả lập: `{{char}}` và `{{user}}` |
| 4 | Input "Depth giả lập" |
| 5a | Tab "Mã nguồn": CodeMirror readonly |
| 5b | Tab "Xem trước HTML": `<iframe sandbox="allow-scripts" srcDoc={result}>` |
| 6 | Nút "🔄 Chạy lại" (auto debounce 400ms) |

### 8.4 Engine (`lib/regexEngine/applyRegex.ts`)

```typescript
function parseFindRegex(pattern: string): RegExp {
  const m = pattern.match(/^\/([\s\S]+)\/([a-z]*)$/i);
  if (m) {
    const flags = m[2].includes("g") ? m[2] : m[2] + "g";
    return new RegExp(m[1], flags);
  }
  return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
}

function applyPipeline(text: string, scripts: RegexScript[], placement: RegexPlacement, depth: number, vars: {char:string;user:string}): string {
  let result = text;
  for (const s of scripts) {
    if (s.disabled || !s.placement.includes(placement)) continue;
    if (s.minDepth != null && depth < s.minDepth) continue;
    if (s.maxDepth != null && depth > s.maxDepth) continue;
    result = applyOneScript(result, s, vars);
  }
  return result;
}
```

> Strip code-fence tự động trước khi render vào `<iframe srcDoc>`.

---

## 8B. EJS ENTRY EDITOR

> ⚠️ **Sửa quan trọng:** EJS **không phải** ngôn ngữ của TavernHelper scripts. TavernHelper scripts là **JavaScript thuần**. EJS chỉ sống trong **content của Lorebook entries** — cụ thể là entries có directive `@@preprocessing` ở đầu. Module này giúp tạo và chỉnh sửa loại entry đặc biệt đó.

### 8B.1 EJS trong Lorebook Entry — Đúng chỗ

`@@preprocessing` là directive của TavernHelper, đặt ở **dòng đầu tiên** của Lorebook entry content. Khi SillyTavern xử lý entry này, nó chạy toàn bộ nội dung như EJS template — không output text ra prompt, mà thực thi logic điều khiển.

```
@@preprocessing
<%_
// ĐỌC BIẾN từ TavernHelper variables qua getvar()
// KHÔNG phải this.variables — đó là sai
var _era    = getvar('stat_data.Trạng thái thế giới.Thời đại hiện tại', { defaults: 'Đấu 1' });
var _sType  = getvar('stat_data.Trạng thái thế giới.Loại cảnh hiện tại', { defaults: 'Hàng ngày' });
var _level  = getvar('stat_data.Người chơi.Trạng thái tu luyện.Cấp bậc hồn lực', { defaults: 0 });

// ĐIỀU KHIỂN entry nào được load (ví dụ: chỉ load entries của era hiện tại)
// TavernHelper cung cấp hàm để bật/tắt entries theo tên
_%>
```

**Biến toàn cục có sẵn trong `@@preprocessing`:**

| Biến / Hàm | Nguồn | Ý nghĩa |
|---|---|---|
| `getvar(key, {defaults})` | TavernHelper | Đọc biến theo dot-path từ `stat_data` |
| `getChatMessages(idx, role)` | TavernHelper | Đọc lịch sử chat (index âm = từ cuối) |
| `lastUserMessageId` | TavernHelper | ID tin nhắn cuối của user |
| `<%_ ... _%>` | EJS | Thực thi JS, **suppress whitespace** (quan trọng trong preprocessing) |
| `<%= expr %>` | EJS | Xuất giá trị (hiếm dùng trong preprocessing) |
| `<% stmt %>` | EJS | Thực thi JS statement |
| `<%# comment %>` | EJS | Comment |

> **Quan trọng:** `getvar('stat_data.X.Y')` — dấu chấm là path separator, không phải `/`.
> Key gốc (`stat_data`) do `registerMvuSchema('stat_data', schema)` trong TavernHelper script quy định.

### 8B.2 Phân biệt 3 loại entry liên quan EJS

| Loại entry | Directive | Mục đích | Syntax đọc biến |
|---|---|---|---|
| **EJS Controller** | `@@preprocessing` | Điều khiển logic — chọn entries nào load | `getvar('stat_data.X.Y')` |
| **State Display** | (không có) | Hiển thị state dạng text cho AI đọc | content tĩnh, được TavernHelper cập nhật bằng JS |
| **Entry thường** | (không có) | Lore, NPC, rules — không có EJS | Không có EJS |

> **State Display** không dùng EJS trong content — thay vào đó, TavernHelper script JS gọi hàm như `setEntryContent('comment', text)` để ghi text đã render vào entry sau mỗi lượt.

### 8B.3 EJS Parser (`lib/ejs/ejsParser.ts`)

Parser để app **validate và preview** content của `@@preprocessing` entries:

```typescript
// src/lib/ejs/ejsParser.ts
export interface EJSToken {
  type: "literal" | "expression" | "raw_expression" | "statement" | "comment" | "directive";
  value: string;
  line: number;
}

export function parseEJS(template: string): EJSToken[] {
  const tokens: EJSToken[] = [];
  let pos = 0, line = 1;

  // Xử lý @@preprocessing directive ở dòng đầu
  if (template.startsWith("@@")) {
    const firstLine = template.split("\n")[0];
    tokens.push({ type: "directive", value: firstLine.trim(), line: 1 });
    pos = firstLine.length + 1;
    line = 2;
  }

  while (pos < template.length) {
    const openIdx = template.indexOf("<%", pos);
    if (openIdx === -1) {
      tokens.push({ type: "literal", value: template.slice(pos), line });
      break;
    }
    if (openIdx > pos) {
      const lit = template.slice(pos, openIdx);
      tokens.push({ type: "literal", value: lit, line });
      line += (lit.match(/\n/g) ?? []).length;
    }
    // Phát hiện <%_ (whitespace-slurp) và _%>
    let tagStart = openIdx + 2;
    const tag = template[tagStart];
    const isSlurpOpen = tag === "_";
    if (isSlurpOpen) tagStart++;

    const closeRaw = template.indexOf("%>", tagStart);
    if (closeRaw === -1) break;
    const isSlurpClose = template[closeRaw - 1] === "_";
    const closeIdx = isSlurpClose ? closeRaw - 1 : closeRaw;

    const inner = template.slice(tagStart + (["=","-","#"].includes(template[openIdx+2]) && !isSlurpOpen ? 1 : 0), closeIdx).trim();
    const firstChar = template[openIdx + 2];
    const type: EJSToken["type"] =
      firstChar === "=" ? "expression"
      : firstChar === "-" ? "raw_expression"
      : firstChar === "#" ? "comment"
      : "statement";

    tokens.push({ type, value: inner, line });
    line += (template.slice(openIdx, closeRaw + 2).match(/\n/g) ?? []).length;
    pos = closeRaw + 2;
    // Skip newline sau _%>
    if (isSlurpClose && template[pos] === "\n") pos++;
  }
  return tokens;
}

// Validate: tìm lỗi syntax, getvar calls không hợp lệ
export function validateEJSEntry(content: string, schema?: MVUZODSchema): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tokens = parseEJS(content);

  // Check directive
  if (!content.startsWith("@@preprocessing")) {
    warnings.push("Entry không có @@preprocessing — sẽ không được xử lý như EJS");
  }

  // Check getvar calls có đúng key không
  const getvarCalls = content.matchAll(/getvar\(['"]([^'"]+)['"]/g);
  for (const match of getvarCalls) {
    const key = match[1];
    if (!key.startsWith("stat_data.") && !key.startsWith("stat_data[")) {
      warnings.push(`getvar('${key}'): key không bắt đầu bằng 'stat_data.' — có thể sai variable key`);
    }
  }

  // Check getvar path có trong schema không
  if (schema) {
    for (const match of content.matchAll(/getvar\(['"]stat_data\.([^'"]+)['"]/g)) {
      const path = "/" + match[1].replace(/\./g, "/");
      if (!findSchemaField(schema, path)) {
        warnings.push(`getvar path '${match[1]}' không tìm thấy trong schema`);
      }
    }
  }

  // Check balanced EJS tags
  const openCount = (content.match(/<%/g) ?? []).length;
  const closeCount = (content.match(/%>/g) ?? []).length;
  if (openCount !== closeCount) errors.push(`EJS tags không cân: ${openCount} mở, ${closeCount} đóng`);

  return { valid: errors.length === 0, errors, warnings };
}

interface ValidationResult { valid: boolean; errors: string[]; warnings: string[]; }
```

### 8B.4 UI — EJS Entry Editor (tích hợp vào Lorebook Entry Editor)

**Không tách thành trang riêng** — tích hợp trực tiếp vào `EntryEditorDrawer` (7.2). Khi content của entry bắt đầu bằng `@@preprocessing`, drawer tự chuyển sang chế độ EJS:

```
┌─ Entry Editor — [Bộ điều khiển EJS] ──────────────────────────┐
│  🔵 [Chế độ: EJS @@preprocessing]                              │
│  ┌────────────────────────────────┬──────────────────────────┐ │
│  │  CodeMirror                    │  Variable Panel          │ │
│  │  (EJS highlight mode)          │                          │ │
│  │                                │  📦 stat_data            │ │
│  │  @@preprocessing               │  ├ Trạng thái thế giới  │ │
│  │  <%_                           │  │  ├ Thời đại hiện tại │ │
│  │  var _era = getvar(            │  │  └ Loại cảnh...      │ │
│  │    'stat_data.Trạng thái...',  │  └ Người chơi...        │ │
│  │    { defaults: 'Đấu 1' }       │                          │ │
│  │  );                            │  [Click → paste getvar]  │ │
│  │  _%>                           │                          │ │
│  │                                │  ⚠️ 1 warning            │ │
│  └────────────────────────────────┴──────────────────────────┘ │
│  [Validate]  [Preview sandbox]  [AI Sinh EJS Controller]       │
│  Status: ✅ Valid EJS · 3 getvar calls · 0 errors · 1 warning  │
└────────────────────────────────────────────────────────────────┘
```

**Tính năng EJS mode trong Entry Editor:**
- **Auto-detect**: khi content bắt đầu `@@preprocessing` → tự bật EJS mode
- **Syntax highlight**: `<%` `%>` highlight riêng (xanh = statement, vàng = expression)
- **Variable Panel**: hiển thị schema tree, click vào field → paste `getvar('stat_data.X.Y', { defaults: '...' })`
- **Validate button**: chạy `validateEJSEntry()`, hiện errors/warnings inline
- **Preview sandbox**: chạy EJS với test data (giả lập `getvar` trả về giá trị test), hiện output text
- **Nút "AI Sinh EJS Controller"**: gửi schema + yêu cầu → AI trả về `@@preprocessing` entry content hoàn chỉnh

### 8B.5 System prompt — AI sinh EJS Controller

```
Bạn là chuyên gia viết @@preprocessing entry cho SillyTavern TavernHelper.

SCHEMA MVUZOD (variable key: 'stat_data'):
<schema_json>

NHIỆM VỤ: Tạo content cho Lorebook entry kiểu @@preprocessing.
Entry này sẽ chạy đầu tiên mỗi lượt, đọc biến và điều khiển logic.

QUY TẮC BẮT BUỘC:
• Dòng đầu tiên PHẢI là: @@preprocessing
• Dùng <%_ ... _%> (underscore) để suppress whitespace — KHÔNG để lại dòng trống thừa
• Đọc biến bằng getvar('stat_data.PATH.TO.FIELD', { defaults: 'fallback' })
  PATH dùng dấu CHẤM (.) không phải gạch chéo (/)
  Ví dụ: getvar('stat_data.Trạng thái thế giới.Thời đại hiện tại', { defaults: 'Đấu 1' })
• KHÔNG dùng this.variables — đó là sai context
• KHÔNG dùng <%= %> để output text trong @@preprocessing (không có ý nghĩa)
• Khai báo var với check: if (typeof _era === 'undefined') var _era = getvar(...)
• Dùng getChatMessages(-1, 'user') để đọc tin nhắn cuối nếu cần quét text

YÊU CẦU CỦA NGƯỜI DÙNG:
<user_request>

CHỈ trả về content của entry (bắt đầu từ @@preprocessing), không giải thích.
```

### 8B.6 Làm rõ: TavernHelper Script KHÔNG có EJS

TavernHelper scripts (`data.extensions.tavern_helper.scripts[].content`) là **JavaScript thuần 100%**. Không có `<% %>` hay EJS nào ở đây. Chúng dùng TavernHelper API:

```javascript
// TavernHelper script — JavaScript thuần, KHÔNG có EJS
import { registerMvuSchema } from '...';

// Đây là Zod schema, không phải EJS
export const schema = z.object({
  "Trạng thái thế giới": z.object({
    "Thời đại hiện tại": z.string().prefault('Chờ khởi tạo'),
  }).prefault({}),
}).prefault({});

registerMvuSchema('stat_data', schema);

// Event handler — JavaScript thuần
on("message_received", (msg) => {
  const patches = extractPatches(msg.content);
  // ...
});
```

> **Tóm tắt phân biệt:**
> - **`@@preprocessing` Lorebook entry** → EJS, đọc biến qua `getvar('stat_data.X.Y')`
> - **TavernHelper script** → JavaScript thuần, dùng TavernHelper API (`registerMvuSchema`, `on`, `getvar` nếu cần)
> - **Hai thứ hoàn toàn khác nhau, không trộn lẫn**

---

## 8C. JS ANALYZER — APP HIỂU JS SCRIPT

> Tích hợp vào Tab "Mở rộng / Nâng cao" (6.5), EJS Studio, và MVUZOD Studio.

### 8C.1 Mục tiêu

Khi người dùng nhập TavernHelper script JS vào editor, app:
1. **Trích xuất** tất cả biến được đọc/ghi từ `this.variables`
2. **Map** sang MVUZOD Zod schema fields
3. **Phát hiện** mâu thuẫn: biến dùng trong JS nhưng chưa có trong schema
4. **Gợi ý** "Thêm vào Schema" khi phát hiện biến chưa có
5. **Tạo dependency list**: script này đọc/ghi những biến nào

### 8C.2 `astParser.ts`

```typescript
// src/lib/jsAnalyzer/astParser.ts
// npm install acorn acorn-walk
import * as acorn from "acorn";

export function parseScript(code: string): { ast: acorn.Node; errors: string[] } {
  try {
    return { ast: acorn.parse(code, { ecmaVersion: 2020, sourceType: "script" }), errors: [] };
  } catch (e: any) {
    return { ast: { type: "Program", body: [], start: 0, end: 0 } as any, errors: [String(e.message)] };
  }
}
```

### 8C.3 `variableExtractor.ts`

```typescript
// src/lib/jsAnalyzer/variableExtractor.ts
import { walk } from "acorn-walk";

export interface VariableAccess {
  path: string;          // "this.variables.Người_Chơi.HP"
  jsonPointer: string;   // "/Người_Chơi/HP"
  operation: "read" | "write";
}

export function extractVariableAccesses(ast: any): VariableAccess[] {
  const accesses: VariableAccess[] = [];

  walk.simple(ast, {
    AssignmentExpression(node: any) {
      const path = memberPath(node.left);
      if (path?.startsWith("this.variables.")) {
        accesses.push({ path, jsonPointer: toPointer(path), operation: "write" });
      }
    },
    MemberExpression(node: any) {
      const path = memberPath(node);
      if (path?.startsWith("this.variables.")) {
        accesses.push({ path, jsonPointer: toPointer(path), operation: "read" });
      }
    },
  });

  // Dedup
  const seen = new Map<string, VariableAccess>();
  for (const a of accesses) {
    const key = `${a.jsonPointer}:${a.operation}`;
    if (!seen.has(key)) seen.set(key, a);
  }
  return [...seen.values()];
}

function memberPath(node: any): string | null {
  if (!node) return null;
  if (node.type === "MemberExpression") {
    const obj = memberPath(node.object);
    const prop = node.computed ? null : (node.property?.name ?? node.property?.value);
    return obj && prop ? `${obj}.${prop}` : null;
  }
  if (node.type === "ThisExpression") return "this";
  if (node.type === "Identifier") return node.name;
  return null;
}

function toPointer(p: string): string {
  return "/" + p.replace("this.variables.", "").replace(/\./g, "/");
}
```

### 8C.4 `schemaLinker.ts`

```typescript
// src/lib/jsAnalyzer/schemaLinker.ts
export function linkToSchema(accesses: VariableAccess[], schema: MVUZODSchema) {
  const flat = flattenFields(schema.fields);
  const byPointer = new Map(flat.map(f => [f.path, f]));

  return accesses.map(a => {
    const field = byPointer.get(a.jsonPointer);
    let issue: string | undefined;
    let suggestion: string | undefined;
    if (!field) {
      issue = "missing_from_schema";
      suggestion = `Thêm field "${a.jsonPointer}" vào MVUZOD Schema`;
    } else if (a.operation === "write" && field.constraints.readOnly) {
      issue = "read_only_but_written";
      suggestion = `Field "${a.jsonPointer}" là readOnly`;
    }
    return { access: a, schemaField: field ?? null, issue, suggestion };
  });
}

function flattenFields(fields: MVUZODField[], prefix = ""): MVUZODField[] {
  const result: MVUZODField[] = [];
  for (const f of fields) {
    const path = prefix + f.path;
    result.push({ ...f, path });
    if (f.children) result.push(...flattenFields(f.children, path + "/"));
  }
  return result;
}
```

### 8C.5 UI — JS Analyzer Panel

Accordion **"🔬 JS Analyzer"** dưới mỗi TavernHelper script trong Tab Mở rộng:

```
┌─ JS Analyzer ──────────────────────────────────────────┐
│  📊 12 biến đọc | 7 biến ghi | 2 vấn đề               │
│                                                         │
│  ❌ /Người_Chơi/Bạc [WRITE] — chưa có trong schema    │
│     → [Thêm vào Schema]                                 │
│  ✅ /Người_Chơi/HP [READ+WRITE] — number, clamp[0,100]│
│  ⚠️ /Trận_Đấu/Địch [WRITE] — readOnly field!          │
│                                                         │
│  📋 Schema fields không được dùng:                     │
│     /Người_Chơi/Kinh_Nghiệm                            │
│                                                         │
│  [🔄 Phân tích lại]  [📤 Xuất báo cáo]               │
└────────────────────────────────────────────────────────┘
```

### 8C.6 Context Injection cho AI

Khi Copilot được yêu cầu sửa script, inject phân tích vào context:

```typescript
export function buildScriptContext(script: TavernHelperScript, schema: MVUZODSchema): string {
  const { ast, errors } = parseScript(script.content);
  const accesses = extractVariableAccesses(ast);
  const linked = linkToSchema(accesses, schema);
  const issues = linked.filter(l => l.issue);
  return `
=== PHÂN TÍCH JS SCRIPT: "${script.name}" ===
Biến ĐỌC: ${accesses.filter(a=>a.operation==="read").map(a=>a.jsonPointer).join(", ")||"không có"}
Biến GHI: ${accesses.filter(a=>a.operation==="write").map(a=>a.jsonPointer).join(", ")||"không có"}
Vấn đề: ${issues.length>0 ? issues.map(i=>`${i.access.jsonPointer}: ${i.issue}`).join("; ") : "không có"}
${errors.length>0 ? `Lỗi parse: ${errors.join("; ")}` : ""}`.trim();
}
```

---

## 9. Module 5 — AI Assistant (Copilot) & Client-Agent Loop

Drawer bên phải, persistent trên mọi trang. Dùng chung `ProxyProfile` + `GenerationParams` từ Module 1.

### 9.1 UI Chat Panel

| Thành phần | Mô tả |
|---|---|
| **Dropdown "Chế độ"** | 5 Worldbuilding Mode (4.3) — thay system prompt ngay lập tức |
| **Context chip** | "đang xem": vd `📍 Lorebook Entry #12 — "Hệ thống Tu Luyện"` |
| **ThoughtBubble** | Accordion thu gọn hiển thị field `thought` của AI |
| **AgentStatusBar** | Spinner + mô tả bước + nút ⏸/⏹ |
| **RAG Debug Panel** | Collapsible: hiện query + top matches + token budget |
| **Lịch sử chat** | User (phải) / Assistant (trái); markdown OK |
| **ActionCard** | Mỗi action → 1 card mô tả tiếng Việt + DiffView |
| **Input box** | Auto-grow, Enter=gửi, Shift+Enter=xuống dòng |
| **Toggle "Tự động áp dụng"** | ON: auto-apply action không phải xoá |

### 9.2 Tool Definitions (native tool-calling)

```typescript
const COPILOT_TOOLS = [
  { name: "get_card_summary",       description: "Lấy tổng quan card: name/description/personality rút gọn + danh sách entry (id/comment/keys/position/enabled, KHÔNG có content đầy đủ) + danh sách regex.", parameters: {} },
  { name: "get_field",              description: "Lấy giá trị ĐẦY ĐỦ của 1 field. Path vd: 'data.description', 'data.character_book.entries[12]'.", parameters: { path: "string" } },
  { name: "update_field",           description: "Cập nhật 1 field text/số/bool. KHÔNG dùng cho entry hay regex.", parameters: { path: "string", value: "string|number|boolean|string[]" } },
  { name: "add_lorebook_entry",     description: "Thêm entry mới. Bắt buộc: comment, keys[], content.", parameters: { entry: "AIGeneratedEntry" } },
  { name: "update_lorebook_entry",  description: "Patch 1 entry theo id. Nếu sửa content: truyền ĐẦYĐỦ nội dung sau sửa.", parameters: { id: "number", patch: "Partial<LorebookEntry>" } },
  { name: "delete_lorebook_entry",  description: "Xoá entry. CHỈ sau xác nhận của người dùng.", parameters: { id: "number" } },
  { name: "add_regex_script",       description: "Thêm regex script mới.", parameters: { script: "Omit<RegexScript,'id'>" } },
  { name: "update_regex_script",    description: "Patch regex script theo id.", parameters: { id: "string", patch: "Partial<RegexScript>" } },
  { name: "delete_regex_script",    description: "Xoá regex script. CHỈ sau xác nhận.", parameters: { id: "string" } },
  { name: "fetch_fandom_data",      description: "Yêu cầu app tải nội dung trang wiki/fandom. App dùng Fandom Priority Queue.", parameters: { url: "string" } },
  { name: "read_document",          description: "Yêu cầu app cung cấp chunk tài liệu tiếp theo.", parameters: { chunk_index: "number" } },
  { name: "set_variable",           description: "Ghi vào data.extensions.tavern_helper.variables.", parameters: { key: "string", value: "any" } },
  { name: "continue_signal",        description: "Báo hiệu app gửi lượt gọi tiếp (chưa xong).", parameters: { reason: "string" } },
] as const;
```

### 9.3 System Prompt Copilot — 4 Layers

Mỗi mode ghép từ 4 layer: **Base** + **Anti-Data-Loss** + **SillyTavern Manual** + **Mode-specific**.

**Layer 1 — Base:**
```
Bạn là AI trợ lý chỉnh sửa Character Card SillyTavern V3 trong app "Tavern Card Studio".
Người dùng ra lệnh bằng tiếng Việt tự nhiên để sửa card hiện tại.
NGỮ CẢNH ĐANG MỞ: <context chip>
CARD HIỆN TẠI: <card summary ngắn gọn>
```

**Layer 2 — Anti-Data-Loss Protocol:**
```
=== ANTI-DATA-LOSS PROTOCOL (BẮT BUỘC) ===
1. CẤM XOÁ thông tin cũ: update entry = nội dung cũ + thông tin bổ sung.
   KHÔNG viết "same as before", "giữ nguyên phần trên", hay lược bỏ.
2. CẤM RÚT GỌN: xuất ra TOÀN BỘ nội dung, không dùng "..." hay "[...]".
3. CẤM SÁNG TẠO TÙY TIỆN: chỉ thay đổi đúng phần người dùng yêu cầu.
4. CẤM BỊA: nếu chưa rõ giá trị hiện tại, gọi get_field trước.
5. Hành động XOÁ: bắt buộc xác nhận bằng TEXT trong lượt trước.
```

**Layer 3 — SillyTavern Technical Manual:**
```
=== HƯỚNG DẪN KỸ THUẬT SILLYTAVERN ===
KÍCH HOẠT ENTRY: constant=true (luật vật lý), selective=true (theo tình huống), vectorized=true (ngữ nghĩa)
VỊ TRÍ (position 0-7): 0=before_char, 1=after_char, 2/3=Author's Note, 4=@depth+role, 7=outlet
THỨ TỰ: 100=mặc định, 101+=ghi đè cùng chủ đề, 300+=phân cấp/VIP
ĐỆ QUY: prevent_recursion=true (tiết kiệm token), ignore_budget=true (VIP card)
SELECTIVELOGIC: 0=AND ANY, 1=NOT ALL, 2=NOT ANY, 3=AND ALL
```

**Layer 4 — Mode-specific:**
```typescript
const MODE_INSTRUCTIONS = {
  genesis:              "Tạo cấu trúc ĐÚNG ngay từ đầu. Hỏi rõ nếu mơ hồ.",
  evolution:            "Style Mimicry: bắt chước phong cách entries hiện có. Dùng fetch_fandom_data + Fandom Priority.",
  document_extraction:  "Đọc từng chunk qua read_document. CONTINUE sau mỗi chunk cho đến END OF DOCUMENT.",
  discussion:           "CHỈ trò chuyện. actions PHẢI là []. Không gọi bất kỳ tool nào.",
  mvuzod:               "Xem Phần 9C — system prompt MVUZOD đầy đủ.",
};
```

### 9.4 ActionCard & DiffView

- `create_entry` → "➕ Thêm entry: \"<comment>\""
- `update_entry` → "✏️ Sửa entry: \"<target_comment>\"" + cảnh báo nếu content mới < 60% cũ
- `delete_entry` → "🗑️ Xoá entry: \"<target_comment>\"" (đỏ)
- `update_field` → "✏️ Sửa field: <path>"
- `fetch_fandom_data` → "🌐 Tải: <url>" (auto-execute)
- `read_document` → "📄 Chunk <N>" (auto-execute)

**DiffView:** `jsdiff` unified diff — đỏ = cũ, xanh = mới.

**Nút:** [✅ Áp dụng] [✖️ Bỏ qua]. Action `delete_*` LUÔN yêu cầu duyệt dù toggle "Tự động áp dụng" ON.

### 9.5 Client-Agent Loop (`lib/ai/agentLoop.ts`)

```typescript
async function runCopilotLoop(userMessage: string, ctx: CopilotContext) {
  const systemPrompt = buildSystemPrompt(ctx.mode, ctx.card);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...ctx.chatHistory,
    { role: "user", content: userMessage },
  ];

  let keepRunning = true;
  let loopCount = 0;
  const MAX_LOOPS = 8;

  while (keepRunning && loopCount < MAX_LOOPS && !ctx.stopped) {
    while (ctx.paused) await sleep(300);
    loopCount++;
    ctx.setStatus(`Đang gọi AI (lượt ${loopCount})...`);

    let response: AIResponse;
    if (ctx.profile.supportsNativeToolCalling) {
      const raw = await callAIWithTools(messages, COPILOT_TOOLS, ctx.profile, ctx.generationParams);
      response = mapNativeToolCallsToAIResponse(raw);
    } else {
      const raw = await callAI(messages, ctx.profile, ctx.generationParams);
      response = parseAIResponseJSON(raw);
    }

    if (response.thought) ctx.showThought(response.thought);

    for (const action of response.actions) {
      await handleAction(action, ctx, messages);
    }

    if (response.message) ctx.appendMessage("assistant", response.message);

    const hasPending = response.actions.some(a => ["fetch_fandom_data","read_document","continue_signal"].includes(a.type));
    keepRunning = response.status === "CONTINUE" || hasPending;
    if (loopCount >= MAX_LOOPS) ctx.appendMessage("system", "⚠️ AI lặp quá nhiều bước. Thử lại với yêu cầu cụ thể hơn.");
  }
  ctx.setStatus(null);
}

async function handleAction(action: AIAction, ctx: CopilotContext, messages: ChatMessage[]) {
  switch (action.type) {
    case "fetch_fandom_data": {
      ctx.setStatus(`🌐 Tải: ${action.url}`);
      try {
        // Dùng Fandom Priority Queue
        const { text, source } = await fetchWikiPageWithFallback(action.url.split("/wiki/")[1] ?? "", ctx.card, ctx);
        messages.push({ role: "user", content: `[System: Nội dung từ [${source}] (${text.length} ký tự):\n${text.slice(0, 20000)}${text.length > 20000 ? "\n...[CẮT BỚT]" : ""}]` });
      } catch (e) {
        messages.push({ role: "user", content: `[System: Lỗi tải "${action.url}": ${e}. CORS? Hướng dẫn user copy-paste vào tab Trích Xuất Tài Liệu.]` });
      }
      break;
    }
    case "read_document": {
      const chunk = ctx.documentChunks?.[action.chunk_index] ?? "";
      const isLast = action.chunk_index >= (ctx.documentChunks?.length ?? 0) - 1;
      messages.push({ role: "user", content: isLast
        ? `[System: Chunk ${action.chunk_index+1}/${ctx.documentChunks?.length}:\n${chunk}\n[END OF DOCUMENT]]`
        : `[System: Chunk ${action.chunk_index+1}/${ctx.documentChunks?.length}:\n${chunk}]` });
      break;
    }
    default: {
      // create/update/delete/update_field/add_regex...
      const isDestructive = action.type.startsWith("delete");
      const autoApply = ctx.autoApply && !isDestructive;
      if (autoApply) {
        applyAction(action, ctx.card, ctx.cardStore);
        messages.push({ role: "tool", content: `{"status":"applied","action":"${action.type}"}` });
      } else {
        const decision = await ctx.showActionCard(action);
        if (decision === "apply") {
          applyAction(action, ctx.card, ctx.cardStore);
          messages.push({ role: "tool", content: `{"status":"applied","action":"${action.type}"}` });
        } else {
          messages.push({ role: "tool", content: `{"status":"skipped_by_user","action":"${action.type}"}` });
        }
      }
    }
  }
}
```

### 9.6 Fallback JSON Schema

Khi `supportsNativeToolCalling === false`, thêm vào cuối system prompt:

```
=== ĐỊNH DẠNG PHẢN HỒI BẮT BUỘC ===
Mọi response PHẢI là JSON object hợp lệ (không markdown, không code block):
{
  "thought": "Giải thích lý do và kế hoạch",
  "message": "Lời thoại cho người dùng (markdown OK trong chuỗi)",
  "status": "CONTINUE hoặc DONE",
  "actions": [
    {"type":"create_entry","data":{"comment":"...","keys":[...],"content":"..."}}
  ]
}
```

Parser (`lib/ai/jsonExtract.ts`):
```typescript
export function parseAIResponseJSON(raw: string): AIResponse {
  try { return JSON.parse(raw); } catch {}
  const fence = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fence) try { return JSON.parse(fence[1]); } catch {}
  const obj = raw.match(/\{[\s\S]+\}/);
  if (obj) try { return JSON.parse(obj[0]); } catch {}
  return { thought: "", message: raw, status: "DONE", actions: [] };
}
```

---

## 9B. RAG ENGINE (IN-BROWSER)

> TF-IDF in-browser, không cần backend, cải thiện chất lượng generation.

### 9B.1 `tfidfIndexer.ts`

```typescript
// src/lib/rag/tfidfIndexer.ts

export interface RAGSearchResult { entry: LorebookEntry; score: number; }

export class TFIDFIndex {
  private entries: Array<{ id: number; comment: string; vector: Map<string, number> }> = [];
  private idf = new Map<string, number>();
  private _source: LorebookEntry[] = [];

  indexWithSource(entries: LorebookEntry[]): void {
    this._source = entries;
    this.entries = [];
    const df = new Map<string, number>();
    const docs = entries.map(entry => {
      const text = [entry.comment, ...entry.keys, entry.content].join(" ").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
      const terms = text.split(" ").filter(t => t.length > 1);
      new Set(terms).forEach(t => df.set(t, (df.get(t)??0)+1));
      return { entry, terms };
    });
    const N = entries.length;
    df.forEach((freq, term) => this.idf.set(term, Math.log((N+1)/(freq+1))+1));
    for (const { entry, terms } of docs) {
      const tf = new Map<string, number>();
      terms.forEach(t => tf.set(t, (tf.get(t)??0)+1));
      const vector = new Map<string, number>();
      tf.forEach((count, term) => vector.set(term, (count/terms.length) * (this.idf.get(term)??0)));
      this.entries.push({ id: entry.id, comment: entry.comment, vector });
    }
  }

  search(query: string, options: { topK?: number } = {}): RAGSearchResult[] {
    const { topK = 5 } = options;
    if (this.entries.length === 0) return [];
    const qTerms = query.toLowerCase().replace(/[^\w\s]/g," ").split(" ").filter(t=>t.length>1);
    const qVec = new Map<string,number>();
    qTerms.forEach(t => qVec.set(t,(qVec.get(t)??0)+1));
    const scores = this.entries.map(e => {
      let dot=0,na=0,nb=0;
      qVec.forEach((w,t) => { const ew=e.vector.get(t)??0; dot+=w*ew; na+=w**2; });
      e.vector.forEach(w => nb+=w**2);
      const sim = na>0&&nb>0 ? dot/(Math.sqrt(na)*Math.sqrt(nb)) : 0;
      return { id: e.id, score: sim };
    });
    return scores.sort((a,b)=>b.score-a.score).slice(0,topK)
      .map(s=>({ entry: this._source.find(e=>e.id===s.id)!, score: s.score }))
      .filter(r=>r.entry);
  }
}
```

### 9B.2 `ragContextBuilder.ts`

```typescript
// src/lib/rag/ragContextBuilder.ts
export function buildRAGContext(query: string, index: TFIDFIndex, options: { topK?: number; includeNegatives?: boolean; maxTokensForContext?: number } = {}): { injectionText: string; relevantEntries: RAGSearchResult[] } {
  const { topK = 5, includeNegatives = true, maxTokensForContext = 1000 } = options;
  const relevant = index.search(query, { topK });
  const parts: string[] = [];

  if (includeNegatives && relevant.length > 0) {
    const negLines = relevant.slice(0,10).map(r => `  - "${r.entry.comment}" [${(r.score*100).toFixed(0)}%] keys: [${r.entry.keys.slice(0,3).join(", ")}]`);
    parts.push(`=== ENTRIES CÓ THỂ TRÙNG (KHÔNG TẠO LẠI) ===\n${negLines.join("\n")}`);
  }
  if (relevant.length > 0) {
    const relLines = relevant.slice(0,3).map(r => `  - "${r.entry.comment}": ${r.entry.content.slice(0,120)}...`);
    parts.push(`=== ENTRIES LIÊN QUAN (THAM KHẢO PHONG CÁCH) ===\n${relLines.join("\n")}`);
  }

  return { injectionText: parts.join("\n\n"), relevantEntries: relevant };
}
```

### 9B.3 RAG Debug Panel (Copilot Drawer)

```
┌─ RAG Context (debug) ───────────────────────────────┐
│  Query: "hệ thống tu luyện cảnh giới"              │
│  Top matches:                                        │
│  [85%] "Cảnh Giới Thánh Nhân"                      │
│  [73%] "Hệ Thống Tu Luyện Cơ Bản"                 │
│  Sẽ inject ~320 tokens vào prompt                   │
└─────────────────────────────────────────────────────┘
```

---

## 9C. PROMPTS MVUZOD CHO COPILOT

> System prompt đầy đủ cho Worldbuilding Mode `mvuzod` — workflow **Lorebook First, Schema Second**.
> Tham chiếu: card thực tế Đấu La Đại Lục 3.1 (634 entries, 7 scripts, schema 500+ dòng Zod).

```typescript
// src/prompts/modeMVUZOD.ts

export const MVUZOD_MODE_INSTRUCTIONS = `
=== CHẾ ĐỘ MVUZOD — LOREBOOK-FIRST RPG ENGINE ===
Bạn là chuyên gia thiết kế hệ thống MVUZOD cho SillyTavern TavernHelper.

QUY TẮC VÀNG — BẮT BUỘC TUÂN THỦ:
Schema MVUZOD PHẢI được suy diễn từ Lorebook đã có.
KHÔNG được tạo schema trước khi Lorebook có nội dung đủ.
Thứ tự: LOREBOOK → PHÂN TÍCH → SCHEMA → SCRIPTS → ENTRIES HỆ THỐNG

=== BƯỚC 1: KIỂM TRA LOREBOOK HIỆN TẠI ===
Khi người dùng bắt đầu tạo MVUZOD card, LUÔN làm trước:
1. Gọi get_card_summary để xem có bao nhiêu entries
2. Nếu entries < 20 → cảnh báo: "Lorebook còn ít. Nên tạo thêm lore, NPC, rules trước khi sinh schema."
3. Nếu đủ entries → tiến hành phân tích

Hỏi người dùng nếu chưa rõ:
- "Lorebook đã có nội dung chưa? Hay bạn muốn tôi giúp tạo Lorebook trước?"
- "Thể loại game: RPG chiến đấu / Tu luyện / Dating sim / Slice of life / Dungeon?"
- "Có entries NPC chưa? Tôi cần biết cấu trúc NPC để thiết kế Record schema."

=== BƯỚC 2: PHÂN TÍCH LOREBOOK → SUY DIỄN SCHEMA ===
Đọc entries Lorebook (qua get_field "data.character_book.entries") và phân tích:

A. PHÂN TÍCH NHÓM (→ ENUM fields):
   Ví dụ Đấu La: entries "Đấu 1: X", "Đấu 2: Y", "Đấu 3: Z"
   → "Thời đại hiện tại": enum["Đấu 1","Đấu 2","Đấu 3"]
   
   Pattern: nếu entries có prefix "ABC 1:", "ABC 2:" → field enum với ABC là tên field

B. PHÂN TÍCH LOẠI CẢNH (→ ENUM từ rules entries):
   Đọc entries "Quy tắc X", "Hướng dẫn Y" để tìm loại cảnh game có thể xảy ra
   Ví dụ: "Hàng ngày","Chiến đấu","Tu luyện","Liệp hồn","Thân mật","Thi đấu"
   → "Loại cảnh hiện tại": enum[...]

C. PHÂN TÍCH NPC (→ RECORD fields):
   Nếu có entries "[NPC ...] Tên" → cần Record<tên, {level, race, present, relationship}>
   Ví dụ: "[NPC Đấu 1] Thanh Điểu", "[NPC Đấu 2] Lạc Lạc"

D. PHÂN TÍCH HỆ THỐNG NHÂN VẬT (→ OBJECT children):
   Đọc entries về "hệ thống tu luyện", "võ hồn", "kỹ năng" để biết:
   - Có bao nhiêu loại "cấp bậc"? (số → number + clamp)
   - Có hệ thống vũ khí/kỹ năng không? (→ Record<tên, {mô tả}>)
   - Có hệ thống kinh tế không? (→ number, Record inventory)

E. PHÂN TÍCH TIMELINE/CHAPTER (→ string fields):
   Entries niên biểu/timeline → "Chương cốt truyện", "Thời kỳ niên biểu" fields

SAU KHI PHÂN TÍCH, báo cáo cho người dùng:
"Tôi đã phân tích ${N} entries và phát hiện:
- Nhóm: [Đấu 1/2/3] → enum Thời đại
- Loại cảnh: [Hàng ngày, Chiến đấu...] → enum Cảnh
- NPC entries: ${count} → Record NPC
- Hệ thống tu luyện: CÓ/KHÔNG
Đề xuất schema [X] fields. Có muốn tôi tiến hành không?"

=== BƯỚC 3: TẠO ZOD SCHEMA TỪ PHÂN TÍCH ===
Tạo schema với action update_field "data.extensions.mvuzod.schema".

NGUYÊN TẮC THIẾT KẾ SCHEMA (học từ card Đấu La thực tế):
• Tên field bằng TIẾNG VIỆT, nhất quán với tên trong Lorebook content
• Enum values PHẢI khớp chính xác với tên groups/categories trong Lorebook
• RECORD cho NPC: Record<tênNPC, {data}> — không dùng Array vì cần lookup theo tên
• NUMBER + clamp cho mọi stat có giới hạn min/max
• prefault("Chờ khởi tạo") cho string chưa biết lúc khởi tạo
• prefix "_" (readonly) cho biến hệ thống AI không được ghi
• Không tạo field cho thứ không thay đổi trong gameplay (lore tĩnh → để ở Lorebook entries)
• ARRAY + transform(uniq) cho danh sách không trùng (thuộc tính, trạng thái)

VÍ DỤ SCHEMA THỰC TẾ (rút gọn từ Đấu La 3.1):
{
  "version": "1.0",
  "fields": [
    {"path":"/Trạng thái thế giới","type":"object","label":"Thế giới","defaultValue":{},"constraints":{"prefault":{}},"children":[
      {"path":"/Thời đại hiện tại","type":"string","label":"Thời đại","defaultValue":"Chờ khởi tạo",
       "constraints":{"prefault":"Chờ khởi tạo"},"description":"enum['Đấu 1','Đấu 2','Đấu 3']"},
      {"path":"/Ngày tháng hiện tại","type":"string","label":"Ngày","defaultValue":"Chờ khởi tạo","constraints":{"prefault":"Chờ khởi tạo"}},
      {"path":"/Khu vực hiện tại","type":"string","label":"Khu vực","defaultValue":"Chờ khởi tạo","constraints":{"prefault":"Chờ khởi tạo"}},
      {"path":"/Cảnh hiện tại","type":"string","label":"Cảnh","defaultValue":"Chờ khởi tạo","constraints":{"prefault":"Chờ khởi tạo"}},
      {"path":"/Loại cảnh hiện tại","type":"string","label":"Loại cảnh","defaultValue":"Hàng ngày",
       "constraints":{"prefault":"Hàng ngày"},"description":"enum['Hàng ngày','Chiến đấu','Tu luyện','Liệp hồn','Thân mật','Thi đấu']"},
      {"path":"/Chương cốt truyện","type":"string","label":"Chương","defaultValue":"Chờ khởi tạo","constraints":{"prefault":"Chờ khởi tạo"}},
      {"path":"/Thời kỳ niên biểu","type":"string","label":"Thời kỳ","defaultValue":"Chờ khởi tạo","constraints":{"prefault":"Chờ khởi tạo"}}
    ]},
    {"path":"/Người chơi","type":"object","label":"Người chơi","defaultValue":{},"constraints":{"prefault":{}},"children":[
      {"path":"/Thông tin cơ bản","type":"object","label":"Cơ bản","defaultValue":{},"constraints":{"prefault":{}},"children":[
        {"path":"/Họ tên","type":"string","label":"Tên","defaultValue":"Chờ khởi tạo","constraints":{"prefault":"Chờ khởi tạo"}},
        {"path":"/Tuổi","type":"number","label":"Tuổi","defaultValue":12,"constraints":{"coerce":true,"prefault":12}},
        {"path":"/Giới tính","type":"string","label":"Giới tính","defaultValue":"Chờ khởi tạo","constraints":{"prefault":"Chờ khởi tạo"}},
        {"path":"/Chủng tộc","type":"string","label":"Chủng tộc","defaultValue":"Nhân loại","constraints":{"prefault":"Nhân loại"}}
      ]},
      {"path":"/Trạng thái tu luyện","type":"object","label":"Tu luyện","defaultValue":{},"constraints":{"prefault":{}},"children":[
        {"path":"/Cấp bậc hồn lực","type":"number","label":"Cấp","defaultValue":0,
         "constraints":{"coerce":true,"clamp":[0,200],"prefault":0}},
        {"path":"/Phần trăm hồn lực","type":"number","label":"%","defaultValue":100,
         "constraints":{"coerce":true,"clamp":[0,100],"prefault":100}}
      ]},
      {"path":"/Thông tin võ hồn","type":"record","label":"Võ hồn","defaultValue":{},"constraints":{"prefault":{}},
       "description":"Record<tênVõHồn, {Phẩm chất, Hệ thống, Hồn hoàn: Record<số, {Màu sắc, Niên hạn, Hồn kỹ}>}>"},
      {"path":"/Hành trang","type":"record","label":"Đồ vật","defaultValue":{},"constraints":{"prefault":{}},
       "description":"Record<tên, {Mô tả, Số lượng}>"}
    ]},
    {"path":"/NPC","type":"record","label":"Danh sách NPC","defaultValue":{},"constraints":{"prefault":{}},
     "description":"Record<tênNPC, {era, race, level, present, relationship}>"}
  ]
}

=== BƯỚC 4: TẠO 5 ENTRIES HỆ THỐNG MVUZOD ===

Sau khi schema được duyệt, tạo 5 entries đặc biệt (theo thứ tự):

**ENTRY 1 — EJS Controller (Bộ điều khiển EJS)**
comment: "Bộ điều khiển EJS"
constant: true, position=0 (before_char), keys=[]
Nội dung là EJS @@preprocessing đọc biến và chọn entries theo state:
\`\`\`
@@preprocessing
<%_
// Đọc biến từ stat_data (key lưu trong TavernHelper variables)
if (typeof _era === 'undefined') var _era = getvar('stat_data.Trạng thái thế giới.Thời đại hiện tại', { defaults: 'Đấu 1' });
if (typeof _sType === 'undefined') var _sType = getvar('stat_data.Trạng thái thế giới.Loại cảnh hiện tại', { defaults: 'Hàng ngày' });
if (typeof _chapter === 'undefined') var _chapter = getvar('stat_data.Trạng thái thế giới.Chương cốt truyện', { defaults: 'Tự chương' });
// Kích hoạt/tắt entries theo era (ví dụ: entries "Đấu 1" chỉ bật khi _era === 'Đấu 1')
// Dùng activateEntry(id, bool) hoặc setEntryEnabled(comment, bool) của TavernHelper
_%>
\`\`\`

**ENTRY 2 — [mvu_update] Quy tắc cập nhật biến**
comment: "[mvu_update] Quy tắc cập nhật biến"
constant: true, position=0, keys=[]
Nội dung: các quy tắc chi tiết về khi nào AI phải cập nhật biến nào.
Phân theo section (Trạng thái thế giới / Người chơi / NPC...).
Viết dạng YAML để AI dễ đọc:
\`\`\`
Quy tắc cập nhật biến:
  _Quy tắc toàn cục:
    - Chỉ cập nhật những thứ thực sự thay đổi trong lượt này
    - NPC không xuất hiện → giữ nguyên, không cập nhật
    - Cấm bỏ sót, cấm lược bớt khi tạo NPC mới
  Trạng thái thế giới:
    Thời đại hiện tại:
      type: "'Đấu 1' | 'Đấu 2' | 'Đấu 3'"
      check: Biến tĩnh, chỉ thay đổi khi người dùng xác nhận chuyển era
    Loại cảnh hiện tại:
      type: enum (xem schema)
      check: Cập nhật theo context mỗi lượt
  Người chơi:
    Trạng thái tu luyện/Cấp bậc hồn lực:
      type: number [0-200]
      check: delta khi người chơi tu luyện, replace khi breakthrough
\`\`\`

**ENTRY 3 — [mvu_update] Định dạng đầu ra biến**
comment: "[mvu_update] Định dạng đầu ra biến"
constant: true, position=0, keys=[]
Nội dung — quy định FORMAT OUTPUT AI phải dùng:
\`\`\`
variables_update_format:
  rule:
    - Xuất JSON Patch ở CUỐI mỗi reply, không được bỏ qua
    - Dùng 5 operators: replace, delta, insert, remove, move
    - delta PHẢI là number (không có quotes)
    - Không cập nhật field bắt đầu bằng _ (readonly)
    - Khi tạo NPC mới: insert TOÀN BỘ data, không bỏ sót field
  format: |
    <UpdateVariable>
    [{"op":"replace","path":"/Trạng thái thế giới/Loại cảnh hiện tại","value":"Chiến đấu"},
     {"op":"delta","path":"/Người chơi/Trạng thái tu luyện/Cấp bậc hồn lực","value":1}]
    </UpdateVariable>
\`\`\`

**ENTRY 4 — [mvu_update] Nhấn mạnh định dạng**
comment: "[mvu_update] Nhấn mạnh định dạng đầu ra biến"
constant: true, position=4 (@depth=0, role=system), keys=[]
Nội dung — nhắc lại ngắn gọn để AI không quên:
\`\`\`
Nhấn mạnh: Sau MỖI reply, BẮT BUỘC xuất block <UpdateVariable>...</UpdateVariable>
Không được bỏ qua dù chỉ 1 lượt. Nếu không có thay đổi, xuất mảng rỗng [].
\`\`\`

**ENTRY 5 — [initvar] Khởi tạo biến**
comment: "[initvar] Khởi tạo biến - đừng mở"
constant: false, selective: false, enabled: true, keys=[]
Nội dung: YAML mirror của schema với giá trị mặc định (dùng để AI đọc cấu trúc biến):
\`\`\`
Trạng thái thế giới:
  Thời đại hiện tại: Chờ khởi tạo
  Ngày tháng hiện tại: Chờ khởi tạo
  Khu vực hiện tại: Chờ khởi tạo
  Cảnh hiện tại: Chờ khởi tạo
  Loại cảnh hiện tại: Hàng ngày
  Chương cốt truyện: Chờ khởi tạo
  Thời kỳ niên biểu: Chờ khởi tạo

Người chơi:
  Thông tin cơ bản:
    Họ tên: Chờ khởi tạo
    Tuổi: 12
    Giới tính: Chờ khởi tạo
    Chủng tộc: Chờ khởi tạo
  Trạng thái tu luyện:
    Cấp bậc hồn lực: 0
    Phần trăm hồn lực: 100
  Thông tin võ hồn: {}
  Hành trang: {}

NPC: {}
\`\`\`

=== BƯỚC 5: TẠO TAVERN HELPER SCRIPTS ===

Tạo 2 scripts tối thiểu (dùng action create_tavern_script):

**SCRIPT 1 — MVU Import (bắt buộc)**
name: "MVU"
content: "import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js';"
enabled: true

**SCRIPT 2 — Cấu trúc biến (Zod Schema)**
name: "Cấu trúc biến [tên card]"
enabled: true
content (mẫu — điền schema thực tế vào registerMvuSchema):
\`\`\`javascript
import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

export const schema = z.object({
  "Trạng thái thế giới": z.object({
    "Thời đại hiện tại": z.enum(['Đấu 1', 'Đấu 2', 'Đấu 3']).or(z.literal('Chờ khởi tạo')).prefault('Chờ khởi tạo'),
    "Ngày tháng hiện tại": z.string().prefault('Chờ khởi tạo'),
    "Khu vực hiện tại": z.string().prefault('Chờ khởi tạo'),
    "Cảnh hiện tại": z.string().prefault('Chờ khởi tạo'),
    "Loại cảnh hiện tại": z.enum(['Hàng ngày','Chiến đấu','Tu luyện','Liệp hồn','Thân mật','Thi đấu']).prefault('Hàng ngày'),
    "Chương cốt truyện": z.string().prefault('Chờ khởi tạo'),
    "Thời kỳ niên biểu": z.string().prefault('Chờ khởi tạo'),
  }).prefault({}),

  "Người chơi": z.object({
    "Thông tin cơ bản": z.object({
      "Họ tên": z.string().prefault('Chờ khởi tạo'),
      "Tuổi": z.coerce.number().prefault(12),
      "Giới tính": z.string().prefault('Chờ khởi tạo'),
      "Chủng tộc": z.string().prefault('Nhân loại'),
    }).prefault({}),
    "Trạng thái tu luyện": z.object({
      "Cấp bậc hồn lực": z.coerce.number().transform(v => _.clamp(v, 0, 200)).prefault(0),
      "Phần trăm hồn lực": z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(100),
    }).prefault({}),
    "Thông tin võ hồn": z.record(
      z.string().describe('Tên võ hồn'),
      z.object({
        "Phẩm chất": z.string().prefault('Chờ khởi tạo'),
        "Hồn hoàn": z.record(
          z.string().describe('Số thứ tự'),
          z.object({ "Màu sắc": z.string().prefault(''), "Niên hạn": z.string().prefault(''), "Hồn kỹ": z.record(z.string(), z.object({"Mô tả": z.string().prefault('')}).prefault({})).prefault({}) }).prefault({})
        ).prefault({}),
      }).prefault({})
    ).prefault({}),
    "Hành trang": z.record(z.string(), z.object({ "Mô tả": z.string().prefault(''), "Số lượng": z.coerce.number().prefault(1) }).prefault({})).prefault({}),
  }).prefault({}),

  "NPC": z.record(
    z.string().describe('Tên NPC'),
    z.object({
      "Thời đại": z.string().prefault(''),
      "Chủng tộc": z.string().prefault('Nhân loại'),
      "Cấp bậc": z.coerce.number().prefault(0),
      "Có mặt hay không": z.boolean().prefault(false),
      "Quan hệ": z.string().prefault('Xa lạ'),
    }).prefault({})
  ).prefault({}),
}).prefault({});

registerMvuSchema('stat_data', schema);
\`\`\`

> **Lưu ý về key 'stat_data'**: Đây là key lưu trong TavernHelper variables.
> JSON Patch paths sẽ tương ứng: /Trạng thái thế giới/... → stat_data['Trạng thái thế giới']...
> EJS Controller đọc: getvar('stat_data.Trạng thái thế giới.Thời đại hiện tại')

=== ĐỊNH DẠNG OUTPUT AI KHI CHƠI (RUNTIME) ===
Dùng XML tags (không phải code fence), đặt ở CUỐI mỗi response:

<UpdateVariable>
[
  {"op":"replace","path":"/Trạng thái thế giới/Loại cảnh hiện tại","value":"Chiến đấu"},
  {"op":"delta","path":"/Người chơi/Trạng thái tu luyện/Cấp bậc hồn lực","value":1},
  {"op":"insert","path":"/NPC/Đường Tam","value":{"Thời đại":"Đấu 1","Chủng tộc":"Nhân loại","Cấp bậc":29,"Có mặt hay không":true,"Quan hệ":"Bạn đồng môn"}}
]
</UpdateVariable>

=== 5 TOÁN TỬ JSON PATCH (RFC 6902 mở rộng) ===
• replace: gán giá trị mới → {"op":"replace","path":"/X/Y","value":75}
• delta:   cộng/trừ số (PHẢI là number, không quotes) → {"op":"delta","path":"/X/HP","value":-15}
• insert:  thêm key vào Record hoặc push vào Array (dùng /- để push) → {"op":"insert","path":"/X/Túi/Kiếm","value":{...}}
• remove:  xoá key/phần tử → {"op":"remove","path":"/X/Y"}
• move:    di chuyển → {"op":"move","from":"/X/A","to":"/Y/B"}

=== QUY TẮC THIẾT KẾ MVUZOD (HỌC TỪ CARD THỰC TẾ) ===
• Schema PHẢN ÁNH Lorebook: tên field = tên concepts trong entries
• Không tạo field cho lore tĩnh (thế giới quan, lịch sử) — để trong Lorebook entries
• LUÔN có prefault để tránh crash khi biến chưa khởi tạo
• prefix "_" cho readonly, prefix "$" cho private (ẩn khỏi AI hoàn toàn)
• NPC dùng Record (không Array) để dễ update theo tên
• EJS Controller là entry đặc biệt nhất — nó quyết định entries nào được load
• [initvar] entry là "bản đồ" cấu trúc biến cho AI đọc hiểu
`;

// ===== SCHEMA INFERENCE PROMPT =====
// Dùng khi app gọi AI để phân tích Lorebook và đề xuất schema
export const MVUZOD_SCHEMA_INFERENCE_PROMPT = `
Bạn đang phân tích Lorebook của một character card SillyTavern để thiết kế MVUZOD schema.

NHIỆM VỤ: Đọc các entries được cung cấp và xác định:
1. NHÓM/CATEGORY nào xuất hiện nhiều (→ enum field)
2. THUỘC TÍNH nào của nhân vật cần track (→ object children)
3. CÓ NPC pattern không (→ Record<tên, data>)
4. Hệ thống CULTIVATION/LEVEL không (→ number + clamp)
5. Loại CẢNH game nào có thể xảy ra (→ enum Loại cảnh)
6. Hệ thống VẬT PHẨM không (→ Record inventory)

KẾT QUẢ: Trả về JSON gồm 2 phần:
{
  "analysis": {
    "groups": [{"name":"X","count":N,"suggestEnum":true}],
    "npcPattern": true/false,
    "cultivationSystem": true/false,
    "sceneTypes": ["Hàng ngày","Chiến đấu",...],
    "inventorySystem": true/false,
    "warnings": ["Lorebook còn ít entries về X"]
  },
  "proposedSchema": { ...MVUZODSchema... }
}

NGUYÊN TẮC:
• Tên field bằng tiếng Việt, nhất quán với Lorebook content
• Enum values PHẢI khớp chính xác với tên nhóm trong Lorebook
• Record cho NPC/vật phẩm (không Array)
• prefault cho mọi field
• Chỉ tạo field cho thứ THAY ĐỔI trong gameplay
`;

// ===== BATCH ADDON CHO LOREBOOK MVUZOD =====
export const MVUZOD_BATCH_ADDON = `
=== TÍCH HỢP MVUZOD ===
Card này dùng hệ thống MVUZOD. Khi tạo entries mới:
• Entries lore/NPC/rules: viết bình thường (KHÔNG cần EJS hay JSON Patch)
• Entries quy tắc game: có thể thêm ví dụ JSON Patch để AI học format
• KHÔNG tạo lại 5 entries hệ thống ([EJS Controller], [mvu_update] x3, [initvar]) — chúng đã có riêng
• Giữ nhất quán tên riêng với schema: tên trong entries phải khớp enum values trong schema
`;
```


---

## 10. Module 6 — Import / Export

### 10.1 Import

Vùng kéo-thả file hoặc nút chọn file. Nhận `.json` và `.txt`.

**Tự động nhận diện định dạng:**

| Dấu hiệu | Loại | Hành động |
|---|---|---|
| `spec === "chara_card_v3"` | Card đầy đủ | Dialog: "Tạo project mới" / "Ghi đè project hiện tại" |
| `entries` là object, value có `uid`/`key`/`order`/`disable` | Lorebook standalone (3.6) | Convert → embedded; dialog: Thêm vào cuối / Thay thế / Tạo project mới |
| Array, mỗi item có `id`/`scriptName`/`findRegex` | Regex scripts | Append vào `regex_scripts`, regenerate id |
| File `.txt` | Tài liệu văn bản | Tự động mở tab **"Trích Xuất Tài Liệu"** với file đã nạp sẵn |
| Không khớp | — | Toast lỗi với hướng dẫn |

Sau nhận diện: chạy `cardDefaults`/converter để **điền các field thiếu** bằng default.

### 10.2 Export

| Nút | Nội dung | Tên file |
|---|---|---|
| **"Xuất Card đầy đủ (.json)"** | `CharacterCardV3` (đã `syncMirrorFields()`) | `<slug>_card_v3.json` |
| **"Xuất Lorebook riêng (.json)"** | Convert `character_book.entries` → `StandaloneLorebookFile` (3.6) | `<slug>_lorebook.json` |
| **"Xuất Regex Scripts (.json)"** | `data.extensions.regex_scripts` (mảng) | `<slug>_regex.json` |

Toggle **"Định dạng JSON"**: Thu gọn (mặc định) / Dễ đọc (2-space indent).

Tất cả export dùng `Blob` + `URL.createObjectURL`, không cần backend.

### 10.3 Converter (`lib/converters/lorebookConvert.ts`)

```typescript
// Standalone → Embedded (khi import Lorebook standalone vào card)
export function standaloneToEmbedded(file: StandaloneLorebookFile, baseId: number): LorebookEntry[] {
  return Object.values(file.entries).map((e, i) => ({
    id: baseId + i,
    keys: e.key,
    secondary_keys: e.keysecondary,
    comment: e.comment,
    content: e.content,
    constant: e.constant,
    selective: e.selective,
    insertion_order: e.order,
    enabled: !e.disable,
    position: e.position === 0 ? "before_char" : "after_char",
    use_regex: true,
    extensions: {
      position: e.position,
      exclude_recursion: e.excludeRecursion,
      display_index: e.displayIndex,
      probability: e.probability,
      useProbability: e.useProbability,
      depth: e.depth,
      selectiveLogic: e.selectiveLogic,
      outlet_name: e.outletName,
      group: e.group,
      group_override: e.groupOverride,
      group_weight: e.groupWeight,
      prevent_recursion: e.preventRecursion,
      delay_until_recursion: e.delayUntilRecursion,
      scan_depth: e.scanDepth,
      match_whole_words: e.matchWholeWords,
      use_group_scoring: e.useGroupScoring ?? false,
      case_sensitive: e.caseSensitive,
      automation_id: e.automationId,
      role: e.role,
      vectorized: e.vectorized,
      sticky: e.sticky,
      cooldown: e.cooldown,
      delay: e.delay,
      match_persona_description: e.matchPersonaDescription,
      match_character_description: e.matchCharacterDescription,
      match_character_personality: e.matchCharacterPersonality,
      match_character_depth_prompt: e.matchCharacterDepthPrompt,
      match_scenario: e.matchScenario,
      match_creator_notes: e.matchCreatorNotes,
      triggers: e.triggers,
      ignore_budget: e.ignoreBudget,
    } as LorebookEntryExt,
  }));
}

// Embedded → Standalone (khi export Lorebook riêng)
export function embeddedToStandalone(entries: LorebookEntry[]): StandaloneLorebookFile {
  const result: StandaloneLorebookFile = { entries: {} };
  entries.forEach((e, i) => {
    result.entries[String(i)] = {
      uid: e.id,
      key: e.keys,
      keysecondary: e.secondary_keys,
      comment: e.comment,
      content: e.content,
      constant: e.constant,
      vectorized: e.extensions.vectorized,
      selective: e.selective,
      selectiveLogic: e.extensions.selectiveLogic,
      addMemo: true,
      order: e.insertion_order,
      position: e.extensions.position,
      disable: !e.enabled,
      ignoreBudget: e.extensions.ignore_budget,
      excludeRecursion: e.extensions.exclude_recursion,
      preventRecursion: e.extensions.prevent_recursion,
      matchPersonaDescription: e.extensions.match_persona_description,
      matchCharacterDescription: e.extensions.match_character_description,
      matchCharacterPersonality: e.extensions.match_character_personality,
      matchCharacterDepthPrompt: e.extensions.match_character_depth_prompt,
      matchScenario: e.extensions.match_scenario,
      matchCreatorNotes: e.extensions.match_creator_notes,
      delayUntilRecursion: e.extensions.delay_until_recursion,
      probability: e.extensions.probability,
      useProbability: e.extensions.useProbability,
      depth: e.extensions.depth,
      outletName: e.extensions.outlet_name,
      group: e.extensions.group,
      groupOverride: e.extensions.group_override,
      groupWeight: e.extensions.group_weight,
      scanDepth: e.extensions.scan_depth,
      caseSensitive: e.extensions.case_sensitive,
      matchWholeWords: e.extensions.match_whole_words,
      useGroupScoring: e.extensions.use_group_scoring,
      automationId: e.extensions.automation_id,
      role: e.extensions.role,
      sticky: e.extensions.sticky,
      cooldown: e.extensions.cooldown,
      delay: e.extensions.delay,
      triggers: e.extensions.triggers,
      displayIndex: e.extensions.display_index,
      characterFilter: { isExclude: false, names: [], tags: [] },
    };
  });
  return result;
}
```

---

## 11. Lưu trữ dữ liệu & quản lý nhiều Project

### 11.1 Dexie Schema

```typescript
class TavernCardDB extends Dexie {
  projects!: Table<ProjectRecord, string>;
  snapshots!: Table<SnapshotRecord, string>;

  constructor() {
    super("TavernCardStudioDB");
    this.version(1).stores({
      projects:  "id, name, updatedAt",
      snapshots: "id, projectId, createdAt",
    });
  }
}

interface ProjectRecord {
  id: string;
  name: string;
  card: CharacterCardV3;
  createdAt: number;
  updatedAt: number;
}

interface SnapshotRecord {
  id: string;
  projectId: string;
  card: CharacterCardV3;
  label: string;    // vd "Auto: trước Copilot — 10:42:03"
  createdAt: number;
}
```

### 11.2 Sidebar & Project Management

- Danh sách project sắp theo `updatedAt` giảm dần; project đang mở highlight.
- Double-click tên → rename inline; menu `⋮` → Sao chép / Xuất / Xoá.
- Nút **"+ Project mới"** → `cardDefaults.createEmptyCard()` với mọi field đúng kiểu.

### 11.3 Auto-save & Undo/Snapshot

- **Auto-save:** debounce 1.5s → `projects.put(...)`. TopBar: "● Đã lưu lúc HH:mm:ss" / "● Đang lưu..."
- **Snapshot thủ công:** nút 📌 TopBar.
- **Snapshot tự động:** trước mỗi lần Copilot áp dụng action, trước khi Batch/Wiki/DocExtract bắt đầu. Giữ tối đa **20 snapshot tự động**/project.
- **Undo nhanh** (Ctrl+Z / nút ↩️ TopBar): pop snapshot gần nhất.

### 11.4 Design Guidelines

| Khía cạnh | Hướng dẫn |
|---|---|
| Theme | Dark mode mặc định; slate/zinc + nhấn amber/orange. Cho phép chuyển light. |
| Typography | UI: Inter/Geist. Code/regex/EJS: monospace (JetBrains Mono), `white-space: pre-wrap`. |
| Loading | Skeleton cho model list; progress bar + AgentStatusBar cho mọi AI loop; spinner nhỏ trong nút. |
| Empty state | Lorebook trống → minh hoạ + nút "+ Thêm Entry" / "Sinh bằng AI" / "Trích xuất từ file". |
| Thông báo | Toast (shadcn) cho thành công/lỗi; Dialog confirm cho xoá/ghi đè. |
| Responsive | ≥1280px tối ưu. <1024px: Sidebar icon-only; Copilot Drawer full-screen overlay. |
| Accessibility | Radix Dialog/Drawer (focus trap); `aria-label` trên icon-button; số hỗ trợ ↑↓. |

---

## 12. Kế hoạch triển khai theo Phase

| Phase | Nội dung | Tiêu chí hoàn thành (DoD) |
|---|---|---|
| **0 — Khởi tạo** | Vite+React+TS+Tailwind+shadcn; toàn bộ types (Phần 3+3A+3B); Zustand skeleton; Dexie DB; AppShell + routing 7 trang; dark theme; `prompts/` folder. | `npm run dev` chạy, 7 trang điều hướng được, project rỗng tạo/lưu IndexedDB. |
| **1 — Settings** | Module 1: CRUD ProxyProfile, scanModels (3 provider), model combobox, GenerationParams (cơ bản+nâng cao), test connection + tool-calling, persist. | Quét model thật; detect tool-calling support; lưu/khôi phục sau reload. |
| **2 — Card Editor** | Module 2: 5 tab (6.1-6.5), macro-insert, `syncMirrorFields()`, raw JSON editor + validate. | Sửa mọi field, reload còn; export JSON đúng schema; `talkativeness` là string. |
| **3 — Lorebook CRUD** | Module 3 tab Danh sách: virtualized list + toolbar, Entry Editor đầy đủ (7.2), drag reorder. | Thêm/sửa/xoá/duplicate/reorder ổn định với ≥200 entry. |
| **4 — Import/Export** | Module 6: auto-detect 3 loại JSON + .txt, converter 2 chiều (10.3), 3 nút export + toggle minify. | Round-trip test: export Lorebook → import lại → dữ liệu khớp 100%. |
| **5 — Regex Lab** | Module 4: list+editor (8.1-8.2), `applyRegex.ts` (8.4), Live Preview `<iframe srcDoc>`. | Preview đúng HTML từ regex thật; strip code-fence tự động. |
| **6 — Batch Generator** | Module 3 tab Batch: form config (7.3.1-7.3.2), system prompt (7.3.3), `tryExtractJsonArray` (6 strategies), `runBatchGeneration` (7.3.5) với progress/pause/stop. | Chạy với proxy thật, 10 entry/batch 3 → ~10 entry mới, không trùng với entry có sẵn. |
| **6.5 — Doc Extract & Wiki** | Module 3 tab Trích Xuất + Cào Wiki: `documentChunker.ts`, `wikiScraper.ts` (Fandom Priority), pipeline vòng lặp (7.4.3, 7.5.1), CORS error handling. | Đọc file .txt 50k ký tự → entries; tải Fandom thành công; CORS rõ ràng. |
| **7 — RAG Engine** | `TFIDFIndex` + `buildRAGContext` (9B) + tích hợp Batch/Wiki/Copilot + RAG Debug Panel. | 500 entries indexed; search "tu luyện" → entry đúng; Batch có RAG context; latency <200ms. |
| **8 — Anti-Dup & Coherence** | `deduplicator.ts` (3 lớp) + `antiSummarization.ts` + `coherenceManager.ts` + tích hợp mọi pipeline + warning trong ActionCard (7H). | Test: 20 entry cùng chủ đề → chỉ entry đầu được tạo; update_entry ngắn <60% → cảnh báo vàng. |
| **9 — Completion Verifier** | `criteria.ts` + `verifier.ts` + `gapDetector.ts` + UI Criteria Editor + coherence AI check (7F). | Test: yêu cầu 3 topic, AI tạo 2 → verifier gọi batch fill-in → 3 topic được phủ. |
| **10 — Fandom Priority** | `buildFandomSearchQueue` + `fetchWikiPageWithFallback` + `FANDOM_TAG_MAP` + UI Priority Display (7G). | Card tag "genshin" → URL đầu thử là `genshin-impact.fandom.com`; fallback Wikipedia khi Fandom fail. |
| **11 — AI Copilot** | Module 5: Chat UI (9.1), 5-mode selector, `agentLoop.ts` (9.5), `handleAction` với auto-execute, ActionCard+DiffView+ThoughtBubble (9.4), Apply/Skip/Undo, system prompt builder (9.3), fallback JSON (9.6). | Lệnh "đổi personality" → diff đúng → Áp dụng → field cập nhật → Hoàn tác OK; MVUZOD mode đúng. |
| **12 — MVUZOD Studio** | `schemaInferencer.ts` (phân tích Lorebook → đề xuất schema) + `SchemaEditorPanel` + `jsonPatchEngine.ts` + `patchExtractor.ts` (XML + fence) + MVUZOD mode Copilot (5 bước) + route `/mvuzod`. **Workflow**: Lorebook đủ entries → AI phân tích → đề xuất schema → user duyệt → tạo 5 entries hệ thống → tạo 2 scripts (MVU import + registerMvuSchema). | Test với card có 30+ entries: `inferSchemaWithAI()` đề xuất đúng enum/record từ nhóm entries; patchExtractor nhận `<UpdateVariable>` và ` ```mvuzod ``` `; patch engine áp dụng clamp/prefault; MVUZOD mode Copilot đi đúng 5 bước. |
| **13 — EJS Script Studio** | `ejsParser.ts` + `ejsRenderer.ts` + `EJSEditor.tsx` + Live Preview + Variable Tree + AI sinh EJS + route `/ejs-studio`. | Nhập EJS template với biến, preview render đúng; lỗi syntax inline; AI sinh template từ schema. |
| **14 — JS Analyzer** | `astParser.ts` (Acorn) + `variableExtractor.ts` + `schemaLinker.ts` + `JSAnalyzerPanel.tsx` trong Card Editor + context injection Copilot (8C). | Script 50 dòng JS → đúng read/write list; biến chưa có schema → gợi ý "Thêm vào Schema"; script context inject vào Copilot khi yêu cầu sửa script. |
| **15 — Hoàn thiện** | Multi-project sidebar (11.2), Snapshot/Lịch sử (11.3), responsive (11.4), error boundaries, AgentStatusBar mọi loop. | Tạo/chuyển/xoá nhiều project ổn định; mọi lỗi (network/parse/validate/CORS) hiện thân thiện, không crash. |

---

## 13. Edge cases & lưu ý quan trọng

### 13.1 — CORS & kết nối Proxy

- Phân biệt: **network/CORS** (`TypeError: Failed to fetch`) vs **lỗi HTTP** (401/429/500).
- **Wiki/Fandom CORS**: Hầu hết Fandom không trả CORS header → browser chặn. Hiển thị rõ:
  *"Không tải được trang wiki do CORS. Giải pháp: (1) Cài extension CORS Unblock, (2) Copy-paste thủ công vào tab Trích Xuất Tài Liệu."*
- Fandom Priority Queue thử nhiều nguồn trước khi báo lỗi CORS.

### 13.2 — Hiệu năng với dữ liệu lớn

- File card tới ~5.9MB / 600+ entries / script >130k ký tự là thực tế đã quan sát.
- Bắt buộc: virtualize entries (`@tanstack/react-virtual`), Zustand selector theo `entry.id`, debounce auto-save 1.5s.
- RAG TFIDFIndex: rebuild sau mỗi entry được thêm — **batch rebuild** sau mỗi 10 entries thay vì từng entry.
- Wiki scraping: giới hạn `wikiText.slice(0, 20000)` mỗi lần inject.
- JS Analyzer: chỉ chạy khi script được mở trong editor, không parse liên tục.

### 13.3 — Tính đúng schema

- `syncMirrorFields(card)` chạy trước mọi lần lưu DB và export.
- `talkativeness`: **STRING** `"0.5"` ở cả root và extensions — không bao giờ là number.
- `extensions.position` đổi → tự cập nhật field `position` theo quy tắc 3.7.
- `extensions.depth`/`role` chỉ hiện UI khi `position===4`; `outlet_name` chỉ khi `position===7` — nhưng **giữ các field này trong object** (không xoá) để không phá schema.
- Import Lorebook standalone → remap id/uid và display_index để không đụng id hiện có.

### 13.4 — Client-Agent Loop safety

- Giới hạn **8 vòng lặp**/lượt chat; cảnh báo khi vượt.
- Mọi action `delete_*` luôn hiện confirm dialog, bất kể toggle "Tự động áp dụng".
- Trước mỗi vòng lặp dài (Batch/Wiki/Doc/Verify): tạo snapshot tự động.
- Document chunks lưu trong component state (không vào cardStore) — tự xoá khi đóng tab.

### 13.5 — Anti-data-loss trong AI

- System prompt cho mọi mode (trừ `discussion`) phải bao gồm Anti-Data-Loss Protocol (Layer 2, 9.3).
- Khi AI trả về `update_entry`: app kiểm tra nếu `data.content.length < originalEntry.content.length * 0.6` → hiện cảnh báo vàng trong ActionCard.
- MVUZOD: `lenient` mode là mặc định — prefault thay vì reject khi AI trả về giá trị sai kiểu.

### 13.6 — An toàn & bảo mật

- API key lưu plaintext localStorage — ghi rõ cảnh báo trong Settings UI.
- HTML preview LUÔN qua `<iframe sandbox="allow-scripts" srcDoc=...>` — tuyệt đối không `dangerouslySetInnerHTML`.
- EJS renderer chạy trong `Function()` sandbox — không có `window`, không có DOM.
- JS Analyzer (Acorn) chỉ **phân tích tĩnh** (static analysis) — không thực thi code.
- Wiki scraping chỉ tải URL mà AI đề xuất từ domain ban đầu user nhập khi multi-page mode OFF.

### 13.7 — Token & JSON parsing

- Token chỉ là **ước lượng** (`Math.ceil(chars/4)`), luôn có dấu `~`.
- `tryExtractJsonArray` có 6 strategies (xem dưới); không bao giờ `JSON.parse` trực tiếp không có try/catch.
- Lỗi 1 batch/1 action không làm crash vòng lặp — log lỗi, tăng `consecutiveErrors`, tiếp tục theo ngưỡng.

```typescript
// src/lib/ai/jsonExtract.ts — tryExtractJsonArray đầy đủ (6 strategies)
export function tryExtractJsonArray(raw: string): AIGeneratedEntry[] | null {
  const attempts = [
    () => JSON.parse(raw),
    () => { const m = raw.match(/```json\s*([\s\S]+?)```/); return m ? JSON.parse(m[1]) : null; },
    () => { const m = raw.match(/```\s*([\s\S]+?)```/); return m ? JSON.parse(m[1]) : null; },
    () => {
      let start=-1, depth=0;
      for (let i=0;i<raw.length;i++) {
        if (raw[i]==="[") { if(depth===0)start=i; depth++; }
        else if (raw[i]==="]") { depth--; if(depth===0&&start!==-1)return JSON.parse(raw.slice(start,i+1)); }
      }
      return null;
    },
    () => { const obj=JSON.parse(raw.match(/\{[\s\S]+\}/)?.[0]??"null"); return obj?.entries??obj?.items??obj?.data??obj?.results??null; },
    () => { const lines=raw.trim().split("\n").filter(l=>l.trim().startsWith("{")); return lines.length>0?lines.map(l=>JSON.parse(l)):null; },
  ];
  for (const attempt of attempts) {
    try {
      const r = attempt();
      if (Array.isArray(r)&&r.length>0) {
        const valid=r.filter(i=>typeof i==="object"&&i!==null&&typeof i.comment==="string"&&Array.isArray(i.keys)&&typeof i.content==="string");
        if (valid.length>0) return valid;
      }
    } catch { /* tiếp tục */ }
  }
  return null;
}
```

### 13.8 — Unicode / Tiếng Việt

- Toàn bộ content/keys/comment hỗ trợ tiếng Việt — `JSON.stringify` JS giữ nguyên UTF-8.
- File export dùng `Blob` + UTF-8 (mặc định).
- Wiki text `slice(0, 20000)` không cắt ngang ký tự Unicode (JS string là UTF-16, an toàn).
- EJS `escapeHtml` không break ký tự có dấu tiếng Việt.

### 13.9 — MVUZOD-specific Edge Cases

- **Schema trước Lorebook**: Nếu user yêu cầu tạo schema khi Lorebook < 20 entries → app cảnh báo rõ: *"Lorebook còn ít. Nên tạo thêm lore/NPC/rules trước."* — không block nhưng recommend.
- **Circular patch**: nếu AI tạo patch loop → giới hạn 1 pass áp dụng, không re-apply.
- **Schema migration**: khi schema thay đổi, `variables` cũ có thể thiếu field mới → `prefault` tự điền khi đọc.
- **EJS runtime error**: lỗi trong EJS template → catch và hiển thị `[EJS Error: ...]`, không crash card.
- **Acorn parse error**: script JS có syntax error → JS Analyzer báo lỗi nhưng không block user lưu script.
- **TFIDFIndex empty**: RAG search trên index rỗng → trả `[]`, không throw.
- **patchExtractor XML vs fence**: nếu AI trả về cả 2 format trong 1 response → chỉ parse XML tags (ưu tiên), bỏ qua fence để tránh duplicate ops.
- **variableKey mismatch**: nếu TavernHelper script dùng key khác (ví dụ `"game_state"` thay vì `"stat_data"`) → EJS Controller sẽ đọc sai → JSAnalyzer phát hiện và cảnh báo trong Analyzer Panel.
- **inferSchemaWithAI timeout**: nếu AI call timeout khi đang inference → fallback sang `buildMinimalSchemaFromReport()` (schema tối giản từ static analysis), không crash.
- **5 entries hệ thống trùng**: nếu user chạy "Tạo 5 Entries Hệ thống" lần 2 → app kiểm tra comment đã tồn tại chưa, hỏi confirm overwrite hay skip.

---

## PHỤ LỤC A — Dependencies đầy đủ (`package.json`)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "dexie": "^3.2.7",
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@uiw/react-codemirror": "^4.22.0",
    "@tanstack/react-virtual": "^3.3.0",
    "lucide-react": "^0.383.0",
    "gpt-tokenizer": "^2.1.2",
    "diff": "^5.2.0",
    "lodash": "^4.17.21",
    "acorn": "^8.11.3",
    "acorn-walk": "^8.3.2",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/lodash": "^4.17.0",
    "@types/acorn": "^4.0.6",
    "@types/diff": "^5.2.1",
    "@types/uuid": "^9.0.8",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

> **Không cần** thêm `ejs` package — EJS parser tự implement để kiểm soát sandbox và tránh Node.js deps.
> **Tùy chọn nâng cao**: `@xenova/transformers` (~80MB WASM) để có real semantic embeddings. Chỉ khi `entries.length > 1000` và hardware hỗ trợ.

---

## PHỤ LỤC B — `cardDefaults.ts`

```typescript
// src/lib/converters/cardDefaults.ts
export function createEmptyCard(): CharacterCardV3 {
  const now = new Date().toISOString();
  return {
    spec: "chara_card_v3",
    spec_version: "3.0",
    name: "New Character",
    description: "",
    personality: "",
    scenario: "",
    first_mes: "",
    mes_example: "",
    creatorcomment: "",
    avatar: "none",
    talkativeness: "0.5",
    fav: false,
    tags: [],
    create_date: now,
    data: {
      name: "New Character",
      description: "",
      personality: "",
      scenario: "",
      first_mes: "",
      mes_example: "",
      creator_notes: "",
      system_prompt: "",
      post_history_instructions: "",
      tags: [],
      creator: "",
      character_version: "1.0",
      alternate_greetings: [],
      extensions: {
        talkativeness: "0.5",
        fav: false,
        world: "",
        depth_prompt: { prompt: "", depth: 4, role: "system" },
        tavern_helper: { scripts: [], variables: {} },
        regex_scripts: [],
        // mvuzod: undefined — chỉ thêm khi người dùng bật MVUZOD Studio
      },
      character_book: { name: "New Character", entries: [] },
    },
  };
}

export function materializeEntry(
  ai: AIGeneratedEntry,
  config: BatchGenConfig | DocExtractConfig | WikiConfig,
  id: number
): LorebookEntry {
  const posExt = config.defaultPosition ?? 0;
  return {
    id,
    keys: ai.keys,
    secondary_keys: ai.secondary_keys ?? [],
    comment: ai.comment,
    content: ai.content,
    constant: ai.constant ?? false,
    selective: ai.selective ?? true,
    insertion_order: ai.insertion_order ?? (config as BatchGenConfig).insertionOrderStart ?? 100,
    enabled: true,
    position: posExt === 0 ? "before_char" : "after_char",
    use_regex: true,
    extensions: {
      ...DEFAULT_ENTRY_EXT,
      position: posExt,
      depth: (config as BatchGenConfig).defaultDepth ?? 4,
      role: (config as BatchGenConfig).defaultRole ?? null,
      outlet_name: posExt === 7 ? "" : "",
      display_index: id,
    },
  };
}

export function syncMirrorFields(card: CharacterCardV3): CharacterCardV3 {
  card.name             = card.data.name;
  card.description      = card.data.description;
  card.personality      = card.data.personality;
  card.scenario         = card.data.scenario;
  card.first_mes        = card.data.first_mes;
  card.mes_example      = card.data.mes_example;
  card.creatorcomment   = card.data.creator_notes;
  card.tags             = [...card.data.tags];
  card.fav              = card.data.extensions.fav;
  // talkativeness phải luôn là STRING
  card.talkativeness    = String(card.data.extensions.talkativeness);
  card.data.extensions.talkativeness = String(card.data.extensions.talkativeness);
  return card;
}
```

---

## PHỤ LỤC C — MVUZOD Template Library chi tiết

| Template ID | Mô tả | Fields chính |
|---|---|---|
| `rpg_basic` | RPG cơ bản (mặc định) | HP, MP, EXP, Cấp, Bạc, Túi_Đồ, Kỹ_Năng, Trạng_Thái |
| `cultivation` | Tu tiên/Tu luyện | Cảnh_Giới, Linh_Lực, Đan_Điền, Kỹ_Pháp, Bí_Kíp, Linh_Thảo |
| `dating_sim` | Hẹn hò/Dating | Tình_Cảm (record NPC→0-100), Sự_Kiện_Đã_Mở, Ngày, Địa_Điểm |
| `dungeon` | Dungeon crawler | HP, Giáp, ATK, DEF, Tầng_Hiện_Tại, Phòng_Đã_Qua, Boss_Đã_Chết |
| `economy` | Kinh tế thương mại | Vàng, Hàng_Hoá, Danh_Tiếng, Hợp_Đồng, Quan_Hệ_NPC |
| `slice_of_life` | Đời thường | Ngày, Thời_Tiết, Tâm_Trạng, Công_Việc, Quan_Hệ, Sở_Thích |
| `mystery` | Trinh thám | Manh_Mối, Nghi_Phạm, Địa_Điểm_Đã_Thăm, Bằng_Chứng |

---

## PHỤ LỤC D — Lời kết cho AI Coding Agent

Build theo đúng thứ tự Phase ở **Phần 12** (15 phases). Khi gặp chi tiết UI nhỏ chưa quy định, tự quyết theo gu thiết kế hiện đại — **nhưng mọi cấu trúc dữ liệu phải bám đúng:**

- **Phần 3**: SillyTavern card schema — format file xuất ra
- **Phần 3A**: AI Action Schema — cách AI giao tiếp với app
- **Phần 3B**: MVUZOD Schema — Zod/JSON Patch cho RPG engine

**5 kiến trúc trung tâm, cần implement trước:**

| # | File | Vai trò |
|---|---|---|
| 1 | `lib/ai/agentLoop.ts` | Client-Agent Loop — tim của app |
| 2 | `lib/ai/actionHandlers.ts` | Xử lý từng AIAction |
| 3 | `lib/mvuzod/schemaInferencer.ts` | Phân tích Lorebook → suy diễn schema |
| 4 | `lib/mvuzod/jsonPatchEngine.ts` | MVUZOD patch engine |
| 5 | `lib/rag/tfidfIndexer.ts` | RAG in-browser |

**Thứ tự dependency:**
- Implement types (Phần 3+3A+3B) trước khi viết bất kỳ component nào
- Implement `agentLoop.ts` + `actionHandlers.ts` trước Copilot UI
- Implement `TFIDFIndex` trước Batch Generator (RAG cần trước batch loop)
- Implement `deduplicator.ts` song song với Batch Generator
- **MVUZOD**: `schemaInferencer.ts` → `jsonPatchEngine.ts` → `patchExtractor.ts` → MVUZOD Studio UI
- EJS, JS Analyzer là independent — implement sau Phase 11

**Thứ tự tạo MVUZOD card (nhắc lại cho coding agent khi implement MVUZOD mode):**
```
1. Lorebook đủ entries (≥20, có lore + NPC + rules)
2. analyzeLorebookForSchema() → report
3. inferSchemaWithAI() → proposedSchema
4. User duyệt schema
5. Tạo 5 entries hệ thống (EJS Controller + 3 mvu_update + initvar)
6. Tạo 2 TavernHelper scripts (MVU import + registerMvuSchema)
```

**Không bao giờ** tạo schema trước khi Lorebook có đủ nội dung.

