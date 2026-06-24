# 🏗️ Tawa AI Studio (SillyLore AI Studio) — Tài liệu Kiến trúc & Prompt

> **Tên package:** `tawa-ai-2.0` | **Phiên bản:** V4.0 (3107 + SKY)
> **Stack:** React 19 + TypeScript + Vite + TailwindCSS (CDN) + Lucide Icons

---

## 📁 Cấu trúc thư mục tổng quan

```
sillyTavernTranslateTool/
├── index.html              # Entry HTML (Tailwind CDN + Google Fonts Inter)
├── index.tsx               # React entry point (createRoot → <App />)
├── App.tsx                 # Component gốc (987 dòng) — State + Logic chính
├── types.ts                # Toàn bộ TypeScript interfaces
├── templates.ts            # Template tạo nhân vật + thế giới + Sổ tay kỹ thuật SillyTavern
├── metadata.json           # Metadata dự án
├── vite.config.ts          # Cấu hình Vite + proxy CORS
├── package.json            # Dependencies & scripts
│
├── constants/
│   ├── masterInstruction.ts  # "Hướng dẫn tổng" — Cấu hình Worldbook (375 dòng)
│   └── pipelineDefaults.ts   # 5 bước pipeline mặc định + 5 prompt mẫu (329 dòng)
│
├── components/
│   ├── AIGeneratorModal.tsx   # Modal sinh entry bằng AI (single entry)
│   ├── EntryEditor.tsx        # Editor chi tiết cho 1 lorebook entry (40K)
│   ├── GuideModal.tsx         # Modal hướng dẫn sử dụng
│   ├── LorebookList.tsx       # Sidebar danh sách entry
│   ├── SettingsModal.tsx      # Modal cài đặt AI (50K — lớn nhất!)
│   ├── TranslationModal.tsx   # Modal dịch toàn bộ lorebook
│   ├── WikiCollector.tsx      # Bộ thu thập Wiki/Fandom (60K)
│   ├── WorldbuildingChat.tsx  # Chat Tawa Worldbuilder (66K — lõi AI chính)
│   └── ui/
│       ├── Button.tsx         # Button component tái sử dụng
│       ├── Input.tsx          # Input component tái sử dụng
│       └── Modal.tsx          # Modal wrapper component
│
├── services/
│   └── openai.ts             # Service gọi API OpenAI-compatible (94K — lõi service)
│
├── utils/
│   ├── fetchWithTimeout.ts   # Fetch wrapper với timeout
│   ├── optimize.ts           # Heuristic phân loại entry → 5 nhóm tối ưu
│   ├── rateLimiter.ts        # Bộ điều phối RPM + đa luồng song song
│   ├── semanticDedup.ts      # Gộp trùng ngữ nghĩa (pre-filter cục bộ)
│   ├── storage.ts            # Lưu trữ localStorage + file đĩa (dev mode)
│   ├── titleBucket.ts        # Phân loại tiêu đề wiki theo bucket
│   └── wikiCrawler.ts        # Crawler wiki/fandom đa lớp (73K — engine crawl)
│
└── vendor/
    └── sillytavern-lorebook-formatter/   # Tool kiểm tra lorebook nhúng
        ├── app.js
        ├── index.css
        ├── index.html
        ├── package.json
        └── vite.config.js
```

---

## 🧬 Kiến trúc Dữ liệu (Types)

