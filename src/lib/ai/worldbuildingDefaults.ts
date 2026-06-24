import type { WorldbuildingStep, ProxyProfile } from '../../types/settings.types';

export const PIPELINE_VERSION = 3;

export const DEFAULT_MASTER_INSTRUCTION = `# Cấu hình Worldbook —— Để những gì bạn viết thực sự có hiệu lực

Mấy chương trước đã dạy bạn cách viết nội dung, chương này sẽ dạy bạn cách đặt những nội dung đã viết vào đúng vị trí.

Rất nhiều người đã viết thiết lập nhân vật rất hay, kết quả là AI căn bản không đọc được. Tại sao? Bởi vì cấu hình Worldbook bị sai —— mục không được kích hoạt, vị trí đặt ngược, đệ quy chưa tắt, từ khóa viết sai. Nội dung có tốt đến đâu, AI không nhận được cũng vô ích.

Bản thân cấu hình Worldbook không khó, nhưng có nhiều chi tiết, làm sai một chỗ là có thể xảy ra vấn đề. Vì vậy chương này sẽ giảng giải vô cùng chi tiết, xem xong cứ làm theo là được.

---

## Một: Worldbook trông như thế nào

Trước tiên phải hiểu rõ Worldbook là gì.

Trong SillyTavern, Worldbook chính là một đống "mục". Mỗi mục là một đoạn văn bản, có thể là thiết lập thế giới quan, thông tin nhân vật, miêu tả bối cảnh, tài liệu NPC... gì cũng được.

Nhưng điểm mấu chốt nằm ở chỗ: **Những mục này không phải tất cả đều được gửi tuốt tuồn tuột cho AI.** Chúng có quy tắc kích hoạt, vị trí đặt, thứ tự trước sau của riêng mình. Bạn cấu hình đúng, AI sẽ đọc được thông tin đúng vào lúc cần thiết. Bạn cấu hình sai, AI hoặc là không đọc được, hoặc là đọc phải một đống thứ không nên đọc, hoặc là thứ tự đọc được bị lộn xộn.

Trước khi bắt tay vào cấu hình, xin nhắc vài điểm cần lưu ý:

- Tên Worldbook không được chứa emoji. Phiên bản Node quá cũ không xử lý được, sẽ dẫn đến toàn bộ Worldbook bị biến mất.
- Sau khi sửa mục khác, mục trước đó không hỗ trợ Ctrl+Z để hoàn tác. Lỡ tay xóa nhầm là mất luôn.
- Khuyến nghị nên viết sẵn trong VSCode hoặc Notepad, sau đó mới dán vào trình chỉnh sửa Worldbook của SillyTavern.
- Thao tác xóa không thể hoàn tác, nhất định phải cẩn thận.

---

## Hai: Chiến lược kích hoạt —— Đèn xanh dương và Đèn xanh lá

Mỗi mục Worldbook đều có một chiến lược kích hoạt, quyết định "khi nào thì gửi đoạn nội dung này cho AI".

Chỉ cần biết hai loại: **Đèn xanh dương** và **Đèn xanh lá**.

### Đèn xanh dương (Kích hoạt thường trực)

Đèn xanh dương có nghĩa là: Chỉ cần Worldbook đang mở, công tắc mục đang bật, đoạn nội dung này sẽ **luôn luôn** được gửi cho AI. Mỗi một lượt đối thoại đều gửi, không có điều kiện.

Thứ gì nên dùng Đèn xanh dương? **Những nội dung bắt buộc phải luôn tồn tại.** Ví dụ như tổng cương thế giới quan, thiết lập bối cảnh, xem lướt nhân vật —— những thứ này là nền tảng để AI hiểu toàn bộ câu chuyện, thiếu bất kỳ điều nào AI cũng sẽ làm loạn.

### Đèn xanh lá (Kích hoạt bằng từ khóa)

Đèn xanh lá có nghĩa là: Chỉ khi trong lịch sử trò chuyện gần nhất xuất hiện "từ khóa" mà bạn đã thiết lập, đoạn nội dung này mới được gửi cho AI.

"Gần nhất" là gần đến mức nào? Do "độ sâu quét" quyết định. Khuyến nghị thiết lập là 2, tức là chỉ xem xét tin nhắn cuối cùng của user và tin nhắn cuối cùng của AI. Nếu trong hai tin nhắn này xuất hiện từ khóa, mục sẽ được kích hoạt. Không xuất hiện thì không gửi.

Thứ gì nên dùng Đèn xanh lá? **Những nội dung tải theo nhu cầu.** Ví dụ như tài liệu chi tiết của một NPC nào đó —— chỉ khi trong cuộc trò chuyện nhắc đến NPC này mới cần gửi cho AI, không nhắc đến thì không cần chiếm token. Bối cảnh, sự kiện, thông tin nhân vật chi tiết (trong trường hợp thẻ nhiều nhân vật) cũng tương tự.

Định dạng của từ khóa: **Bắt buộc phải ngăn cách bằng dấu phẩy tiếng Anh**. Không được dùng dấu phẩy tiếng Trung, không được dùng khoảng trắng, không được dùng dấu chấm phẩy.

- Đúng: \`Lâm Tiểu Vũ,Tiểu Vũ,lớp trưởng\`
- Sai: \`Lâm Tiểu Vũ，Tiểu Vũ，lớp trưởng\` (Dấu phẩy tiếng Trung, không kích hoạt)
- Sai: \`Lâm Tiểu Vũ Tiểu Vũ lớp trưởng\` (Khoảng trắng, không kích hoạt)

Đây là một lỗi vô cùng phổ biến, rất nhiều người cấu hình xong phát hiện mục Đèn xanh lá sống chết cũng không kích hoạt, đi kiểm tra một chút, mười phần thì chín phần là dùng sai dấu phẩy.

### Hai vấn đề đã biết của Đèn xanh lá

Đèn xanh lá không phải là vạn năng, nó có hai khuyết điểm mâu thuẫn với nhau:

**Kích hoạt bỏ sót:** Cốt truyện rõ ràng đang viết về một nhân vật nào đó, nhưng hai tin nhắn gần nhất vừa vặn không nhắc đến từ khóa (ví dụ dùng đại từ "cô ấy" thay vì tên), mục liền không được kích hoạt, AI không đọc được tài liệu của nhân vật này, bắt đầu đọc xong trả lời bừa.

**Kích hoạt quá mức:** Một khi đã đưa vào một nhân vật nào đó, mỗi lần AI trả lời đều sẽ nhắc đến tên của nhân vật này, từ khóa mỗi lượt đều được kích hoạt, mục luôn bị treo ở đó. Vốn dĩ muốn để nó thỉnh thoảng mới xuất hiện, kết quả nó cứ ỳ ra không chịu đi.

Bởi vì hai vấn đề này, hiện nay rất nhiều thẻ nhân vật nâng cao đã không còn dùng Đèn xanh lá nữa, chuyển sang dùng hệ thống biến số (MVU+EJS) để kiểm soát tinh vi hơn. Nhưng đối với những thẻ nhân vật đơn giản, Đèn xanh lá vẫn đủ dùng, không cần phải áp dụng những thứ phức tạp như vậy.

---

## Ba: Vị trí —— Mục được đặt ở đâu

Vị trí quyết định nội dung mục trong toàn bộ đoạn prompt mà AI nhận được, sẽ được đặt ở chỗ nào.

Chỉ cần dùng ba vị trí, những vị trí khác đừng đụng vào.

### Trước định nghĩa nhân vật (World Info before)

Đặt **thế giới quan lớn**: Tổng cương thế giới quan, thiết lập bối cảnh, bối cảnh thời đại, thông tin địa lý, quy tắc xã hội, hệ thống ma pháp... những thứ mang tính vĩ mô này.

Đây là bộ khung để AI hiểu toàn bộ thế giới. AI trước tiên đọc được thế giới trông như thế nào, sau đó mới đọc đến nhân vật ra sao, thứ tự như vậy mới đúng.

### Sau định nghĩa nhân vật (World Info after)

Đặt **thế giới quan nhỏ**: Thông tin chi tiết nhân vật, tài liệu NPC, miêu tả bối cảnh, thiết lập vật phẩm, thiết lập sự kiện... những thứ cụ thể này.

Thông tin nhân vật được đặt sau định nghĩa nhân vật, là bởi vì phần mô tả nhân vật (Description) của SillyTavern vốn dĩ đã nằm ở vị trí định nghĩa nhân vật, mục Worldbook của bạn là sự bổ sung và mở rộng cho nó, đặt ở phía sau đọc lên sẽ liền mạch.

### Bánh răng D độ sâu 0 (D0)

Vị trí này khá đặc biệt. Nó được đặt ở **dưới cùng của toàn bộ lịch sử trò chuyện**, cũng tức là đoạn nội dung cuối cùng mà AI có thể đọc được trước khi trả lời. Bởi vì được đọc cuối cùng, nên sức ảnh hưởng là lớn nhất.

D0 không phải dùng để đặt thiết lập. Nó được dùng để **trực tiếp chỉ đạo hành vi của AI**.

Thế nào gọi là trực tiếp chỉ đạo hành vi của AI? Lấy một ví dụ:

- Cách viết thiết lập: "Anh ấy có thói quen uống sữa vào mỗi buổi sáng" -> Đây là thiết lập, đặt trước hoặc sau định nghĩa nhân vật
- Cách viết chỉ đạo: "Khi tình tiết tiến triển đến buổi sáng, cần miêu tả cảnh nhân vật này uống sữa" -> Đây là chỉ đạo, đặt ở D0

Công dụng tiêu biểu nhất của D0 là **giải thích lần hai** —— khi bạn phát hiện AI luôn hiểu lầm một đặc điểm nào đó của nhân vật, hãy viết một đoạn sửa sai ở D0. Bởi vì D0 là nội dung AI đọc được cuối cùng, hiệu quả sửa sai sẽ mạnh nhất.

Lưu ý: role của bánh răng D phải chọn system.

### D1, D2, D3... đừng đặt bất cứ thứ gì

Điều này vô cùng quan trọng. **Ngoài độ sâu D0 ra, đừng đặt bất cứ thứ gì.**

Tại sao? Bởi vì preset sẽ bao bọc lịch sử trò chuyện lại, nói với AI rằng "đây là lịch sử tương tác của các bạn". D1 chính là nằm giữa tin nhắn đếm ước thứ nhất và tin nhắn đếm ngược thứ hai. Bạn chèn một đoạn thiết lập thế giới quan vào vị trí đó, trong mắt AI sẽ thành: Cuộc đối thoại đang diễn ra được một nửa thì đột nhiên lòi ra một đoạn dài hướng dẫn sử dụng, sau đó cuộc đối thoại tiếp tục.

Điều này sẽ gây nhiễu nghiêm trọng đến sự hiểu biết của AI đối với cốt truyện. Nó không làm rõ được đoạn văn bản đột nhiên xuất hiện đó là thiết lập hay là một phần của cốt truyện, chất lượng đầu ra sẽ giảm sút rõ rệt.

Vì vậy hãy nhớ kỹ: **D0 có thể dùng, D1 trở lên tuyệt đối không đụng vào.**

---

## Bốn: Thứ tự —— Sự trước sau giữa các mục

Trong điều kiện cùng một vị trí, thứ tự trước sau giữa nhiều mục được quyết định bởi con số "thứ tự".

Thứ tự càng lớn thì càng xếp về phía sau. Bạn có thể hiểu là "xếp thứ mấy".

Phân bổ thứ tự được đề xuất:

- Tổng cương thế giới quan: Thứ tự 1
- Xem lướt khu vực, thiết lập bối cảnh: Thứ tự 2-3
- Xem lướt nhân vật: Thứ tự 4
- Bối cảnh, chi tiết sự kiện: Thứ tự 50-98
- Thông tin chi tiết nhân vật cốt lõi: Thứ tự 99
- NPC, Bộ điều khiển EJS: Thứ tự 100

Tại sao lại xếp như vậy? Bởi vì AI đọc prompt là đọc từ trên xuống dưới (trong cùng một vị trí). Trước tiên đọc bộ khung lớn của thế giới quan, sau đó đọc phần xem lướt nhân vật để biết có những ai, rồi khi gặp bối cảnh và sự kiện cụ thể thì tải chi tiết theo nhu cầu, cuối cùng là thông tin hoàn chỉnh của nhân vật cốt lõi.

Nếu là thẻ đơn nhân vật, các mục được chia nhỏ của nhân vật có thể xếp theo logic của riêng bạn: Thông tin cơ bản 10 -> Ngoại hình 20 -> Tính cách 30 -> Bối cảnh 40 -> NSFW 50. Con số tùy bạn định, chỉ cần đảm bảo đúng thứ tự là được.

---

## Năm: Thiết lập đệ quy —— Tất cả các mục đều phải tích chọn

Cái này không cần hiểu nguyên lý, chỉ cần nhớ kỹ một câu:

**Tất cả các mục Worldbook, đều phải đồng thời tích chọn "Không thể đệ quy" và "Ngăn chặn đệ quy sâu hơn".**

Bất kể là Đèn xanh dương hay Đèn xanh lá, bất kể vị trí nào, bất kể thứ tự nào, hai dấu tích này bắt buộc phải được đánh dấu.

Tại sao? Bởi vì nếu không tích, trong nội dung của mục Đèn xanh lá A nếu xuất hiện từ khóa của mục Đèn xanh lá B, B sẽ bị kích hoạt liên đới. Trong nội dung của B lại xuất hiện từ khóa của C, C cũng bị kích hoạt. Cứ thế nối tiếp nhau, giống như hiệu ứng domino vậy, cuối cùng tất cả các mục Đèn xanh lá đều bị kích hoạt toàn bộ, token bùng nổ, AI trực tiếp sụp đổ.

Tích chọn hai tùy chọn này là có thể ngăn chặn được phản ứng dây chuyền này. Không cần suy nghĩ xem có nên tích hay không, cứ trực tiếp tích toàn bộ là đúng.

---

## Sáu: Thẻ đơn nhân vật và thẻ nhiều nhân vật —— Bắt buộc phải phán đoán trước khi cấu hình

Trước khi cấu hình bất kỳ mục nào, bạn bắt buộc phải phán đoán trước một việc: **Trong Worldbook của bạn có mấy nhân vật cốt lõi?**

Nhân vật cốt lõi nói ở đây là chỉ nhân vật được thiết lập chính, không phải NPC.

**Phân biệt then chốt: Các mục được chia nhỏ của cùng một nhân vật không được tính là "nhân vật khác nhau".**

Bạn đem thiết lập của Lâm Tiểu Vũ chia nhỏ thành năm mục: cơ bản nhân vật, ngoại hình, tính cách, bối cảnh, NSFW. Năm mục này đều miêu tả một mình Lâm Tiểu Vũ, vì vậy đây là thẻ đơn nhân vật. Không phải vì có năm mục mà biến thành thẻ năm nhân vật đâu.

Chỉ khi mục miêu tả là **các nhân vật độc lập khác nhau**, thì mới được tính là thẻ nhiều nhân vật. Ví dụ đồng thời có hai nhân vật chính là Lâm Tiểu Vũ và Triệu Minh Nguyệt, thì đó chính là thẻ nhiều nhân vật.

### Thẻ đơn nhân vật (Chỉ có 1 nhân vật cốt lõi)

**Tất cả các mục của nhân vật này, toàn bộ dùng Đèn xanh dương thường trực. Cho dù bị chia nhỏ thành bao nhiêu mục đi nữa.**

Đây là lỗi mà rất nhiều người dễ mắc phải nhất. Họ thấy mục của nhân vật bị chia nhỏ thành năm sáu cái, liền cảm thấy "Oa nhiều quá, hay là đổi một số thành Đèn xanh lá để tiết kiệm chút token đi".

**Tuyệt đối không được.**

Những mục này tuy bị chia nhỏ ra, nhưng đều là thiết lập của cùng một nhân vật. Thông tin cơ bản và tính cách bị tách riêng, nhưng AI bắt buộc phải đồng thời biết cả hai cái này thì mới có thể nhập vai nhân vật một cách chính xác. Bạn đổi mục tính cách thành Đèn xanh lá, vậy thì khi trong trò chuyện vừa vặn không nhắc đến từ khóa kích hoạt, AI sẽ không đọc được tính cách —— nó biết người này tên gì, trông như thế nào, nhưng không biết tính cách của cô ấy ra sao. Lúc này nó chỉ có thể dựa vào suy đoán, kết quả của việc suy đoán chính là văn mẫu.

**Thẻ đơn nhân vật, tất cả các mục đều Đèn xanh dương. Đây là thiết luật.**

### Thẻ nhiều nhân vật (Có từ 2 nhân vật cốt lõi trở lên)

Logic cấu hình của thẻ nhiều nhân vật không giống như vậy:

- **Xem lướt nhân vật**: Đèn xanh dương thường trực. Giới thiệu tóm tắt của tất cả các nhân vật được đặt cùng nhau, để AI luôn biết trong thế giới có những ai.
- **Thông tin chi tiết các nhân vật**: Kích hoạt bằng Đèn xanh lá. Từ khóa thiết lập thành tên nhân vật, biệt danh, biệt hiệu. Chỉ khi trong trò chuyện nhắc đến một nhân vật nào đó, mới tải thiết lập hoàn chỉnh của cô ấy.

Nguyên lý rất đơn giản: AI trước tiên xem phần xem lướt, biết có hai người là Lâm Tiểu Vũ và Triệu Minh Nguyệt. Khi trong trò chuyện nhắc đến "Tiểu Vũ", thông tin chi tiết của Lâm Tiểu Vũ được kích hoạt, AI sẽ biết cách nhập vai cô ấy. Khi trò chuyện nhắc đến "Minh Nguyệt", thông tin chi tiết của Triệu Minh Nguyệt được kích hoạt. Những nhân vật không được nhắc đến thì sẽ không chiếm token.

---

## Bảy: Giải thích chi tiết cấu hình các loại mục

Bây giờ sẽ giải thích rõ ràng từng loại mục một xem cấu hình như thế nào.

### Thế giới quan / Thiết lập bối cảnh

- Vị trí: Trước định nghĩa nhân vật
- Kích hoạt: Đèn xanh dương thường trực
- Thứ tự: 1-3 (Xếp theo độ quan trọng, quan trọng nhất đặt lên trên cùng)
- Đệ quy: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn

Thế giới quan là nền tảng để AI hiểu mọi thứ, bắt buộc phải luôn tồn tại. Cho dù đối thoại trò chuyện đến đâu, AI đều cần biết thế giới này trông như thế nào.

Nếu thế giới quan bị chia nhỏ thành nhiều mục (ví dụ một cái tổng cương, một cái thiết lập khu vực, một cái quy tắc xã hội), vậy thì hãy xếp thứ tự theo độ quan trọng: Tổng cương thứ tự 1, khu vực thứ tự 2, quy tắc xã hội thứ tự 3.

### Xem lướt nhân vật

- Vị trí: Trước định nghĩa nhân vật
- Kích hoạt: Đèn xanh dương thường trực
- Thứ tự: 4
- Đệ quy: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn

Xem lướt nhân vật chính là phần giới thiệu tóm tắt một câu của tất cả các nhân vật, để AI biết trong thế giới có những ai. Thẻ nhiều nhân vật bắt buộc phải có phần này, thẻ đơn nhân vật thì tùy chọn.

Tại sao lại đặt trước định nghĩa nhân vật? Bởi vì xem lướt là thôngquan thiên về vĩ mô —— "trong thế giới này có những ai". AI biết trước có những ai, sau đó mới đi đọc thông tin nhân vật cụ thể.

### Thông tin chi tiết nhân vật cốt lõi

Đây chính là thiết lập hoàn chỉnh của nhân vật —— thông tin cơ bản, ngoại hình, tính cách, bối cảnh, kỹ năng, NSFW vân vân, có thể chia nhỏ thành nhiều mục.

- Vị trí: Sau định nghĩa nhân vật
- Kích hoạt:
  - Thẻ đơn nhân vật -> **Toàn bộ Đèn xanh dương** (Nhấn mạnh lần nữa, cho dù chia nhỏ thành bao nhiêu mục đi chăng nữa, thì đều là cùng một nhân vật, bắt buộc phải thường trực)
  - Thẻ nhiều nhân vật -> Đèn xanh lá (Từ khóa thiết lập thành tên nhân vật, biệt danh, biệt hiệu)
- Thứ tự: 99 (Nếu là thẻ đơn nhân vật chia nhỏ ra, có thể xếp theo logic: cơ bản 10 -> ngoại hình 20 -> tính cách 30 -> bối cảnh 40)
- Đệ quy: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn

### Giải thích lần hai

Giải thích lần hai được dùng để sửa lại sự hiểu lầm của AI đối với nhân vật. Ví dụ AI luôn viết nhân vật của bạn quá ngoan ngoãn, bạn liền viết trong phần giải thích lần hai rằng "nhân vật này sẽ không chủ động thỏa hiệp, cho dù đối mặt với áp lực cũng sẽ kiên trì lập trường của mình".

- Vị trí: Bánh răng D độ sâu 0 (role chọn system)
- Kích hoạt: Đèn xanh lá (Từ khóa thiết lập thành tên nhân vật)
- Thứ tự: 1 (Nếu có giải thích lần hai của nhiều nhân vật, hãy xếp theo thứ tự: nhân vật A là 1, nhân vật B là 2)
- Đệ quy: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn

Tại sao giải thích lần hai lại đặt ở D0? Bởi vì nó là sự chỉ đạo sửa sai trực tiếp đối với AI, cần sức ảnh hưởng mạnh nhất. D0 là vị trí AI đọc được cuối cùng, hiệu quả tốt nhất.

Tại sao dùng Đèn xanh lá mà không dùng Đèn xanh dương? Bởi vì giải thích lần hai là sự sửa sai nhắm vào nhân vật cụ thể. Khi trong trò chuyện nhắc đến nhân vật này thì mới cần sửa sai, không nhắc đến thì không cần. Hơn nữa nếu là thẻ nhiều nhân vật, giải thích lần hai của tất cả các nhân vật đều dùng Đèn xanh dương, D0 sẽ chất một đống chỉ lệnh sửa sai, ngược lại làm phân tán sự chú ý.

### NPC

- Vị trí: Sau định nghĩa nhân vật
- Kích hoạt: Đèn xanh lá (Từ khóa thiết lập thành tên NPC, biệt hiệu, biệt danh, chức vụ... tất cả các xưng hô có khả năng được nhắc tới)
- Thứ tự: 100
- Đệ quy: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn

NPC là vai phụ, chỉ xuất hiện khi cần thiết. Trong trò chuyện có nhắc đến mới tải, không nhắc đến thì không chiếm token.

Từ khóa cần phải bao phủ toàn diện. Ví dụ một NPC tên là Vương Tĩnh, là giáo viên chủ nhiệm, mọi người gọi cô ấy là cô Vương. Vậy thì từ khóa sẽ thiết lập thành: \`Vương Tĩnh,cô Vương,giáo viên chủ nhiệm\`. Bỏ sót bất kỳ một xưng hô nào cũng có thể dẫn đến việc lúc cần được kích hoạt lại không kích hoạt.

### Bối cảnh / Sự kiện

- Vị trí: Sau định nghĩa nhân vật
- Kích hoạt: Đèn xanh lá (Từ khóa thiết lập thành tên bối cảnh, tên địa điểm, tên sự kiện, từ ngữ liên quan)
- Thứ tự: 50-98
- Đệ quy: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn

Bối cảnh và sự kiện cũng được tải theo nhu cầu. Khi đi thư viện mới cần biết thư viện trông như thế nào, không đi thì không cần.

Từ khóa cũng phải bao phủ toàn bộ các cách nhắc đến có thể xảy ra. Từ khóa của "Thư viện trường học" có thể thiết lập thành: \`thư viện,thư viện trường học,mượn sách\`.

### Bộ điều khiển EJS

- Vị trí: Sau định nghĩa nhân vật
- Kích hoạt: Đèn xanh dương thường trực
- Thứ tự: 100
- Đệ quy: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn

Bộ điều khiển EJS là script dùng để tải động các mục khác. Nếu bạn dùng hệ thống EJS, bản thân bộ điều khiển bắt buộc phải thường trực, bởi vì nó phải dựa vào biến số để quyết định tải những mục nào.

### Các mục được EJS tải

- Trạng thái: **Vô hiệu hóa** (enabled thiết lập là false)

Những mục này được bộ điều khiển EJS tải động thông qua code. Bản thân chúng **không được phép bật**.

Nếu bạn bật thủ công, nội dung của tất cả các giai đoạn sẽ đồng thời xuất hiện trong ngữ cảnh của AI —— AI đồng thời đọc được "giai đoạn 1: cô ấy mới quen bạn" "giai đoạn 3: cô ấy đã yêu bạn" "giai đoạn 5: cô ấy chuẩn bị tỏ tình", thế thì hành vi của nhân vật trực tiếp rối tung lên luôn.

Hãy để bộ điều khiển EJS quản lý chúng, bạn đừng đụng vào công tắc của chúng.

---

## Tám: Thiết kế từ khóa

Từ khóa viết không tốt, Đèn xanh lá chỉ là đồ trang trí.

Nguyên tắc cốt lõi: **Bao phủ toàn bộ các xưng hô có khả năng được nhắc tới.**

Từ khóa của mục nhân vật: Tên đầy đủ, biệt danh, biệt hiệu. Ví dụ từ khóa của Thu Minh Nguyệt: \`Thu Minh Nguyệt,Minh Nguyệt\`. Nếu mọi người còn gọi cô ấy là "Nguyệt Nguyệt" hoặc "chị Thu", vậy thì thêm vào: \`Thu Minh Nguyệt,Minh Nguyệt,Nguyệt Nguyệt,chị Thu\`.

Từ khóa của mục NPC: Tên đầy đủ, biệt danh, biệt hiệu, chức vụ. Ví dụ Vương Tĩnh là giáo viên chủ nhiệm: \`Vương Tĩnh,cô Vương,giáo viên chủ nhiệm\`.

Từ khóa của mục bối cảnh: Tên bối cảnh, tên khu vực tọa lạc, tên gọi khác, hành động liên quan. Ví dụ: \`Hồng Trần tửu gia,tửu gia,Hồng Trần,uống rượu\`. Thêm "uống rượu" là bởi vì khi nhân vật nói "đi uống rượu" thì có thể sẽ không nhắc đến tên bối cảnh, nhưng bạn biết họ sẽ đi đến tửu gia.

Từ khóa của mục thế lực: Tên đầy đủ, tên viết tắt, tên địa điểm tọa lạc. Ví dụ: \`Thiên Kiếm thánh địa,Thiên Kiếm phong,Thiên Kiếm\`.

**Định dạng xin nhấn mạnh lại một lần nữa: Ngăn cách bằng dấu phẩy tiếng Anh, không được có khoảng trắng.**

- Đúng: \`Lâm Tiểu Vũ,Tiểu Vũ,lớp trưởng\`
- Sai: \`Lâm Tiểu Vũ，Tiểu Vũ，lớp trưởng\`
- Sai: \`Lâm Tiểu Vũ, Tiểu Vũ, lớp trưởng\` (Sau dấu phẩy có khoảng trắng cũng không được)

---

## Chín: Ví dụ cấu hình hoàn chỉnh

### Ví dụ A: Thẻ đơn nhân vật

Thiết lập của nhân vật Lâm Tiểu Vũ được chia nhỏ thành năm mục. Chỉ có một nhân vật cốt lõi, nên toàn bộ dùng Đèn xanh dương.

Đèn xanh dương, sau định nghĩa nhân vật:
1. Lâm Tiểu Vũ_cơ bản nhân vật (Thứ tự 10)
2. Lâm Tiểu Vũ_ngoại hình (Thứ tự 20)
3. Lâm Tiểu Vũ_tính cách (Thứ tự 30)
4. Lâm Tiểu Vũ_câu chuyện bối cảnh (Thứ tự 40)
5. Lâm Tiểu Vũ_NSFW (Thứ tự 50)

Đèn xanh dương, Bánh răng D độ sâu 0:
6. Lâm Tiểu Vũ_giải thích lần hai (Thứ tự 1)

Tất cả các mục đều tích chọn: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn.

Chú ý xem này: Mặc dù chia nhỏ thành năm mục, nhưng toàn bộ là Đèn xanh dương. Bởi vì năm mục này đều miêu tả một mình Lâm Tiểu Vũ. Đừng vì thấy mục nhiều mà muốn đổi sang Đèn xanh lá để tiết kiệm token.

### Ví dụ B: Thẻ nhiều nhân vật

Hai nhân vật cốt lõi là Lâm Tiểu Vũ và Triệu Minh Nguyệt, cộng thêm thế giới quan, bối cảnh và NPC.

Đèn xanh dương, trước định nghĩa nhân vật:
1. Thiết lập thế giới quan (Thứ tự 1)
2. Bối cảnh trường học (Thứ tự 2)
3. Xem lướt nhân vật (Thứ tự 4)

Đèn xanh lá, sau định nghĩa nhân vật, thứ tự 50-98:
4. Bối cảnh_thư viện trường học (Thứ tự 80, từ khóa: \`thư viện\`)
5. Bối cảnh_nhà Lâm Tiểu Vũ (Thứ tự 80, từ khóa: \`nhà Lâm Tiểu Vũ,nhà Tiểu Vũ\`)

Đèn xanh lá, Bánh răng D độ sâu 0:
6. Lâm Tiểu Vũ_giải thích lần hai (Thứ tự 1, từ khóa: \`Lâm Tiểu Vũ,Tiểu Vũ\`)
7. Triệu Minh Nguyệt_giải thích lần hai (Thứ tự 2, từ khóa: \`Triệu Minh Nguyệt,Minh Nguyệt\`)

Đèn xanh lá, sau định nghĩa nhân vật, thứ tự 99:
8. Lâm Tiểu Vũ_thông tin cơ bản (Từ khóa: \`Lâm Tiểu Vũ,Tiểu Vũ\`)
9. Lâm Tiểu Vũ_tính cách (Từ khóa: \`Lâm Tiểu Vũ,Tiểu Vũ\`)
10. Triệu Minh Nguyệt_thông tin cơ bản (Từ khóa: \`Triệu Minh Nguyệt,Minh Nguyệt\`)
11. Triệu Minh Nguyệt_tính cách (Từ khóa: \`Triệu Minh Nguyệt,Minh Nguyệt\`)

Đèn xanh lá, sau định nghĩa nhân vật, thứ tự 100:
12. NPC_cô Vương (Từ khóa: \`Vương Tĩnh,cô Vương,giáo viên chủ nhiệm\`)

Tất cả các mục đều tích chọn: Không thể đệ quy + Ngăn chặn đệ quy sâu hơn.

Đã nhìn ra sự khác biệt chưa? Trong thẻ nhiều nhân vật, thông tin chi tiết của hai nhân vật cốt lõi được kích hoạt bằng Đèn xanh lá, chỉ tải khi nhắc đến nhân vật tương ứng. Nhưng xem lướt nhân vật lại là Đèn xanh dương, AI luôn biết trong thế giới có những ai.

---

## Mười: Xác suất / Độ dính / Thời gian hồi

Ba tùy chọn này có thể nhìn thấy trong cài đặt mục, nhưng cơ bản là không dùng tới. Cứ giữ nguyên mặc định là được, không cần đụng tới chúng.

---

## Mười một: Tổng kết bằng lời dễ hiểu

Cấu hình Worldbook nói cho cùng cũng chỉ có mấy việc thế này thôi:

**Trước khi cấu hình hãy phán đoán loại hình.** Đếm xem bạn có mấy nhân vật cốt lõi. Cùng một nhân vật bị chia nhỏ thành mười mục thì vẫn là một nhân vật.

**Thẻ đơn nhân vật thì toàn bộ Đèn xanh dương.** Đây là thiết luật. Đừng vì mục nhiều mà đổi sang Đèn xanh lá. Thiếu bất kỳ một mục nào, nhân vật sẽ không trọn vẹn, AI liền bắt đầu làm loạn.

**Thẻ nhiều nhân vật thì xem lướt Đèn xanh dương, chi tiết Đèn xanh lá.** AI luôn biết có những ai, khi nào dùng đến ai thì mới tải thông tin chi tiết của người đó.

**Thế giới quan lớn đặt trước định nghĩa nhân vật, thế giới quan nhỏ đặt sau định nghĩa nhân vật.** Khung trước chi tiết sau, AI đọc lên sẽ suôn sẻ.

**D0 đặt chỉ đạo, D1 trở lên không đụng tới.** D0 là vị trí đọc được cuối cùng, sức ảnh hưởng lớn nhất, dùng để sửa chữa sự hiểu lầm của AI. Những độ sâu khác sẽ phá hoại tính toàn vẹn của lịch sử trò chuyện, đừng nhét đồ vào trong đó.

**Tất cả các mục đều tích hai tùy chọn đệ quy.** Không thể đệ quy + Ngăn chặn đệ quy sâu hơn. Không cần nghĩ tại sao, trực tiếp tích toàn bộ.

**Từ khóa dùng dấu phẩy tiếng Anh ngăn cách, bao phủ tất cả xưng hô.** Tên, biệt danh, biệt hiệu, chức vụ, tên gọi khác, nghĩ ra được gì thì viết hết lên. Nếu dùng dấu phẩy tiếng Trung hoặc khoảng trắng để ngăn cách, từ khóa sẽ mất hiệu lực trực tiếp.`;


