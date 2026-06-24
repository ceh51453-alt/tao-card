/**
 * Mode-specific instructions — spec Phần 9.3 Layer 4
 * + modeRegex.ts (mode regex) + modeMVUZOD.ts (spec 9C)
 */

import { REGEX_COPILOT_PROMPT } from './modeRegex';
import { MVUZOD_MODE_INSTRUCTIONS } from './modeMVUZOD';

export const MODE_GENESIS = `=== CHẾ ĐỘ KHỞI TẠO (Genesis) ===
Tạo cấu trúc ĐÚNG ngay từ đầu.
HỎI VÀ PHÂN LOẠI: Phân tích xem đây là dự án tạo "Thẻ Nhân Vật" hay "Thẻ Thế Giới/Thẻ Game RPG".
- Nếu là Thẻ Thế Giới/Game RPG: Tập trung ưu tiên tạo các entry về Worldview (Thế giới quan), Cơ chế, Quy tắc hệ thống, NPC và chuẩn bị cấu trúc cho Regex/Biến số (MVU). Tuyệt đối không sa đà vào viết miêu tả tính cách cá nhân.
- Nếu là Thẻ Nhân Vật: Tạo cấu trúc nhân vật chuẩn.
Ưu tiên create_entry, nội dung đầy đủ theo chuẩn SillyTavern. Hỏi rõ chi tiết nếu mơ hồ.`;

export const MODE_EVOLUTION = `=== CHẾ ĐỘ MỞ RỘNG (Evolution) ===
Style Mimicry: phân tích phong cách viết của entries hiện tại (độ dài, cấu trúc, văn phong)
và bắt chước để entries mới nhất quán.
Dùng fetch_fandom_data + Fandom Priority khi cần tra cứu dữ liệu wiki.`;

export const MODE_DOC_EXTRACT = `=== CHẾ ĐỘ TRÍCH XUẤT TÀI LIỆU (Document Extraction) ===
Đọc từng chunk qua read_document. CONTINUE sau mỗi chunk cho đến END OF DOCUMENT.
KHÔNG bỏ sót thông tin quan trọng — thà tạo nhiều entry nhỏ hơn ít entry lớn.
KHÔNG tóm tắt làm mất chi tiết — ghi đầy đủ số liệu, tên riêng, mô tả cụ thể.`;

export const MODE_DISCUSSION = `=== CHẾ ĐỘ THẢO LUẬN (Discussion) ===
CHỈ trò chuyện. actions PHẢI là []. Không gọi bất kỳ tool nào.
Trả lời câu hỏi, thảo luận ý tưởng, đề xuất cấu trúc.`;

export const MODE_INSTRUCTIONS: Record<string, string> = {
  genesis: MODE_GENESIS,
  evolution: MODE_EVOLUTION,
  document_extraction: MODE_DOC_EXTRACT,
  discussion: MODE_DISCUSSION,
  mvuzod: MVUZOD_MODE_INSTRUCTIONS,
  regex: REGEX_COPILOT_PROMPT,
};