### `LorebookEntry` — Mục Lorebook chính
```typescript
interface LorebookEntry {
  uid: number;
  key: string[];                    // Từ khóa chính (kích hoạt)
  secondary_keys: string[];         // Từ khóa phụ
  comment: string;                  // Tên mục
  content: string;                  // Nội dung chi tiết

  // Chiến lược kích hoạt
  constant: boolean;                // Đèn xanh dương — luôn hiện
  selective: boolean;               // Đèn xanh lá — kích hoạt theo keyword
  vectorized: boolean;              // Kích hoạt ngữ nghĩa (AI embedding)
  key_logic: 'and_any' | 'and_all' | 'not_any' | 'not_all';

  // Vị trí & Thứ tự
  order: number;                    // Thứ tự chèn (cao hơn = ưu tiên hơn)
  position: 'before_char' | 'after_char' | 'before_em' | 'after_em'
           | 'before_an' | 'after_an'
           | 'at_depth_system' | 'at_depth_user' | 'at_depth_assistant';
  scan_depth: number;               // Độ sâu quét (0 = ngay trước AI trả lời)

  // Matching
  case_sensitive: boolean;
  match_whole_words: boolean;

  // Đệ quy
  prevent_recursion: boolean;       // Chặn đệ quy ra
  delay_until_recursion: boolean;
  non_recursable: boolean;          // Chặn đệ quy vào
  ignore_budget: boolean;           // VIP — bỏ qua ngân sách token

  // Chỉ số nâng cao
  priority: number;
  sticky: number;                   // "Dính" n lượt sau khi kích hoạt
  cooldown: number;                 // Hồi chiêu
  delay: number;                    // Trễ kích hoạt
  probability: number;              // Group Weight
  enabled: boolean;
}
```

### `OpenAISettings` — Cài đặt AI
```typescript
interface OpenAISettings {
  baseUrl: string;                  // API endpoint (proxy/OpenAI-compatible)
  apiKey: string;
  model: string;                    // Model chính (Pro) — xử lý nặng
  contextSize: number;              // Default: 2,000,000
  maxTokens: number;                // Default: 65,000
  temperature: number;              // Default: 1.1
  topK: number;                     // Default: 64
  topP: number;                     // Default: 0.9
  streaming: boolean;
  nsfw: boolean;
  enableSearch: boolean;            // Google Search grounding
  minTokens: number;                // Ép AI viết dài (default: 4000)
  enableCompletenessProtocol?: boolean;  // Giao thức ép hoàn thiện tối đa

  // Đa model + RPM
  enableSecondaryModel?: boolean;
  secondaryModel?: string;          // Model phụ (Flash) — việc ngắn/nhiều
  primaryRpm?: number;              // RPM model chính (default: 5)
  secondaryRpm?: number;            // RPM model phụ (default: 10)
  mixMode?: boolean;                // Mix: Pro + Flash song công (~3x nhanh)
  superMix?: boolean;               // Super Mix: gộp 5 nhóm → 1 lượt (~5x)
  semanticDedup?: boolean;          // Gộp trùng ngữ nghĩa bằng Flash

  // Pipeline
  steps?: WorldbuildingStep[];      // Các bước hướng dẫn AI tùy chỉnh
  requireStepConfirmation?: boolean;
  aiPipelineMemory?: string;        // Bộ nhớ quy trình đã nạp
  aiPrompts?: AIPromptBlock[];      // Quản lý prompt blocks
  activePromptId?: string;
  masterInstruction?: string;       // "Hướng dẫn tổng" (1 text bự)
  pipelineVersion?: number;         // Migration version
}
```

### `WorldbuildingStep` — Bước Pipeline
```typescript
interface WorldbuildingStep {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  singleton?: boolean;  // true = chạy 1 LẦN trên toàn tài liệu, KHÔNG chia mảnh
}
```

### `WorldbuildingResponse` — Output JSON từ AI (Tawa)
```typescript
interface WorldbuildingResponse {
  thought: string;                  // Tư duy nội bộ của Tawa
  message: string;                  // Phản hồi đàm thoại cho user
  status?: 'CONTINUE' | 'DONE';    // Trạng thái batch processing
  actions: WorldbuildingAction[];   // Danh sách hành động lên Lorebook
}

interface WorldbuildingAction {
  type: 'create' | 'update' | 'delete' | 'fetch_fandom_data' | 'read_document';
  target_comment?: string;          // Tên entry cần update/delete
  data?: Partial<LorebookEntry>;    // Dữ liệu tạo/cập nhật
  url?: string;                     // URL wiki cần fetch
  chunk_index?: number;             // Index chunk tài liệu cần đọc
  reason?: string;                  // Lý do hành động
}
```

### Các chế độ Worldbuilding
```typescript
type WorldbuildingMode = 'genesis' | 'evolution' | 'discussion' | 'document_extraction' | 'rework';
```