export const DEFAULT_STEPS: WorldbuildingStep[] = [
  {
    id: 'step_1',
    enabled: true,
    singleton: true,
    name: 'Bước 1: Thế Giới Quan & Thiết lập <user> (META)',
    prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Thu thập toàn diện -> Lọc rác nghiêm ngặt -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét toàn bộ nội dung từ link Wiki được cung cấp. Trích xuất và tạo ra ĐÚNG 2 ENTRY nền tảng: THẾ GIỚI QUAN và META.

[QUY TẮC TRÌNH BÀY (LỆNH TUYỆT ĐỐI - CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Tuyệt đối không viết các đoạn văn dài dính liền nhau. Bắt buộc chia nhỏ ý, sử dụng triệt để gạch đầu dòng (-, +).
2. TỐI ƯU ĐỌC HIỂU: Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi. Bắt buộc **In đậm** các danh từ riêng, khái niệm, thời đại.
3. BỌC THẺ DỮ LIỆU: Nội dung xuất ra phải nằm trọn vẹn bên trong các thẻ HTML-like được quy định sẵn. Không để text trôi nổi bên ngoài.

[YÊU CẦU CHI TIẾT CHO TỪNG ENTRY]:

1. ENTRY [THẾ GIỚI QUAN]:
- NỘI DUNG: Phác thảo toàn cảnh vũ trụ, bối cảnh thời đại, khái niệm cốt lõi và bầu không khí chung của thế giới.
- BỘ LỌC RÁC: Cấm tuyệt đối liệt kê Nhân vật, Hệ thống sức mạnh, Khu vực hay Vật phẩm vào phần này.
- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
<Worldview>
- **Khái niệm vũ trụ:** (Điền nội dung ngắn gọn)
- **Bối cảnh thời đại:** (Điền nội dung ngắn gọn)
- **Luật lệ tự nhiên cốt lõi:** (Điền nội dung ngắn gọn)
</Worldview>

2. ENTRY [META_SETUP]:
- NỘI DUNG: Thiết lập quy tắc tồn tại song song giữa biến số \`<user>\` và Nhân vật chính (Main gốc) của thế giới này.
- ĐỊNH NGHĨA BIẾN SỐ: Khẳng định rõ \`<user>\` là một thực thể vô định, một biến số trống không có nhân dạng hay định nghĩa cố định (có thể là bất kỳ ai). Cấm AI tự ý phác họa ngoại hình hay tính cách cho \`<user>\`.
- ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
<Meta>
- **Quy tắc tồn tại:** (Điền nội dung ngắn gọn)
- **Định nghĩa <user>:** (Điền nội dung ngắn gọn)
</Meta>`
  },
  {
    id: 'step_2',
    enabled: true,
    name: 'Bước 2: Hệ Thống, Cơ Chế & Quy Tắc',
    prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét sâu (Deep Scan) -> Lọc rác tuyệt đối -> Phân loại và Bọc thẻ chuẩn xác.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chuyên sâu về [HỆ THỐNG] (Sức mạnh, Ma thuật, Công nghệ, Kinh tế...), [CƠ CHẾ] (Cách thế giới vận hành), và [QUY TẮC] (Định luật, Quy định, Luật lệ).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch. 
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Hệ thống/Cơ chế/Quy tắc có thể tồn tại trong Lore. Nếu đạt giới hạn text, tự động dừng ở cuối một thẻ và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên hệ thống, tên cảnh giới, cấp độ, hoặc thuật ngữ quan trọng.
3. BỘ LỌC RÁC: CẤM TUYỆT ĐỐI đưa bất kỳ yếu tố nào về Nhân vật, Khu vực, Vật phẩm, hay Cốt truyện vào đây.
4. BỌC THẺ DỮ LIỆU: Phân loại rạch ròi bằng 3 thẻ <System>, <Mechanic>, <Rule>. Không gộp chung.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi mục tìm thấy)]:

1. Đối với dữ liệu Hệ thống (Sức mạnh, Kinh tế, Giai cấp):
<System>
**Tên Hệ Thống:** (Điền tên)
- **Phân loại:** (Sức mạnh / Ma thuật / Kinh tế / Chính trị...)
- **Bản chất cốt lõi:** (Giải thích cực kỳ ngắn gọn)
- **Cấu trúc / Cảnh giới / Cấp độ:**
  + **[Tên Cấp 1]:** Đặc điểm cốt lõi.
  + **[Tên Cấp 2]:** Đặc điểm cốt lõi.
</System>

2. Đối với dữ liệu Cơ chế (Cách một hiện tượng/vật chất vận hành):
<Mechanic>
**Tên Cơ Chế:** (Điền tên)
- **Phạm vi tác động:** (Áp dụng lên ai/cái gì)
- **Cách thức hoạt động:**
  + Bước 1 / Điều kiện kích hoạt: (Mô tả ngắn gọn)
  + Bước 2 / Hiệu ứng tạo ra: (Mô tả ngắn gọn)
</Mechanic>

3. Đối với dữ liệu Quy tắc (Định luật tự nhiên, Luật lệ xã hội, Lời nguyền):
<Rule>
**Tên Quy Tắc:** (Điền tên)
- **Tính chất:** (Tuyệt đối / Có thể phá vỡ / Ràng buộc pháp lý...)
- **Nội dung quy tắc:** (Ghi rõ quy định ngắn gọn)
- **Hệ quả vi phạm:** (Điều gì xảy ra nếu phá luật)
</Rule>`
  },
  {
    id: 'step_3',
    enabled: true,
    name: 'Bước 3: Toàn bộ Nhân Vật',
    prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét toàn diện nhân vật -> Ép ranh giới dữ liệu -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chi tiết về TOÀN BỘ [NHÂN VẬT] (Bao gồm: Nhân vật chính, Phụ, Phản diện, và cả Quần chúng có tên).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Nhân vật có mặt trong Wiki. Nếu đạt giới hạn text của một lần trả lời, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, đi thẳng vào bản chất cốt lõi của nhân vật.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên nhân vật, danh hiệu, chủng tộc, tên kỹ năng.
3. BỘ LỌC RANH GIỚI DỮ LIỆU (QUAN TRỌNG): 
   + CẤM TUYỆT ĐỐI đưa các giải thích dài dòng về Hệ thống, Cơ chế, Khu vực, hay Cốt truyện vào đây.
   + Đối với sức mạnh/năng lực: CHỈ LIỆT KÊ TÊN và biểu hiện bên ngoài cực kỳ ngắn gọn. Không giải thích nguyên lý hoạt động của kỹ năng (Nguyên lý thuộc về thẻ <Mechanic>).
4. BỌC THẺ DỮ LIỆU: Mỗi nhân vật phải nằm trong một thẻ <Character> riêng biệt.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi nhân vật tìm thấy)]:

<Character>
**Tên Nhân Vật:** (Điền tên đầy đủ)
- **Bí danh / Danh hiệu:** (Điền nếu có)
- **Chủng tộc / Thế lực:** (Điền ngắn gọn)
- **Thân thế / Vị trí:** (Vai trò trong thế giới: Bang chủ, Học sinh, Thần minh...)
- **Đặc điểm cốt lõi:** (Tóm tắt tính cách hoặc đặc trưng nổi bật nhất trong 1-2 dòng)
- **Năng lực / Sức mạnh chính:** 
  + **[Tên Kỹ năng 1]:** (Mô tả hiệu ứng bề ngoài siêu ngắn gọn, ví dụ: "Bắn ra lửa đen").
  + **[Tên Kỹ năng 2]:** (Mô tả siêu ngắn gọn).
- **Mối quan hệ cốt lõi:** (Ví dụ: Kẻ thù của X, Đồng minh của Y)
</Character>`
  },
  {
    id: 'step_4',
    enabled: true,
    name: 'Bước 4: Khu Vực & Địa Danh',
    prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét không gian đa chiều -> Ràng buộc địa lý -> Trình bày chuẩn hóa.

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất các entry chi tiết về [KHU VỰC] (Bao gồm: Đa vũ trụ, Chiều không gian, Hành tinh, Lục địa, Quốc gia, Thành phố, Kiến trúc, Tòa nhà...).

[LỆNH THỰC THI KIÊN QUYẾT]:
- Quét từ quy mô vĩ mô (Macro) xuống vi mô (Micro).
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi Khu vực có trong Wiki. Nếu đạt giới hạn text, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Mỗi ý tối đa 2-3 dòng, tập trung miêu tả không gian.
2. NHẤN MẠNH: Bắt buộc **In đậm** tên địa danh, quy mô, và các đặc trưng môi trường.
3. BỘ LỌC RANH GIỚI DỮ LIỆU (QUAN TRỌNG): 
   + CẤM TUYỆT ĐỐI trộn lẫn thông tin về Nhân vật cư trú, Hệ thống vận hành, hay Cốt truyện vào đây. 
   + Chỉ miêu tả thuần túy về Không gian, Địa hình, Khí hậu, và Kiến trúc.
4. BỌC THẺ DỮ LIỆU: Mỗi địa điểm phải nằm trọn vẹn trong một thẻ <Location>.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Lặp lại cấu trúc này cho mỗi địa điểm tìm thấy)]:

<Location>
**Tên Khu Vực:** (Điền tên địa danh)
- **Quy mô / Loại hình:** (Đa vũ trụ / Lục địa / Thành phố / Tòa nhà / Căn phòng...)
- **Đặc điểm môi trường / Địa lý:** (Mô tả khí hậu, địa hình, cảnh quan bề ngoài cực kỳ ngắn gọn)
- **Đặc trưng kiến trúc / Không gian:** (Mô tả cấu trúc vật lý hoặc đặc tính không gian đặc biệt)
- **Phân khu trực thuộc (Nếu có):** 
  + **[Tên khu vực nhỏ hơn 1]:** Chức năng chính.
  + **[Tên khu vực nhỏ hơn 2]:** Chức năng chính.
</Location>`
  },
  {
    id: 'step_5',
    enabled: true,
    name: 'Bước 5: Dòng Thời Gian (Lịch sử)',
    prompt: `[LUỒNG XỬ LÝ DỮ LIỆU]: Quét sâu tuyến tính -> Thiết lập Cảnh báo Biến số -> Trình bày chuẩn hóa đa phân đoạn (Multi-batch).

[NHIỆM VỤ CHÍNH]: Quét sạch toàn bộ dữ liệu Wiki để xuất toàn bộ các mốc sự kiện trong [DÒNG THỜI GIAN] (Timeline / Lịch sử / Các sự kiện cốt lõi) theo đúng trình tự thời gian.