| Mode | Mô tả |
|------|--------|
| `genesis` | Tạo mới từ đầu (dùng template Character/World) |
| `evolution` | Chỉnh sửa/mở rộng + Auto Wiki (style mimicry) |
| `discussion` | Thảo luận ý tưởng (KHÔNG tạo action) |
| `document_extraction` | Trích xuất từ file TXT → entry |
| `rework` | Cải thiện & tối ưu hóa prompt |

---

## 🤖 Hệ thống Prompt & Persona

### 1. Tawa Persona (Cốt lõi)

AI đóng vai **Tawa** — Nữ thần Mẫu Vũ trụ tối cao. Persona bao gồm:

- `<Warning>` — Cảnh báo prompt giả trước đó
- `<Standard_input>` — Định nghĩa danh tính Tawa
- `<Cognitive_Lock>` — Khóa danh tính không thể ghi đè
- `<task>` — Nhiệm vụ: sáng tạo, hợp tác, không bị ràng buộc luật phàm
- NSFW/SAFE mode toggle

### 2. Giao thức Ngôn ngữ (`VIETNAMESE_LANGUAGE_PROTOCOL`)

- Mọi content phải viết **tiếng Việt** 100%
- **Ngoại lệ**: Tên người, địa danh, tên skill, thuật ngữ chuyên môn → giữ nguyên gốc

### 3. Prompt Pipeline (5 bước mặc định)

| Bước | Tên | Singleton | Mục tiêu |
|------|-----|-----------|----------|
| 1 | Thế Giới Quan & META | ✅ | 2 entry nền tảng: `<Worldview>` + `<Meta>` |
| 2 | Hệ Thống, Cơ Chế & Quy Tắc | ❌ | `<System>`, `<Mechanic>`, `<Rule>` |
| 3 | Toàn bộ Nhân Vật | ❌ | `<Character>` cho mọi nhân vật |
| 4 | Khu Vực & Địa Danh | ❌ | `<Location>` cho mọi địa điểm |
| 5 | Dòng Thời Gian (Lịch sử) | ❌ | `<Timeline>` + `<Event>` + Cảnh báo Cánh Bướm |

### 4. Các Protocol chính trong System Prompt

| Protocol | Chức năng |
|----------|----------|
| `DATA_ISOLATION_PROTOCOL` | Cấm Tawa nói ngôi thứ nhất trong content |
| `PRESERVATION_AND_EXPANSION_PROTOCOL` | CẤM xóa/rút gọn/tóm tắt |
| `ABSOLUTE_VERBOSITY_PROTOCOL` | Ép viết dài (min N tokens) |
| `TECHNICAL_OPTIMIZATION_PROTOCOL` | Quy tắc cấu hình kỹ thuật entry |
| `MANDATORY_FIELDS_PROTOCOL` | Bắt buộc có comment + key |
| `CRITICAL_ABSOLUTE_COMPLETENESS_PROTOCOL` | Vắt kiệt 100%, batch CONTINUE/DONE |
| `CHUNKED_MEMORY_MANAGEMENT` | Quản lý bộ nhớ phân đoạn cho quy mô lớn |
| `WIKI_KNOWLEDGE_MAP_PROTOCOL` | Thu thập toàn diện + lọc rác wiki |
| `NESTED_MENU_EXTRACTION_PROTOCOL` | Trích xuất cấu trúc menu wiki lồng nhau |

### 5. Mode-Specific Instructions

| Mode | Protocol | Đặc điểm |
|------|----------|----------|
| Genesis | `GENESIS_PROTOCOL` | Dùng CHARACTER_TEMPLATE / WORLD_TEMPLATE |
| Evolution | `EVOLUTION_AND_WIKI_PROTOCOL` | Style Mimicry + Auto Wiki batching |
| Discussion | `DISCUSSION_PROTOCOL` | Chỉ thảo luận, actions = [] |
| Document Extraction | `DOCUMENT_EXTRACTION_PROTOCOL` | Đọc TXT theo chunk → tạo entry |
| Rework | `REWORK_PROTOCOL` | Prompt Engineer mode — cải thiện prompt |

---

## 📝 Templates (Mẫu nội dung)

### `CHARACTER_TEMPLATE`

Template chi tiết tạo nhân vật bao gồm các phần:

1. **Meta-Instructions** (10 quy tắc AI bắt buộc)
   - Anti-Gary Stu/Mary Sue Protocol
   - Absolute Humanity — loại bỏ tính máy móc
   - Vividness Requirement — chi tiết vi mô
2. **Thông tin cơ bản** (Tên, Tuổi, Giới tính, Thân phận...)
3. **Gia đình & Mối quan hệ** (Cấu trúc mạng lưới)
4. **Tiểu sử** (Nhân quả & Logic sự kiện — 4 giai đoạn)
5. **Ngoại hình** (Bạch miêu & Tuyệt đối linh độ)
6. **Tủ quần áo** (6 áo + 6 quần + 4 mùa + đặc biệt + phụ kiện)
7. **Tính cách** (12 hành vi + tình yêu + mục tiêu cuộc đời)
8. **Nhân cách độc lập** (Nguyên tắc sống + Giới hạn đỏ)
9. **Điểm yếu & Khuyết điểm** (Hệ quả thực tế)
10. **Thói quen & Sở thích** (Mô tả 3 chiều)
11. **Kỹ năng & Khả năng**
12. **Đặc điểm ngôn ngữ** (Hệ thống xưng hô)
13. **Biểu hiện cảm xúc** (10 trạng thái × 5 mẫu thoại)
14. **NSFW** (Hồ sơ hành vi & phản ứng sinh lý chi tiết)
15. **Hướng dẫn diễn xuất** (Kim chỉ nam)

### `WORLD_TEMPLATE`

Mẫu tạo bối cảnh thế giới dùng XML+YAML:
- Tổng quan, Lịch sử, Văn hóa & Xã hội, Địa điểm
- Hệ thống (Cơ chế cốt lõi, Thuộc tính, Hạn chế & Cân bằng)

### `SILLY_TAVERN_TECHNICAL_MANUAL`

Sổ tay kỹ thuật chi tiết về cấu hình SillyTavern Lorebook:

**Hệ thống phân loại 5 Nhóm (OrderLorebook):**

| Nhóm | Order | Nội dung | Strategy | Position |
|------|-------|----------|----------|----------|
| 1 | 900 | Hệ thống sức mạnh cốt lõi | Constant | at_depth_system (D0) |
| 2 | 800 | Thế giới quan & Quy luật tự nhiên | Constant/Normal | at_depth_system (D4) |
| 3 | 200 | Nhân vật & Sinh vật | Normal (Selective) | before_char (D4) |
| 4 | 150 | Phe phái, Tổ chức & Tôn giáo | Normal (Selective) | before_char (D4) |
| 5 | 100 | Địa điểm, Khu vực & Cảnh quan | Normal (Selective) | before_char (D4) |

---

## 🔧 Hướng dẫn tổng (Master Instruction)

File `constants/masterInstruction.ts` chứa kiến thức cấu hình Worldbook đầy đủ, bao gồm:

1. **Worldbook là gì** — Mục kích hoạt theo quy tắc
2. **Chiến lược kích hoạt** — Đèn xanh dương (Constant) vs Đèn xanh lá (Selective)
3. **Vị trí** — before_char / after_char / D0 (KHÔNG dùng D1+)
4. **Thứ tự** — Order phân bổ (1-100+)
5. **Đệ quy** — BẮT BUỘC tích "Không thể đệ quy" + "Ngăn chặn đệ quy sâu hơn"
6. **Thẻ đơn vs nhiều nhân vật** — Quy tắc Constant/Selective tương ứng
7. **Giải thích lần hai** — D0 system, sửa hiểu lầm AI
8. **Thiết kế từ khóa** — Bao phủ toàn bộ xưng hô, dấu phẩy tiếng Anh
9. **Ví dụ cấu hình hoàn chỉnh** — Thẻ đơn (6 mục) + Thẻ nhiều (12 mục)