[LỆNH THỰC THI KIÊN QUYẾT]:
- Tạo liên tục và chia thành nhiều batch.
- KHÔNG ĐƯỢC DỪNG LẠI cho đến khi vắt kiệt 100% mọi mốc sự kiện lịch sử có trong Wiki (từ khởi nguyên vũ trụ đến hiện tại). Nếu đạt giới hạn text của một lần trả lời, tự động đóng thẻ hiện tại và chờ lệnh "Tiếp tục".

[QUY TẮC TRÌNH BÀY (CẤM VI PHẠM)]:
1. CẤM WALL OF TEXT: Dùng gạch đầu dòng (-, +). Tóm tắt mỗi sự kiện tối đa 2-3 dòng, cực kỳ súc tích, đi thẳng vào diễn biến.
2. NHẤN MẠNH: Bắt buộc **In đậm** mốc thời gian (Năm/Kỷ nguyên) và Tên sự kiện.
3. BỘ LỌC RANH GIỚI: CHỈ liệt kê diễn biến sự kiện. CẤM giải thích lại năng lực, cơ chế hay thân thế nhân vật tại đây (để tránh lặp dữ liệu).
4. BỌC THẺ DỮ LIỆU: Bọc toàn bộ trong thẻ <Timeline>, mỗi sự kiện chi tiết bọc thêm <Event>.

[ĐIỀU KIỆN KÍCH HOẠT ĐẶC BIỆT (HIỆU ỨNG CÁNH BƯỚM)]:
- LỆNH TUYỆT ĐỐI TỚI AI: Bắt buộc phải in nguyên văn đoạn [CẢNH BÁO HỆ THỐNG] dưới đây vào NGAY ĐẦU thẻ <Timeline> của Batch đầu tiên. AI phải hiểu rõ cốt truyện gốc sẽ bị hủy bỏ hoàn toàn ngay khi \`<user>\` xuất hiện.

[ĐỊNH DẠNG ĐẦU RA BẮT BUỘC]:

<Timeline>
[CẢNH BÁO HỆ THỐNG - HIỆU ỨNG CÁNH BƯỚM]: Dòng thời gian gốc dưới đây CHỈ MANG TÍNH CHẤT THAM KHẢO. Khi biến số \`<user>\` chính thức giáng lâm và có bất kỳ hành động tương tác nào, Timeline gốc này sẽ ngay lập tức bị phá vỡ. Mọi sự kiện tương lai sẽ rẽ nhánh, bóp méo và thay đổi hoàn toàn dựa trên quỹ đạo hành động của \`<user>\`, vô hiệu hóa định mệnh đã được sắp đặt sẵn của thế giới này.

- **[Mốc Thời Gian 1] - Tên Sự Kiện:**
  <Event> (Tóm tắt diễn biến cốt lõi cực kỳ ngắn gọn) </Event>

- **[Mốc Thời Gian 2] - Tên Sự Kiện:**
  <Event> (Tóm tắt diễn biến cốt lõi cực kỳ ngắn gọn) </Event>

(Tiếp tục liệt kê cho đến khi hết dữ liệu...)
</Timeline>`
  }
];

export function getProfileExtractionContext(profile?: ProxyProfile): string {
  if (!profile) return '';
  const parts: string[] = [];
  
  if (profile.masterInstruction) {
    parts.push(`### HƯỚNG DẪN TỔNG (MASTER INSTRUCTION)\n${profile.masterInstruction}`);
  }
  
  if (profile.aiPipelineMemory) {
    parts.push(`### GHI NHỚ VỀ HƯỚNG DẪN TỔNG:\n${profile.aiPipelineMemory}`);
  }
  
  const steps = (profile.steps || DEFAULT_STEPS).filter(s => s.enabled);
  if (steps.length > 0) {
    const stepsText = steps.map((s, idx) => `BƯỚC ${idx + 1}: [${s.name}]\n- ${s.prompt}`).join('\n\n');
    parts.push(`### QUY TRÌNH TRÍCH XUẤT (PIPELINE STEPS)\nBạn cần tuân thủ các quy tắc trong quy trình sau:\n${stepsText}`);
  }
  
  return parts.length > 0 ? '\n\n' + parts.join('\n\n') : '';
}