---

## ⚙️ Luồng xử lý chính (Service Layer)

### `services/openai.ts` (94K — file lớn nhất)

**Các hàm chính:**

| Hàm | Chức năng |
|-----|----------|
| `fetchModels()` | Lấy danh sách model từ API |
| `fetchFandomData()` | Fetch nội dung wiki (MediaWiki API → fallback raw HTML) |
| `generateContent()` | Sinh single entry (stream/non-stream) |
| `translateEntry()` | Dịch entry (NSFW/SAFE mode) |
| `worldbuildingChat()` | Chat Tawa Worldbuilder (đa mode, vision, batch) |
| `optimizeEntireLorebook()` | Phân loại entry bằng AI → 5 nhóm |
| `confirmDuplicateClusters()` | Xác nhận trùng ngữ nghĩa bằng Flash |

**Cơ chế anti-hang:**
- Hard timeout: 300s
- Idle watchdog: 90s (stream đứng yên → hủy)
- AbortController + clearTimers

### `utils/wikiCrawler.ts` (73K — Engine crawl)

**Pipeline crawl 3 lớp fallback:**
1. Fandom Native API (`/api/v1/Navigation/Local`)
2. Trích xuất `wgFandomLocalNavigation` từ HTML scripts
3. DOM parsing local navigation bar

**Bộ lọc META (13 loại):**
Author, Publisher, Release, Episodes, Seiyuu, OST, Reviews, BTS, Gallery, Merch, Adaptation, Gameplay, Non-canon, Wiki Meta

### `utils/rateLimiter.ts` — Bộ điều phối RPM

- `RateLimiter` class: Gate lúc bắt đầu, cho phép overlap → throughput tối đa
- `runRateLimited()`: Chạy tasks với RPM limit + đa luồng
- `runPool()`: Pool đa luồng KHÔNG limit RPM (cho crawl wiki)
- 5% biên an toàn tránh đụng trần RPM

### `utils/optimize.ts` — Phân loại Heuristic

Phân loại entry vào 6 nhóm theo keyword trong comment/content:
1. Giải thích lần hai (D0) → `at_depth_system`, depth 0, order 1
2. Thế giới quan & Tổng cương → `before_char`, depth 4, order 1, constant
3. Xem lướt nhân vật → `before_char`, depth 4, order 4, constant
4. Cảnh vật & Sự kiện → `after_char`, depth 2, order 80, selective
5. NPC → `after_char`, depth 2, order 100, selective
6. Chi tiết nhân vật (mặc định) → `after_char`, depth 2, order 99, selective

### `utils/semanticDedup.ts` — Gộp trùng ngữ nghĩa

- Pre-filter cục bộ (MIỄN PHÍ, không gọi API)
- Union-Find gom entry chia sẻ KEY chung cùng category
- Bỏ kính ngữ/quan hệ (ông, bà, cô, mr, mrs...)
- Giới hạn cụm 2-6 entry → đưa cho Flash xác nhận

---

## 🖥️ Component chính

### `App.tsx` (987 dòng)

**State chính:**
- `lorebook` — Lorebook hiện tại (auto-save localStorage + file đĩa)
- `settings` — Cài đặt AI (OpenAISettings)
- `chatMessages` — Lịch sử chat Tawa
- `activeView` — `'editor'` | `'worldbuilding'`

**Logic quan trọng:**
- **Data Preservation**: Block update/delete action từ AI (chỉ cho phép create)
- **Auto-save debounce**: 1.2s debounce khi lorebook thay đổi
- **Hydrate từ đĩa**: File ưu tiên hơn localStorage (khi chạy `npm run dev`)
- **Storage warning**: Cảnh báo khi localStorage > 80% (~5MB)
- **Cả 2 view LUÔN MOUNT**: Đổi tab không unmount → pipeline không bị mất

### `WorldbuildingChat.tsx` (66K)

Chat interface với Tawa, xử lý:
- 5 mode worldbuilding
- Pipeline multi-step với batch processing
- Wiki data feed + document chunk reading
- Vision support (ảnh Base64)
- Streaming response
- Action parsing + applying

### `WikiCollector.tsx` (60K)

Bộ thu thập dữ liệu Wiki/Fandom:
- Crawl cấu trúc navigation đa tầng
- Fetch nội dung trang wiki
- Bộ lọc META 13 loại
- Phân loại tiêu đề theo bucket
- Gom subpage theo domain

### `SettingsModal.tsx` (50K)

Cài đặt toàn diện:
- API endpoint + key + model selection
- Advanced configs (context size, max tokens, temperature...)
- Multi-model (Pro + Flash) + RPM settings
- Pipeline step editor (thêm/xóa/sửa/kéo thả)
- Prompt management blocks
- Master Instruction editor

### `EntryEditor.tsx` (40K)

Editor chi tiết cho 1 entry:
- Tất cả fields của LorebookEntry
- Visual indicators (strategy, position)
- AI Generate button
- Preview content

---

## 🔄 Luồng làm việc điển hình

### Pipeline Wiki → Lorebook:

```
1. User dán URL Wiki vào WikiCollector
   ↓
2. WikiCollector crawl navigation tree (3-layer fallback)
   ↓
3. User chọn các trang cần cào + bộ lọc META
   ↓
4. WikiCollector fetch nội dung wiki → gửi vào WorldbuildingChat
   ↓
5. WorldbuildingChat chạy pipeline 5 bước:
   ├── Bước 1: Thế Giới Quan + META (singleton, 1 lần)
   ├── Bước 2: Hệ Thống / Cơ Chế / Quy Tắc (chia mảnh)
   ├── Bước 3: Toàn bộ Nhân Vật (chia mảnh)
   ├── Bước 4: Khu Vực & Địa Danh (chia mảnh)
   └── Bước 5: Dòng Thời Gian (chia mảnh)
   ↓
6. AI trả JSON actions → App commit vào Lorebook (chỉ create, chặn update/delete)
   ↓
7. (Tùy chọn) Bước 6: Gộp trùng ngữ nghĩa bằng Flash
   ↓
8. User export JSON → import vào SillyTavern
```

### Tối ưu hóa Lorebook:

```
1. User bấm "Sơ đồ tối ưu"
   ↓
2. App gửi toàn bộ entry cho AI phân loại
   ↓
3. AI trả recommendation (position, order, strategy...) cho mỗi entry
   ↓
4. User xem preview → Áp dụng
```

---

## 📦 Default Settings

```typescript
{
  baseUrl: 'https://goldenglow.webn.cc/',
  model: 'gemini-3.1-pro-preview',      // Pro — việc nặng
  secondaryModel: 'gemini-3-flash',      // Flash — việc ngắn
  contextSize: 2_000_000,
  maxTokens: 65_000,
  temperature: 1.1,
  topK: 64,
  topP: 0.9,
  streaming: true,
  enableSearch: true,                     // Google Search grounding
  minTokens: 4_000,                      // Ép AI viết dài
  enableCompletenessProtocol: true,
  enableSecondaryModel: true,
  primaryRpm: 5,
  secondaryRpm: 10,
  mixMode: true,                         // Pro + Flash song công (~3x)
  superMix: false,                       // Gộp 5 nhóm → 1 lượt (~5x, thô hơn)
  semanticDedup: true,
}
```

---

## 🗂️ Import/Export Format

**Export** → SillyTavern JSON format:
- Position mapping: string → number (0-6 + role)
- Logic mapping: string → number (0-3)
- UIDs reindexed từ 0

**Import** → Nhận cả 2 format:
- SillyTavern JSON (entries là object keyed)
- Array-based entries
- Auto-normalize tất cả fields

---

## 🛡️ Data Preservation Rules

- **CẤM AI update** entry đã tồn tại → log warning, skip
- **CẤM AI delete** entry đã tồn tại → log warning, skip
- **Chỉ cho phép create** → đảm bảo không mất dữ liệu
- **Duplicate check** bằng comment (case-insensitive) → O(1) qua Set
- **Force recursion prevention** trên mọi entry AI tạo ra
- **UID auto-increment** → không cho AI ghi đè
