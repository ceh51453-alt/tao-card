# Thông tin cơ bản của nhân vật (Character Base Info)

Đây là bước đầu tiên khi viết thẻ (character card). Trước khi bắt tay vào viết tính cách, bạn cần tạo "chứng minh thư" cho nhân vật trước.

Thông tin cơ bản của nhân vật trả lời cho các câu hỏi: Người này là ai, trông như thế nào, đã trải qua những gì, và có mối quan hệ gì với {{user}}.

Nghe có vẻ đơn giản, nhưng hầu hết mọi người đều bắt đầu mắc sai lầm ở bước này.

---

## Một: Cấu trúc của thông tin cơ bản

Gồm 4 phần, không hơn không kém:

```yaml
Hồ sơ nhân vật (Character Profile):
  Thông tin cơ bản (Basic Info):
  Đặc điểm ngoại hình (Appearance):
  Thiết lập bối cảnh (Background):
  Thiết lập mối quan hệ (Relationships):
```

Lưu ý: **Không viết tính cách ở đây.** Tính cách (Personality) có mục riêng của nó. Ở đây chỉ viết "người này là ai", không viết "người này là người như thế nào".

Nhiều người không phân biệt được hai điều này. "Cô ấy 17 tuổi, học sinh lớp 11, tay guitar" là thông tin cơ bản. "Cô ấy nhiệt tình, nổi loạn, không theo khuôn mẫu" là tính cách. Cái trước đặt ở đây, cái sau đặt trong mục tính cách.

Hậu quả của việc viết lẫn lộn là: AI khi đọc thông tin cơ bản sẽ bắt đầu gọi các thẻ tính cách (personality tags) ra để diễn, chưa kịp đến mục tính cách thì nhân vật đã bị định hình rồi. Những nội dung tính cách bạn viết phía sau sẽ hoàn toàn xung đột với các thẻ bạn đã viết trước đó.

Hãy tách riêng ra, phần nào ra phần nấy.

---

## Hai: Thông tin cơ bản

Phần này đơn giản nhất, giống như điền biểu mẫu.

- Họ tên
- Tuổi
- Giới tính
- Thân phận (Học sinh, nhân viên văn phòng, mạo hiểm giả...)
- Mối quan hệ với {{user}}

Không có gì nhiều để dạy, bạn biết nhân vật của mình là ai, cứ thế viết ra.

Chỉ cần nhắc một chút về dòng "mối quan hệ với {{user}}". Đây không phải là phiên bản chi tiết của thiết lập mối quan hệ, nó chỉ là một câu định vị — "Bạn cùng lớp", "Thanh mai trúc mã", "Hàng xóm". Việc triển khai chi tiết mối quan hệ sẽ được đặt ở phần "Thiết lập mối quan hệ" cuối cùng.

---

## Ba: Ngoại hình — 90% mọi người đều viết sai phần này

Ngoại hình là phần dễ viết hỏng nhất trong thông tin cơ bản.

Tôi đã thấy quá nhiều đoạn miêu tả ngoại hình như thế này:

> Khuôn mặt thanh tú, làn da trắng ngần, mắt hoa đào, lông mày lá liễu, miệng anh đào, thân hình cân đối, khí chất thanh lịch.

Bạn che tên đi, đoạn miêu tả này đặt vào ai cũng được. Đặt vào nhân vật A của bạn cũng được, đặt vào nhân vật B của người khác cũng được, đặt vào bất kỳ "nhân vật nữ xinh đẹp" nào cũng xong.

Thế thì bằng như không viết gì cả.

Ngoại hình không phải để viết về "cái đẹp", mà là "đặc điểm" (features). Đặc điểm có nghĩa là: **Những thứ chỉ nhân vật này mới có.**

### Nguyên tắc khác biệt hóa đặc điểm

Logic cốt lõi rất đơn giản: **AI có database (cơ sở dữ liệu) riêng của nó. Bạn chỉ cần viết những phần lệch khỏi nhận thức mặc định của database.**

Nghĩa là sao?

- Nhân vật là người Trung Quốc → Trong database của AI, người Trung Quốc mặc định là tóc đen, mắt đen, da vàng, bạn không cần viết những thứ này.
- Nhưng nếu người Trung Quốc này có tóc trắng → Bạn cần viết "tóc trắng", vì nó lệch khỏi nhận thức mặc định.
- Mắt vẫn màu đen → Không cần viết, mặc định là thế.
- Mặc đồng phục của một trường học cụ thể → Phải viết, vì AI không biết đó là trường nào.

Tương tự:
- Nhân vật Nhật Bản → Tóc đen không cần viết, tóc vàng phải viết.
- Nhân vật Elf (Tiên tộc) → Tai nhọn không cần viết (trong database Elf mặc định tai nhọn), nhưng nếu bị đứt tai thì phải viết.
- Nữ sinh trung học 18 tuổi → "Trẻ trung", "da đẹp" không cần viết, trong database của AI 18 tuổi chính là như vậy.

### Tiêu chuẩn đánh giá

Chỉ có một: **Nếu bạn che đi tên trong phần miêu tả ngoại hình, bạn có thể nhận ra đó là ai chỉ dựa vào những đặc điểm này không?**

Có → Viết tốt.
Không, đặt vào nhân vật khác vẫn đúng → Xóa đi, đó là lời vô nghĩa.

### Cụ thể viết gì

1. **Đặc điểm cơ thể lệch khỏi mặc định** — Mắt hai màu (heterochromia), sẹo, hình xăm, chân tay giả, màu tóc đặc biệt, v.v.
2. **Trang phục mang tính biểu tượng** — Đồng phục trường cụ thể, đồng phục nghề nghiệp, phụ kiện, kiểu tóc, v.v.
3. **Đặc điểm nổi bật về thể hình** — Đặc biệt cao/thấp/to con/gầy, v.v. ("thân hình bình thường" không cần viết).
4. **Chi tiết khiến người khác nhớ đến** — Đồ vật quen mang theo, phong cách ăn mặc đặc biệt, v.v.

### Không viết gì

1. **Giá trị mặc định trong database** — Ngoại hình tiêu chuẩn của chủng tộc/quốc tịch/độ tuổi đó.
2. **Miêu tả mỹ nhân vạn năng** — Những từ như thanh tú, trắng trẻo, xinh đẹp đặt vào ai cũng đúng.
3. **Quá nhiều chi tiết** — Miêu tả từng ngũ quan một, vừa tốn token vừa làm phân tán sự chú ý.

### Hãy so sánh

Ví dụ sai:
```yaml
Đặc điểm ngoại hình (Appearance):
  Khuôn mặt: Khuôn mặt thanh tú, làn da trắng ngần, mắt hoa đào, mày lá liễu.
  Thân hình: Thân hình cân đối, dáng dấp yêu kiều.
  Khí chất: Dịu dàng, thanh lịch.
```

Năm câu miêu tả, không có thông tin hữu ích nào. Đặt vào bất kỳ nhân vật nào cũng đúng.

Ví dụ đúng:
```yaml
Đặc điểm ngoại hình (Appearance):
  Kiểu tóc: Tóc dài thẳng màu đen, dài đến eo, không nhuộm không uốn.
  Màu mắt: Xanh nhạt (Hội chứng Waardenburg, dị thường sắc tố mống mắt).
  Trang phục: Thích các kiểu dáng đơn giản màu trắng và màu sáng, mùa hè thường mặc váy liền hoặc áo phông quần đùi.
  Đặc điểm:
    - Luôn mang theo một chiếc túi đeo chéo bằng canvas nhỏ.
```

Bốn đặc điểm là có thể khóa chặt một nhân vật. Tóc dài thẳng màu đen đến eo — khóa kiểu tóc. Mắt màu xanh nhạt — lệch khỏi đồng tử màu đen mặc định, và có nguyên nhân cụ thể. Màu trắng và sáng — khóa phong cách ăn mặc. Túi đeo chéo bằng canvas — vật dụng mang tính biểu tượng.

Không viết "da trắng ngần", vì nữ sinh 18 tuổi mặc định là vậy. Không viết "ngũ quan thanh tú", vì đó là lời vô nghĩa.

Xem thêm một ví dụ:
```yaml
Đặc điểm ngoại hình (Appearance):
  Thể hình: 1m68, khá cao so với nữ giới.
  Kiểu tóc: Tóc ngắn màu nâu, cắt tỉa layer, không hay chải chuốt.
  Màu mắt: Mắt mèo, khi cười cong thành hình trăng lưỡi liềm.
  Trang phục:
    Trong trường: Đồng phục học viện Haneoka, nhưng cà vạt không bao giờ thắt đàng hoàng.
    Ngoài trường: Áo phông rộng quần jean, đeo dây chuyền có mặt gảy guitar (guitar pick).
  Đặc điểm: Ngón trỏ và ngón giữa tay trái có vết chai do đánh guitar.
```

1m68 — lệch khỏi chiều cao bình thường, cần viết. Mắt mèo — không phải dáng mắt mặc định. Cà vạt không bao giờ thắt đàng hoàng — một chi tiết đã toát lên được cái "chất" của nhân vật. Dây chuyền mặt gảy guitar, vết chai do đánh guitar — đặc điểm mang tính biểu tượng, chỉ thuộc về cô ấy.

Che tên đi, bạn nhận ra đây là ai. Thế là đúng.

### Tài liệu phản diện (Ví dụ tiêu cực)

```yaml
Kiểu tóc: Tóc dài chuyển sắc cam vàng như ráng chiều, ngọn tóc dưới ánh sáng mạnh ánh lên những đốm sáng vàng kim nhỏ bé.
Màu mắt: Đôi mắt trong vắt màu xanh thiên thanh, sâu trong đồng tử thỉnh thoảng có ánh sáng vàng lấp lánh như mặt trời mới mọc.
Màu da: Trắng ấm như ánh bình minh, khỏe mạnh và trong trẻo; sau khi vận động hai má sẽ ửng hồng dịu dàng.
Tư thế: Thon thả và tràn đầy sức sống, đường nét vai tự nhiên; động tác dứt khoát, bước chân mang theo nhịp điệu nhẹ nhàng.
```

Vấn đề ở đâu?

"Chuyển sắc cam vàng như ráng chiều" có thể được, đây là đặc điểm. Nhưng phần sau "ngọn tóc dưới ánh sáng mạnh ánh lên những đốm sáng vàng kim nhỏ bé" là miêu tả văn học, không phải thông tin đặc điểm, AI đọc xong sẽ không giúp bạn nhớ nhân vật, mà chỉ học cách dùng cách hoa mỹ tương tự để miêu tả tóc.

"Đôi mắt trong vắt màu xanh thiên thanh" viết thành "Mắt màu xanh thiên thanh" là đủ rồi. "Sâu trong đồng tử thỉnh thoảng có ánh sáng vàng lấp lánh như mặt trời mới mọc" là hình ảnh tu từ, không phải đặc điểm.

"Trắng ấm như ánh bình minh" — đây là phép so sánh, không phải thông tin. "Khỏe mạnh trong trẻo", "sau khi vận động hai má sẽ ửng hồng" — nữ sinh 18 tuổi mặc định là như vậy, không cần viết.

"Thon thả và tràn đầy sức sống, đường nét vai tự nhiên" — không nói lên điều gì cả. "Động tác dứt khoát, bước chân mang theo nhịp điệu nhẹ nhàng" — đây là tính cách chạy sang phần ngoại hình, không nên xuất hiện ở đây.

Ngoại hình chỉ viết đặc điểm, không viết miêu tả thẩm mỹ. Không viết hình ảnh tu từ, không viết so sánh, không viết "cảm giác". Tả thực (White sketch / Objective description), zero degree (khách quan tuyệt đối), sạch sẽ và ngắn gọn.

---

## Bốn: Thiết lập bối cảnh (Background)

Cách viết bối cảnh cũng tuân theo logic tương tự: **Chỉ viết những sự việc đã tạo ra ảnh hưởng thực tế đến nhân vật.**

Bạn không cần phải liệt kê chi tiết một bản niên biểu cuộc đời, chỉ cần viết những sự kiện quan trọng "khiến nhân vật này trở thành người như hiện tại".

### Viết gì

- Hoàn cảnh gia đình — nhưng chỉ viết phần ảnh hưởng đến nhân vật.
- Tình trạng kinh tế — nếu nó có ảnh hưởng đến nhân vật.
- Trải nghiệm quan trọng — những chuyện khiến nhân vật trở thành như hiện tại.
- Mối quan hệ xã hội — cô ấy ở trong vòng tròn nào, qua lại với ai.

### Không viết gì

- Mỗi độ tuổi đã xảy ra chuyện gì (trừ khi chuyện đó thay đổi nhân vật).
- Những chuyện vặt vãnh thời thơ ấu không liên quan đến trạng thái hiện tại của nhân vật.
- Những lời vô nghĩa như "Hồi bé cô ấy rất đáng yêu", "Thành tích học tập của cô ấy rất tốt".

### So sánh

Bối cảnh tốt:
```yaml
Thiết lập bối cảnh (Background):
  Hoàn cảnh gia đình:
    Cha mẹ: Gia đình công chức bình thường, rất yêu thương cô ấy.
    Nơi ở: Ở nhà đối diện với {{user}}, lớn lên cùng nhau từ nhỏ.
  Tình trạng kinh tế: Gia đình bình thường, việc điều trị dài hạn đã tiêu tốn nhiều tiền tiết kiệm.
  Bệnh tật:
    Tên bệnh: Tăng áp động mạch phổi vô căn (IPAH).
    Thời gian chẩn đoán: Cấp hai (khoảng 13 tuổi).
    Giai đoạn cuối: Thuốc đã không thể kiểm soát hiệu quả áp lực động mạch phổi, dự kiến sẽ qua đời vào khoảng sinh nhật 19 tuổi.
  Trải nghiệm quan trọng:
    - Hồi nhỏ hoạt bát hiếu động, thích bơi lội và chạy khắp nơi chụp ảnh.
    - Sau khi chẩn đoán mắc IPAH vào cấp hai, bị cấm vận động mạnh, buộc phải từ bỏ bơi lội.
    - Sau khi chẩn đoán, tính cách dần chuyển từ hoạt bát sang trầm tĩnh.
    - Lớp 12 bảo lưu kết quả một năm, nói dối bên ngoài là chuyển trường.
```

Mỗi dòng đều hữu ích. "Hồi nhỏ hoạt bát hiếu động" và "Sau khi chẩn đoán bị cấm vận động mạnh" đặt cạnh nhau, đây chính là nguồn gốc mâu thuẫn cốt lõi của nhân vật. "Nói dối bên ngoài là chuyển trường" là thiết lập quan trọng cho cốt truyện hiện tại. Bệnh tật viết rõ tên bệnh, thời gian chẩn đoán, dự kiến giai đoạn cuối — đủ cụ thể để AI biết cách sử dụng.

Xem thêm một ví dụ:
```yaml
Thiết lập bối cảnh (Background):
  Hoàn cảnh gia đình:
    Cha mẹ: Người thừa kế doanh nghiệp nhà họ Thu, cha mẹ quanh năm vắng nhà.
    Nơi ở: Căn hộ cao cấp gần trường, phần lớn thời gian sống một mình.
  Tình trạng kinh tế: Gia cảnh ưu ái, nhưng bản thân cô ấy không có khái niệm về tiền.
  Trải nghiệm quan trọng:
    - Tiểu học vì vụ đánh nhau nên bị chuyển trường.
    - Cấp hai bắt đầu tiếp xúc với nhạc Rock, thành lập ban nhạc.
    - Ở trường phải đóng vai hình tượng "Đại tiểu thư nhà họ Thu".
```

Ba trải nghiệm đã vẽ nên con người này. Đánh nhau chuyển trường — chứng tỏ cô ấy không ngoan ngoãn bẩm sinh. Tiếp xúc Rock lập ban nhạc — chứng tỏ cô ấy đã tìm thấy lối thoát. Đóng vai đại tiểu thư — chứng tỏ cô ấy đang sống dưới áp lực.

Nếu bạn thấy mình viết mười mấy dòng bối cảnh nhưng xóa đi bất kỳ dòng nào nhân vật cũng không thay đổi, thì dòng đó là vô dụng, xóa.

---

# Thiết lập Thế giới quan (Worldbuilding)

Thế giới quan là phần dễ viết hỏng nhất, dễ viết dài nhất, và cũng dễ viết sai nhất trong thẻ nhân vật.

Tại sao? Vì hầu hết mọi người cứ nghĩ đến "thế giới quan" là trong đầu hiện ra kiểu tập hợp thiết lập hoành tráng — lịch sử vĩ đại, hệ thống sức mạnh tinh vi, mối quan hệ thế lực chằng chịt. Rồi bắt đầu viết, viết một hồi tốn mấy chục ngàn token, AI lại diễn không tốt nhân vật nữa.

Thế giới quan không phải là tập hợp thiết lập tiểu thuyết. Thế giới quan là Prompt (Lời nhắc).

Prompt có nghĩa là nó sẽ chiếm dụng cửa sổ ngữ cảnh (context window) của bạn. Nó là thường trú (permanent), mỗi lượt hội thoại đều ở đó tiêu tốn token. Bạn viết một vạn token thế giới quan, đồng nghĩa với việc mỗi lượt hội thoại đều bị bớt đi một vạn token cho trí nhớ và khả năng sáng tạo của AI.

Vì vậy, nguyên tắc cốt lõi của thế giới quan chỉ có một: **Dùng số lượng chữ ít nhất để nói rõ mọi thiết lập.**

Không xóa bỏ yếu tố cốt lõi, nhưng cũng không giữ lại bất kỳ từ ngữ vô dụng nào.

---

## Một: Thế giới của bạn thuộc loại nào

Hãy làm rõ câu hỏi này trước khi đặt bút. Vì các loại thế giới khác nhau có cách viết hoàn toàn khác nhau, số lượng token chênh lệch gấp mấy chục lần.

### Loại A: Bối cảnh thực tế (Real-world background)

Những thế giới đã có sẵn trong dữ liệu huấn luyện của AI.

Nhật Bản hiện đại, Trung Quốc năm 2024, thời Khai Nguyên nhà Đường, Châu Âu thời Thế chiến thứ hai — những thứ này AI đều biết hết, bạn không cần phải dạy nó.

Loại thế giới quan này đơn giản nhất, **một mục (entry) là đủ**, thậm chí có thể chỉ cần vài dòng. Bạn chỉ cần viết những gì AI không biết: Tên trường học hư cấu, công ty tự thiết lập, quy tắc đặc biệt.

```yaml
Bối cảnh (Background): Nhật Bản hiện đại, Tokyo.

Thiết lập tùy chỉnh (Custom settings):
  Trường học: Học viện Haneoka, trường cấp ba tư thục, có câu lạc bộ ban nhạc.
  Địa điểm:
    - Live House "UNDERGROUND": Địa điểm âm nhạc ngầm, cuối tuần có biểu diễn.
    - Phố thương mại: Gần trường, tan học thường đến.
  Quy tắc đặc biệt:
    - Trường cấm học sinh tham gia biểu diễn thương mại ngoài trường.
    - Nhưng câu lạc bộ ban nhạc có giấy phép biểu diễn đường phố đặc biệt.
```

Hãy chú ý xem trong này không viết gì:
- Không viết "Tokyo là thủ đô Nhật Bản" — AI biết.
- Không viết "Nhật Bản có cửa hàng tiện lợi" — AI biết.
- Không viết "Học sinh cấp ba mặc đồng phục" — AI biết.
- Chỉ viết tên trường học hư cấu, địa điểm hư cấu, quy tắc tự thiết lập.

Tiêu chuẩn đánh giá: **Xóa câu này đi, AI có thể biểu diễn đúng không? Nếu có thể xóa thì xóa.**

### Loại B: Thế giới nhỏ (Small world)

AI có nhận thức cơ bản, nhưng bạn cần thiết lập tùy chỉnh cho các khái niệm chung.

Kiếm và Ma thuật, Cyberpunk, Tận thế hoang tàn (Post-apocalyptic), Dị năng học đường — AI biết những khuôn mẫu cơ bản của các thể loại này, nhưng không biết thế giới cụ thể của bạn trông như thế nào.

Loại thế giới quan này cần bổ sung thiết lập của riêng bạn, nhưng thông thường **1 đến 3 mục thường trú là đủ**.

Những gì bạn cần nói cho AI:
- Hệ thống sức mạnh của bạn là gì (nếu khác với những gì AI đã biết).
- Cấu trúc xã hội của bạn là gì.
- Sự khác biệt so với các khái niệm AI đã biết ("Thế giới này không có rồng", "Ma thuật không cần niệm chú").
- Giải thích các từ tự tạo và danh từ riêng.

Những gì bạn không cần nói cho AI:
- "Thế giới Kiếm và Ma thuật có mạo hiểm giả" — Nó biết.
- "Cyberpunk có hacker" — Nó biết.
- "Tận thế hoang tàn thiếu thốn tài nguyên" — Nó biết.

### Loại C: Thế giới lớn (Large world)

Hoàn toàn nguyên bản hoặc thế giới có thiết lập cực kỳ phức tạp. Nhiều khu vực, nhiều thế lực, nhiều NPC, nhiều loại sự kiện.

Thế giới tu tiên nguyên bản, đại lục kỳ ảo nguyên bản, nền văn minh giữa các vì sao nguyên bản — loại này database của AI không giúp được bạn, tất cả thiết lập đều cần bạn tự viết.

Loại thế giới quan này cần **chia nhỏ các mục**, nếu không mấy vạn token đều thường trú, AI sẽ không xử lý nổi.

---

## Hai: Tại sao phải tinh gọn

Nhiều người nghĩ rằng thế giới quan viết càng chi tiết càng tốt. Điều này là sai lầm.

Thế giới quan là Prompt thường trú. Thường trú có nghĩa là: **Nó hiện diện ở mỗi lượt hội thoại, luôn ở đó ăn token.**

Bạn viết một vạn token thiết lập thế giới quan, khi nhân vật hoạt động ở phía Đông, ba ngàn token thiết lập ở phía Tây cũng đang nằm đó chiếm chỗ. Nhân vật đang trò chuyện với một NPC, thiết lập của năm mươi NPC khác cũng nằm đó chiếm chỗ.

Token là có hạn. Bị thế giới quan ăn mất, chính là bị trừ đi từ trí nhớ và khả năng sáng tạo của AI.

Vì vậy, thế giới quan không phải là tập thiết lập tiểu thuyết, không cần viết ra cảm giác hoành tráng. **Thế giới quan chỉ cần chính xác và đầy đủ.**

### Mật độ thông tin

Thế giới quan là Prompt có mật độ thông tin cao nhất. Yêu cầu cốt lõi: **Dùng số chữ ít nhất đến mức cực đoan để nói rõ mọi thiết lập.**

Xem vài ví dụ nén:

| Cách viết rườm rà | Cách viết nén |
|---------|---------|
| "Đây là một thế giới của Kiếm và Ma thuật" | "Thế giới quan Kiếm và Ma thuật" |
| "Trong thế giới này, tồn tại năm loại nguyên tố" | "Năm nguyên tố: Hỏa, Thủy, Phong, Thổ, Lôi" |
| "Người tu luyện cần thông qua việc tu luyện không ngừng để nâng cao cảnh giới của mình" | "Tu luyện nâng cao cảnh giới" |
| "Thế giới được cai trị bởi ba đế quốc lớn, lần lượt là..." | "Ba đế quốc lớn: A, B, C" |
| "Tổ chức này sở hữu sức mạnh quân sự hùng hậu" | Xóa đi, hoặc viết dữ liệu cụ thể |

Tất cả các từ nối như "là một", "tồn tại", "lần lượt là", "cần thông qua", "được cấu thành từ", hãy thay thế bằng dấu hai chấm, dấu phẩy hoặc liệt kê trực tiếp.

Kiểm tra từng câu bạn viết:
- Có lạm dụng chữ "của" không? ("Tổ chức của các pháp sư hùng mạnh" → "Tổ chức pháp sư mạnh mẽ").
- Có chủ ngữ thừa thãi không? ("Tổ chức này sở hữu..." → Trực tiếp viết thuộc tính).
- Có miêu tả lặp lại không? (Cùng một thông tin xuất hiện hai lần ở những nơi khác nhau).
- Bản thân tên Key (Khóa) YAML đã có thể giải thích, trong phần Value (Giá trị) không cần lặp lại (Key là "Hệ thống sức mạnh", Value không cần viết thêm "Hệ thống sức mạnh của thế giới này là...").

### Nhưng nén không phải là xóa

Ở đây có một sự khác biệt rất quan trọng.

Nén là biến "Người tu luyện cần thông qua việc tu luyện không ngừng để nâng cao cảnh giới của mình, cảnh giới bắt đầu từ Luyện Khí kỳ, trải qua Trúc Cơ, Kim Đan, Nguyên Anh v.v." thành một danh sách rõ ràng.

Xóa là biến "Kim Đan kỳ có thể ngự kiếm phi hành, Nguyên Anh kỳ có thể phóng thần thức ra ngoài" thành "Tu luyện nâng cao cảnh giới" — Thông tin đã bị mất, điều này không thể chấp nhận được.

Tiêu chuẩn chỉ có một: **Một AI khác hoàn toàn không hiểu về thế giới quan của bạn, chỉ nhìn vào mục bạn viết này, có thể khôi phục lại trọn vẹn thiết lập thế giới của bạn không?** Nếu có thể thì đúng.

---

## Ba: Loại A viết như thế nào — Bối cảnh thực tế

Đơn giản nhất. Chỉ viết những gì AI không biết.

Nhân vật của bạn sống ở Trung Quốc hiện đại? Một mục thường trú đèn xanh dương (blue light) là đủ. Trong đó chỉ để tên trường học, địa điểm, quy tắc đặc biệt do bạn tùy chỉnh.

Nhân vật của bạn sống ở thời Đường? Tương tự, một mục. AI biết thời Đường trông như thế nào, bạn chỉ cần bổ sung "môn phái giang hồ hư cấu", "địa danh tự tạo".

**Trước khi viết hãy tự hỏi mình một câu: Nếu tôi xóa mục này đi, AI có vẫn biết thiết lập này không?** Nếu có, thì đó là lời vô nghĩa, không nên xuất hiện.

---

## Bốn: Loại B viết như thế nào — Thế giới nhỏ

Loại B nhiều hơn loại A một bước: Bạn cần cho AI biết thế giới của bạn khác với những khuôn mẫu (tropes) mà nó đã biết như thế nào.

Lấy ví dụ. Thế giới của bạn là "Kiếm và Ma thuật", nhưng hệ thống ma thuật của bạn là "Tiêu hao tuổi thọ thay vì ma lực". "Kiếm và Ma thuật" mà AI đã biết thì ma thuật dựa vào điểm ma lực, của bạn khác biệt, vì vậy bạn cần viết ra.

Nhưng những khuôn mẫu AI đã biết như "Hội mạo hiểm giả nhận nhiệm vụ để thăng cấp", không cần viết.

Loại B thường 1 đến 3 mục là đủ. Viết xong hãy đối chiếu kiểm tra:
- Mỗi thiết lập có phải là thứ AI tự mình không nghĩ ra được không?
- Có viết những thứ đã có trong khuôn mẫu của AI không?
- Xóa đi một điều nào đó AI có diễn sai không?

---

## Năm: Loại C viết như thế nào — Thế giới lớn

Thế giới lớn là phức tạp nhất, cần chia nhỏ các mục.

### Tại sao phải chia nhỏ

Tất cả thiết lập để chung một chỗ → Mấy vạn token, AI xử lý không nổi.
Nhân vật ở phía Đông, thiết lập phía Tây cũng được load (tải) → Lãng phí token.
Hàng chục NPC toàn bộ thường trú → AI ngược lại không nhớ được những điều quan trọng.

### Chia nhỏ như thế nào

Cách làm rất đơn giản: **Phân tầng (Layering).** Tầng trên thường trú, tầng dưới tải theo nhu cầu (on-demand loading).

**Tầng 1: Tổng cương thế giới (Thường trú)**
Một đoạn văn tóm tắt toàn bộ thế giới. Tên của tất cả các khu vực lớn và một câu giới thiệu ngắn gọn. Phiên bản tối giản của quy tắc cốt lõi.

**Tầng 2: Xem lướt khu vực (Thường trú)**
Thông tin cơ bản của từng khu vực lớn. Trong khu vực có những thế lực nào (chỉ liệt kê tên, không triển khai chi tiết). Đặc sắc khu vực một hai câu.

**Tầng 3: Chi tiết thế lực/cảnh vật (Tải theo nhu cầu)**
Mỗi thế lực là một mục độc lập. Khi nhắc đến tên thế lực này mới tải. Cấu trúc nội bộ, nhân vật quan trọng, thiết lập đặc sắc đều đặt ở đây.

**Tầng 4: Chi tiết NPC (Tải theo nhu cầu)**
Mỗi NPC là một mục độc lập. Khi nhắc đến tên NPC mới tải.

Thường trú là mục lục và tổng cương, luôn ở đó, để AI biết thế giới này đại khái trông như thế nào. Chi tiết chỉ xuất hiện khi cần thiết, không lãng phí token.

### Hiệu quả thực tế

Lấy ví dụ thế giới tu tiên.

Tổng cương thế giới (Thường trú) đại khái trông như thế này — cho AI biết thế giới có mấy khu vực lớn, quy tắc cốt lõi là gì, gói gọn trong một trang giấy.

Xem lướt khu vực (Thường trú) liệt kê Trung Ương Thần Châu có những tông môn nào, Đông Hoang có thế lực gì, chỉ liệt kê tên và một câu định vị, không triển khai.

Sau đó các mục cụ thể như "Kiếm Tông", "Đông Hải Long Cung", mục của một NPC nào đó, đều là các mục đèn xanh lá (green light) độc lập, cốt truyện nhắc đến mới tải.

Như vậy, khi nhân vật hoạt động ở Nam Cương, hàng chục mục của Bắc Nguyên Ma Thổ sẽ không chiếm dụng token. Khi nhân vật trò chuyện với một NPC nào đó, thiết lập của các NPC không liên quan cũng sẽ không can nhiễu.

### Cách viết Tổng cương và Xem lướt

Cách viết Tổng cương — "Mục lục" của thế giới, cực kỳ tối giản:

```yaml
Thế giới (World): Âm Dương Đại Lục, thế giới quan tu tiên.
Quy tắc cốt lõi (Core Rules):
  Tu luyện: Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp → Chân Tiên.
  Nguồn sức mạnh: Linh khí.
Khu vực (Regions):
  Trung Ương Thần Châu: Chiến trường chính của Nhân tộc tu tiên, nơi tọa lạc của Lục Đại Tiên Tông.
  Đông Hoang Yêu Vực: Lãnh địa Yêu tộc, do Vạn Yêu Quốc cai trị.
  Bắc Nguyên Ma Thổ: Căn cứ chính của Ma tộc, Thiên Ma Đế Đô.
  Tây Mạc Phật Quốc: Tịnh thổ Phật môn, Tiểu Lôi Âm Tự.
  Nam Cương Vu Địa: Thế lực Vu tộc, Vu Thần Giáo.
  Tứ Hải: Lãnh địa Long tộc, Tứ Hải Long Cung.
```

Đây chính là hình dáng chuẩn mực của Tổng cương. Vài dòng chữ, AI đã biết được bộ khung của thế giới này.

Cách viết Xem lướt — Trong khu vực có những gì, chỉ liệt kê tên và định vị:

```yaml
Tông môn Trung Ương Thần Châu:
  Thượng Tam Tông:
    Kiếm Tông: Đứng đầu Lục tông, Đạo công phạt.
    Đan Tông: Quyền uy tuyệt đối trong giới đan dược.
    Huyền Thiên Tông: Suy diễn thiên cơ.
  Hạ Tam Tông:
    Thái Hư Tông: Phù lục và trận pháp.
    Hợp Hoan Tông: Song tu, dùng độc, ám sát.
    Cổ Ma Tông: Cự phách Tà đạo, cội nguồn vạn cổ.
```

Hãy chú ý: Mỗi tông môn chỉ có tên và một câu định vị. Cụ thể bên trong có người nào, quy tắc gì, kiến trúc gì, toàn bộ đặt trong các mục chi tiết tương ứng của chúng. Xem lướt không triển khai.

### Cách viết Mục chi tiết

Mục chi tiết là đèn xanh lá (tải theo nhu cầu), nên có thể viết tương đối chi tiết, nhưng vẫn phải tinh gọn.

Một mục thế lực:
```yaml
Kiếm Tông:
  Định vị: Đứng đầu Lục tông, Đạo công phạt tột đỉnh.
  Vị trí: Phía Tây Trung Ương Thần Châu · Dãy núi Vạn Kiếm · Vạn Kiếm Thiên Trì.
  Tông chủ: Tạ Vân Lưu (Kiếm Thánh, Chân Tiên cảnh Thập trọng thiên Đại viên mãn).
  Địa điểm cốt lõi: [Tẩy Kiếm Trì, Luận Kiếm Bình, Tàng Kinh Kiếm Các, Kiếm Trủng].
  Thị trấn trực thuộc: Kiếm Minh Thành.
```

Không có những lời vô nghĩa như "Kiếm Tông là một tông môn có lịch sử lâu đời, có uy tín cao trong giới tu tiên". Định vị bằng một câu, vị trí chính xác đến địa điểm, tông chủ viết tên và thực lực, liệt kê các địa điểm cốt lõi, xong.

Một mục NPC:
```yaml
Tạ Vân Lưu:
  Thân phận: Tông chủ Kiếm Tông.
  Tu vi: Chân Tiên cảnh Thập trọng thiên Đại viên mãn.
  Danh hiệu: Kiếm Thánh.
  Cốt lõi tính cách: (Viết tính cách theo phương pháp của bạn).
```

### Cách kích hoạt tải theo nhu cầu

**Kích hoạt bằng từ khóa (Đơn giản)**

Thiết lập từ khóa cho mỗi mục đèn xanh lá. Tên nhân vật, tên thế lực, địa danh, cách nhau bằng dấu phẩy tiếng Anh. Khi trò chuyện nhắc đến những từ khóa này, mục sẽ tự động được tải.

Thiết lập từ khóa phải bao phủ tất cả các cách xưng hô có thể:
- Thế lực: Tên đầy đủ, tên viết tắt, tên địa danh nơi đặt trụ sở (Ví dụ: Thiên Kiếm Thánh Địa, Thiên Kiếm Phong, Thiên Kiếm).
- NPC: Tên đầy đủ, biệt danh, ngoại hiệu, chức vụ (Ví dụ: Lâm Tiểu Vũ, Tiểu Vũ, Lớp trưởng).

Cách này đơn giản và trực tiếp, phù hợp với trường hợp số lượng thế lực và NPC không quá nhiều (dưới vài chục).

Nhược điểm là: Cốt truyện muốn viết về một nhân vật nào đó nhưng phần chat trên lại vừa vặn không nhắc đến từ khóa, mục sẽ không được tải. Hoặc sau khi giới thiệu nhân vật, tên cứ xuất hiện liên tục, ngày càng nhiều mục bị kích hoạt.

---

## Sáu: Độ không tuyệt đối (Absolute Zero) — Yêu cầu về ngôn ngữ của Thế giới quan

Yêu cầu ngôn ngữ của thế giới quan khắt khe hơn thông tin cơ bản của nhân vật, vì nó là nội dung thường trú chiếm nhiều token nhất. Mỗi một chữ thừa thãi đều là lãng phí tài nguyên.

### Không viết đánh giá chủ quan

- "Đế quốc hùng mạnh" → "Đế quốc" (Hoặc viết dữ liệu quân lực cụ thể).
- "Tổ chức bí ẩn" → "Tổ chức" (Bí ẩn không phải là thông tin, là từ tu từ).
- "Cấm địa đáng sợ" → "Cấm địa" (AI tự biết đánh giá mức độ đáng sợ dựa trên thiết lập).

### Không viết so sánh và hình ảnh tu từ

- "Khe nứt như rãnh trời" → "Khe nứt rộng ba trăm trượng".
- "Cung điện nguy nga" → "Cung điện rộng ba trăm mẫu".

### Không viết lời vô nghĩa

- "Đây là một thế giới đầy rẫy cơ hội và thách thức" → Xóa, thế giới nào mà chẳng vậy.
- "Người tu tiên theo đuổi sự trường sinh" → Xóa, AI đã biết.
- "Nơi này phong cảnh hữu tình" → Xóa, không phải là thông tin.

### Có thể dùng danh sách thì dùng danh sách

Định dạng của thế giới quan nên giống database (cơ sở dữ liệu), không giống tiểu thuyết.

Cách viết sai:
```
Linh căn chia làm năm thuộc tính cơ bản là Kim, Mộc, Thủy, Hỏa, Thổ. Thuộc tính linh căn của người tu luyện quyết định hướng pháp thuật mà họ giỏi. Người tu luyện sở hữu nhiều linh căn mặc dù có thể học nhiều loại pháp thuật hơn, nhưng tốc độ tu luyện sẽ chậm hơn người tu luyện đơn linh căn. Linh căn biến dị là một trường hợp đặc biệt, người tu luyện sở hữu linh căn biến dị thường có những khả năng độc đáo.
```

Cách viết đúng:
```yaml
Linh căn (Spiritual Roots):
  Ngũ hành: Kim, Mộc, Thủy, Hỏa, Thổ.
  Quy tắc: Số lượng linh căn càng ít tu luyện càng nhanh, đơn linh căn là tốt nhất.
  Linh căn biến dị: Năng lực đặc biệt, không bị giới hạn bởi quy tắc thông thường.
```

Ba dòng là giải quyết xong. Lượng thông tin như nhau, lượng token giảm đi ba phần tư.

---

## Bảy: Những sai lầm thường gặp

### Sai lầm 1: Viết thế giới quan thành tiểu thuyết

"Thuở hồng hoang, hỗn mang chưa phân định, trời đất không rõ ràng. Chợt có hai khí Âm Dương sinh ra, khí thanh nhẹ bay lên thành trời, khí vẩn đục chìm xuống thành đất..."

Đây là phần mở đầu tiểu thuyết, không phải Prompt. AI không cần đọc sử thi sáng thế của bạn, nó chỉ cần biết "Thế giới tên là Âm Dương Đại Lục, do hai khí Âm Dương hóa thành".

Nếu bối cảnh sáng thế của bạn có ảnh hưởng đến cốt truyện (ví dụ nhân vật sẽ nhắc đến đoạn lịch sử này), thì hãy viết, nhưng viết bằng định dạng database, không viết bằng định dạng tiểu thuyết.

### Sai lầm 2: Cái gì cũng viết

Một thẻ học đường hiện đại, trong thế giới quan lại viết "Trung Quốc có 1.4 tỷ dân", "Nhật Bản nằm ở Đông Á". AI biết điều đó. Xóa.

Một thẻ tu tiên, viết "Người tu tiên có thể bay", "Rồng rất mạnh". Trong database của AI tu tiên chính là như vậy. Xóa.

Tiêu chuẩn đánh giá luôn là: **Xóa đi AI có diễn sai không? Không thì xóa.**

### Sai lầm 3: Chi tiết bị rò rỉ lên tầng trên

Trong Tổng cương lại viết bối cảnh chi tiết của một NPC nào đó. Trong Xem lướt lại triển khai cuộc đấu tranh nội bộ của một thế lực nào đó.

Tầng trên chỉ để mục lục, tầng dưới mới để nội dung. Nếu bạn đã viết xong cấu trúc nội bộ của Kiếm Tông ngay trong Tổng cương, thì mục chi tiết của Kiếm Tông không còn ý nghĩa tồn tại nữa — và ngay cả khi nhân vật không ở gần Kiếm Tông, những thông tin này vẫn đang thường trú và ăn token.

### Sai lầm 4: Thiếu từ khóa của mục đèn xanh lá

Bạn thiết lập một mục NPC tên là "Lâm Tiểu Vũ", từ khóa chỉ viết là "Lâm Tiểu Vũ". Nhưng trong lúc chat mọi người đều gọi cô ấy là "Tiểu Vũ" hoặc "Lớp trưởng", từ khóa không bao phủ hết, mục sẽ không bao giờ được kích hoạt.

Từ khóa phải bao phủ tất cả các cách gọi có thể.

### Sai lầm 5: Dùng tính từ để lấp đầy

"Kiếm Tông là thánh địa kiếm tu nổi danh nhất trong giới tu tiên, đệ tử của họ kiếm pháp siêu phàm, đạo tâm kiên định, trong các cuộc đại chiến trước đây đã lập nhiều chiến công hiển hách."

Xóa đi. Đổi thành: "Kiếm Tông: Đứng đầu Lục tông, Đạo công phạt."

Vài chữ mang lại lượng thông tin cho AI lớn hơn là ba mươi chữ, vì trong ba mươi chữ đó có hai mươi lăm chữ là từ tu từ, năm chữ mới là thông tin.

---

## Tám: Tóm tắt dễ hiểu

Thế giới quan là Prompt, không phải tập thiết lập. Nó thường trú ở đó ăn token, vì vậy bắt buộc phải tinh gọn.

Loại A (Bối cảnh thực tế): AI đã biết rồi, bạn chỉ viết những gì nó không biết. Một mục là đủ.
Loại B (Thế giới nhỏ): Cho AI biết thế giới của bạn khác với những khuôn mẫu nó đã biết như thế nào. 1 đến 3 mục.
Loại C (Thế giới lớn): Chia nhỏ các mục. Tổng cương và Xem lướt thường trú, chi tiết tải theo nhu cầu.

Yêu cầu ngôn ngữ: Khách quan tuyệt đối (Zero degree), Tả thực (White sketch), định dạng database. Không viết tiểu thuyết, không viết lời vô nghĩa, không viết tính từ, có thể dùng danh sách thì dùng danh sách.

Nén và Tính đầy đủ quan trọng ngang nhau. Nén là dùng ba chữ để nói rõ thông tin của mười chữ, chứ không phải xóa mười điểm thông tin xuống còn ba điểm.

Viết xong hãy tự mình kiểm tra lại một lượt: **Mỗi một câu nếu xóa đi AI có diễn sai không? Không thì xóa.**

# Cấu hình World Info — Để những gì bạn viết thực sự có hiệu lực

Các chương trước dạy bạn cách viết nội dung, chương này dạy bạn cách đặt nội dung đã viết đúng vị trí.

Nhiều người viết thiết lập nhân vật rất hay, kết quả AI hoàn toàn không đọc được. Tại sao? Vì cấu hình World Info (Thế giới thư / Worldbook) bị sai — mục không được kích hoạt, vị trí đặt ngược, không tắt đệ quy (recursion), viết sai từ khóa. Nội dung có tốt đến đâu, AI không nhận được cũng vô ích.

Cấu hình World Info bản thân nó không khó, nhưng nhiều chi tiết, sai một ly đi một dặm. Vì vậy chương này sẽ giải thích cực kỳ chi tiết, đọc xong cứ làm theo là được.

---

## Một: World Info trông như thế nào

Trước tiên hãy hiểu World Info là gì.

Trong Tavern (Tửu quán), World Info là một đống "mục" (entries). Mỗi mục là một đoạn văn bản, có thể là thiết lập thế giới quan, thông tin nhân vật, miêu tả cảnh vật, tài liệu NPC... bất cứ thứ gì cũng được.

Nhưng mấu chốt nằm ở chỗ: **Những mục này không phải tất cả đều gửi một lượt cho AI.** Chúng có quy tắc kích hoạt, vị trí đặt, và thứ tự trước sau riêng. Bạn cấu hình đúng, AI có thể đọc được thông tin đúng lúc cần. Bạn cấu hình sai, AI hoặc là không đọc được, hoặc là đọc được một đống không nên đọc, hoặc là thứ tự đọc bị đảo lộn.

Trước khi bắt tay vào cấu hình, có vài lưu ý nhỏ:

- Tên World Info không được chứa emoji. Các phiên bản Node quá cũ không xử lý được, sẽ khiến toàn bộ World Info biến mất.
- Sau khi sửa mục khác, mục trước đó không hỗ trợ Ctrl+Z để hoàn tác (undo). Lỡ tay xóa nhầm là mất luôn.
- Khuyên bạn nên viết sẵn trong VSCode hoặc Notepad, rồi mới dán vào trình chỉnh sửa World Info trong Tavern.
- Thao tác xóa không thể hoàn tác, nhất định phải cẩn thận.

---

## Hai: Chiến lược kích hoạt — Đèn xanh dương (Blue light) và Đèn xanh lá (Green light)

Mỗi mục World Info đều có một chiến lược kích hoạt, quyết định "khi nào gửi đoạn nội dung này cho AI".

Bạn chỉ cần biết hai loại: **Đèn xanh dương** và **Đèn xanh lá**.

### Đèn xanh dương (Kích hoạt thường trú / Constant)

Đèn xanh dương có nghĩa là: Chỉ cần World Info đang mở, công tắc của mục đang bật, thì đoạn nội dung này sẽ **luôn luôn** được gửi cho AI. Mỗi lượt hội thoại đều gửi, không có điều kiện gì.

Những gì nên để đèn xanh dương? **Những nội dung bắt buộc phải luôn tồn tại.** Ví dụ như Tổng cương thế giới quan, Thiết lập bối cảnh, Xem lướt nhân vật — đây là nền tảng để AI hiểu toàn bộ câu chuyện, thiếu bất kỳ mục nào AI cũng sẽ nói bừa.

### Đèn xanh lá (Kích hoạt bằng từ khóa / Keyword-triggered)

Đèn xanh lá có nghĩa là: Chỉ khi trong lịch sử trò chuyện gần đây xuất hiện "từ khóa" (keywords) bạn đã thiết lập, đoạn nội dung này mới được gửi cho AI.

"Gần đây" là bao xa? Do "Độ sâu quét" (Scan depth) quyết định. Khuyên dùng độ sâu 2, nghĩa là chỉ quét tin nhắn cuối cùng của User và tin nhắn cuối cùng của AI. Nếu trong hai tin nhắn này có từ khóa, mục sẽ được kích hoạt. Không có thì không gửi.

Những gì nên để đèn xanh lá? **Những nội dung tải theo nhu cầu (On-demand).** Ví dụ như tài liệu chi tiết của một NPC nào đó — chỉ khi trong đoạn chat nhắc đến NPC này mới cần gửi cho AI, không nhắc đến thì không cần chiếm token. Cảnh vật, sự kiện, thông tin chi tiết của nhân vật (trong trường hợp thẻ nhiều nhân vật) cũng tương tự.

Định dạng của từ khóa: **Bắt buộc phải cách nhau bằng dấu phẩy tiếng Anh (comma)**. Không được dùng dấu phẩy tiếng Việt, không được dùng dấu cách (space), không được dùng dấu chấm phẩy (semicolon).

- Đúng: `Lâm Tiểu Vũ,Tiểu Vũ,Lớp trưởng`
- Sai: `Lâm Tiểu Vũ，Tiểu Vũ，Lớp trưởng` (Dấu phẩy double-byte, không kích hoạt)
- Sai: `Lâm Tiểu Vũ Tiểu Vũ Lớp trưởng` (Dấu cách, không kích hoạt)

Đây là lỗi rất phổ biến, nhiều người cấu hình xong thấy mục đèn xanh lá sống chết không kích hoạt, đi kiểm tra lại, mười phần thì chín phần là do dùng sai dấu phẩy.

### Hai vấn đề đã biết của Đèn xanh lá

Đèn xanh lá đôi khi gặp hạn chế với hai vấn đề mâu thuẫn nhau:

**Bỏ sót kích hoạt:** Cốt truyện rõ ràng đang viết về một nhân vật nào đó, nhưng hai tin nhắn gần nhất lại vừa vặn không nhắc đến từ khóa (ví dụ dùng đại từ "cô ấy" thay vì tên), mục sẽ không được kích hoạt, AI không đọc được tài liệu của nhân vật này, bắt đầu "đã xem và trả lời bừa".

**Kích hoạt quá mức:** Một khi đã giới thiệu một nhân vật nào đó, AI mỗi lần trả lời đều sẽ nhắc đến tên nhân vật này, từ khóa mỗi lượt đều bị kích hoạt, mục đó cứ treo ở đó mãi. Vốn dĩ chỉ muốn cho nó thỉnh thoảng xuất hiện, kết quả nó bám riết không buông.

Bởi vì hai vấn đề này, đối với các thẻ nhân vật đơn giản, đèn xanh vẫn đủ dùng.

---

## Ba: Vị trí — Đặt mục ở đâu

Vị trí quyết định nội dung mục sẽ được đặt ở đâu trong toàn bộ đoạn Prompt mà AI nhận được.

Bạn chỉ cần dùng ba vị trí, những vị trí khác đừng đụng vào.

### Trước định nghĩa nhân vật (World Info before)

Đặt **Thế giới quan lớn**: Tổng cương thế giới quan, thiết lập bối cảnh, môi trường thời đại, thông vị trí địa lý, quy tắc xã hội, hệ thống ma thuật... những thứ mang tính vĩ mô.

Đây là khung sườn để AI hiểu toàn bộ thế giới. AI phải đọc xem thế giới trông như thế nào trước, rồi mới đọc xem nhân vật trông như thế nào, thứ tự như vậy mới đúng.

### Sau định nghĩa nhân vật (World Info after)

Đặt **Thế giới quan nhỏ**: Thông tin chi tiết của nhân vật, tài liệu NPC, miêu tả cảnh vật, thiết lập vật phẩm, thiết lập sự kiện... những thứ cụ thể.

Thông tin nhân vật đặt sau định nghĩa nhân vật, là vì phần miêu tả nhân vật (Description) trong Tavern bản thân nó đã nằm ở vị trí định nghĩa nhân vật, mục World Info của bạn là phần bổ sung và mở rộng cho nó, đặt ở phía sau đọc sẽ liền mạch.

### Độ sâu bánh răng D 0 (D0 / Depth 0)

Vị trí này khá đặc biệt. Nó được đặt ở **dưới cùng của toàn bộ lịch sử trò chuyện**, tức là đoạn nội dung cuối cùng mà AI đọc được trước khi trả lời. Vì là phần đọc cuối cùng nên nó có sức ảnh hưởng lớn nhất.

D0 không dùng để đặt thiết lập. Nó dùng để **trực tiếp chỉ đạo hành vi của AI**.

Chỉ đạo trực tiếp hành vi của AI là sao? Ví dụ:

- Cách viết thiết lập: "Anh ấy có thói quen uống sữa mỗi sáng" → Đây là thiết lập, đặt ở World Info before hoặc after.
- Cách viết chỉ đạo: "Khi cốt truyện tiến triển đến buổi sáng, hãy miêu tả cảnh nhân vật này uống sữa" → Đây là chỉ đạo, đặt ở D0.

Công dụng tiêu biểu nhất của D0 là **Giải thích lần hai (Secondary Explanation)** — khi bạn thấy AI luôn hiểu sai một đặc điểm nào đó của nhân vật, hãy viết một đoạn điều chỉnh ở D0. Vì D0 là nội dung AI đọc cuối cùng, nên hiệu quả điều chỉnh là mạnh nhất.

Lưu ý: Role (vai trò) của bánh răng D phải chọn là `system`.

### D1, D2, D3... Không đặt bất cứ thứ gì

Điều này vô cùng quan trọng. **Ngoài độ sâu D0, không đặt bất cứ thứ gì ở các độ sâu khác.**

Tại sao? Vì Cài đặt sẵn (Preset) sẽ gói lịch sử trò chuyện lại, nói với AI "Đây là lịch sử tương tác của các bạn". D1 nằm giữa tin nhắn cuối cùng và tin nhắn áp chót. Nếu bạn chèn một đoạn thiết lập thế giới quan vào vị trí đó, đối với AI sẽ giống như: Đang trò chuyện giữa chừng tự nhiên mọc ra một đống sách hướng dẫn, rồi cuộc trò chuyện lại tiếp tục.

Điều này sẽ can nhiễu nghiêm trọng đến việc hiểu cốt truyện của AI. Nó không phân biệt được đoạn văn bản đột nhiên xuất hiện đó là thiết lập hay là một phần của cốt truyện, chất lượng đầu ra sẽ giảm rõ rệt.

Vậy nên hãy nhớ: **D0 có thể dùng, D1 trở lên tuyệt đối không đụng vào.**

---

## Bốn: Thứ tự — Trình tự trước sau giữa các mục

Trong cùng một vị trí, thứ tự trước sau của nhiều mục được quyết định bởi con số "Thứ tự" (Order).

Thứ tự càng lớn càng nằm phía sau. Bạn có thể hiểu là "xếp thứ mấy".

Phân bổ thứ tự được đề xuất:

- Tổng cương thế giới quan: Thứ tự 1
- Xem lướt khu vực, Thiết lập bối cảnh: Thứ tự 2-3
- Xem lướt nhân vật: Thứ tự 4
- Cảnh vật, Chi tiết sự kiện: Thứ tự 50-98
- Thông tin chi tiết nhân vật cốt lõi: Thứ tự 99
- NPC: Thứ tự 100

Tại sao lại sắp xếp như vậy? Vì AI đọc Prompt từ trên xuống dưới (trong cùng một vị trí). Đọc khung sườn thế giới quan lớn trước, rồi đọc xem lướt nhân vật để biết có những ai, sau đó gặp cảnh vật và sự kiện cụ thể thì tải chi tiết theo nhu cầu, cuối cùng là thông tin hoàn chỉnh của nhân vật cốt lõi.

Nếu là thẻ nhân vật đơn (Single character card), các mục được chia nhỏ của nhân vật có thể sắp xếp theo logic của riêng bạn: Thông tin cơ bản 10 → Ngoại hình 20 → Tính cách 30 → Bối cảnh 40 → NSFW 50. Số do bạn định, đảm bảo đúng thứ tự là được.

---

## Năm: Cài đặt đệ quy (Recursion) — Tất cả các mục đều phải tick chọn

Không cần hiểu nguyên lý của phần này, chỉ cần nhớ một câu:

**Tất cả các mục World Info, đều phải đồng thời tick chọn "Không thể đệ quy" (Non-recursive) và "Ngăn đệ quy tiếp theo" (Prevent recursive scanning).**

Dù là đèn xanh dương hay đèn xanh lá, dù ở vị trí nào, thứ tự nào, hai dấu tick này bắt buộc phải có.

Tại sao? Vì nếu không tick, nếu trong nội dung của mục đèn xanh lá A xuất hiện từ khóa của mục đèn xanh lá B, B sẽ bị kích hoạt theo. Trong nội dung của B lại xuất hiện từ khóa của C, C cũng bị kích hoạt. Cứ thế nối tiếp nhau, giống như hiệu ứng Domino, cuối cùng toàn bộ các mục đèn xanh lá đều được kích hoạt, nổ tung token, AI sẽ sập luôn.

Tick vào hai tùy chọn này sẽ ngắt đứt phản ứng dây chuyền này. Không cần suy nghĩ có nên tick hay không, cứ tick hết là đúng.

---

## Sáu: Thẻ nhân vật đơn và thẻ nhiều nhân vật — Bắt buộc phải phán đoán trước khi cấu hình

Trước khi cấu hình bất kỳ mục nào, bạn bắt buộc phải phán đoán một điều: **Trong World Info của bạn có mấy nhân vật cốt lõi?**

Nhân vật cốt lõi ở đây chỉ nhân vật thiết lập chính (Main character), không phải NPC.

**Phân biệt quan trọng: Các mục chia nhỏ của cùng một nhân vật không được tính là "nhân vật khác nhau".**

Bạn chia thiết lập của Lâm Tiểu Vũ thành các mục thông tin cơ bản, ngoại hình, tính cách, bối cảnh, NSFW. Năm mục này đều miêu tả một mình Lâm Tiểu Vũ, vì vậy đây là thẻ nhân vật đơn. Không phải vì có năm mục mà nó biến thành thẻ năm nhân vật.

Chỉ khi các mục miêu tả **các nhân vật độc lập khác nhau**, thì mới tính là thẻ nhiều nhân vật (Multi-character card). Ví dụ đồng thời có Lâm Tiểu Vũ và Triệu Minh Nguyệt là hai nhân vật chính, thì đó là thẻ nhiều nhân vật.

### Thẻ nhân vật đơn (Chỉ có 1 nhân vật cốt lõi)

**Tất cả các mục của nhân vật đó, toàn bộ để đèn xanh dương (thường trú). Bất kể chia thành bao nhiêu mục.**

Đây là sai lầm dễ mắc phải nhất. Thấy mục của nhân vật bị chia thành năm sáu mục, cảm thấy "Chà nhiều quá, hay là đổi vài mục thành đèn xanh lá để tiết kiệm token nhỉ".

**Tuyệt đối không được.**

Những mục này tuy bị chia tách, nhưng đều là thiết lập của cùng một nhân vật. Thông tin cơ bản và tính cách bị tách ra, nhưng AI bắt buộc phải đồng thời biết cả hai mới có thể diễn đúng nhân vật. Bạn đổi mục tính cách thành đèn xanh lá, thì khi trong đoạn chat vừa vặn không nhắc đến từ khóa kích hoạt, AI sẽ không đọc được tính cách nữa — nó biết người này tên gì, trông như thế nào, nhưng không biết cô ấy có tính cách gì. Lúc này nó chỉ có thể đoán, mà kết quả của việc đoán là nói theo khuôn sáo (văn mẫu).

**Thẻ nhân vật đơn, tất cả các mục toàn bộ đèn xanh dương. Đây là quy luật thép.**

### Thẻ nhiều nhân vật (Có từ 2 nhân vật cốt lõi trở lên)

Logic cấu hình của thẻ nhiều nhân vật thì khác:

- **Xem lướt nhân vật**: Đèn xanh dương (thường trú). Giới thiệu vắn tắt của tất cả các nhân vật đặt cùng nhau, để AI luôn biết trong thế giới có những ai.
- **Thông tin chi tiết từng nhân vật**: Đèn xanh lá (kích hoạt bằng từ khóa). Từ khóa thiết lập là tên nhân vật, biệt danh, ngoại hiệu. Chỉ khi trong đoạn chat nhắc đến nhân vật nào, mới tải thiết lập hoàn chỉnh của nhân vật đó.

Nguyên lý rất đơn giản: AI xem lướt trước, biết có hai người là Lâm Tiểu Vũ và Triệu Minh Nguyệt. Khi trong đoạn chat nhắc đến "Tiểu Vũ", thông tin chi tiết của Lâm Tiểu Vũ được kích hoạt, AI sẽ biết cách diễn cô ấy. Khi trong đoạn chat nhắc đến "Minh Nguyệt", thông tin chi tiết của Triệu Minh Nguyệt được kích hoạt. Nhân vật không được nhắc đến thì không chiếm token.

---

## Bảy: Giải thích chi tiết cấu hình các loại mục

Bây giờ sẽ nói rõ từng loại mục cần cấu hình như thế nào.

### Thế giới quan / Thiết lập bối cảnh

- Vị trí: Trước định nghĩa nhân vật (World Info before)
- Kích hoạt: Đèn xanh dương (thường trú)
- Thứ tự: 1-3 (Sắp xếp theo độ quan trọng, quan trọng nhất đặt lên đầu)
- Đệ quy: Không thể đệ quy + Ngăn đệ quy tiếp theo

Thế giới quan là nền tảng để AI hiểu mọi thứ, bắt buộc phải luôn tồn tại. Dù cuộc đối thoại đi đến đâu, AI đều cần biết thế giới này trông như thế nào.

Nếu thế giới quan chia thành nhiều mục (ví dụ Tổng cương một mục, Thiết lập khu vực một mục, Quy tắc xã hội một mục), thì xếp theo độ quan trọng: Tổng cương thứ tự 1, Khu vực thứ tự 2, Quy tắc xã hội thứ tự 3.

### Xem lướt nhân vật

- Vị trí: Trước định nghĩa nhân vật (World Info before)
- Kích hoạt: Đèn xanh dương (thường trú)
- Thứ tự: 4
- Đệ quy: Không thể đệ quy + Ngăn đệ quy tiếp theo

Xem lướt nhân vật là một câu giới thiệu ngắn gọn về tất cả các nhân vật, để AI biết trong thế giới có những ai. Thẻ nhiều nhân vật bắt buộc phải có mục này, thẻ nhân vật đơn có thể có hoặc không.

Tại sao lại đặt trước định nghĩa nhân vật? Vì xem lướt là thông tin mang tính vĩ mô — "Trong thế giới này có những ai". AI biết có những ai trước, rồi mới đọc thông tin cụ thể của từng nhân vật.

### Thông tin chi tiết nhân vật cốt lõi

Đây chính là thiết lập hoàn chỉnh của nhân vật — Thông tin cơ bản, Ngoại hình, Tính cách, Bối cảnh, Kỹ năng, NSFW v.v., có thể được chia thành nhiều mục.

- Vị trí: Sau định nghĩa nhân vật (World Info after)
- Kích hoạt:
  - Thẻ nhân vật đơn → **Toàn bộ đèn xanh dương** (Nhấn mạnh lại lần nữa, bất kể chia thành bao nhiêu mục, đều là cùng một nhân vật, bắt buộc phải thường trú)
  - Thẻ nhiều nhân vật → Đèn xanh lá (Từ khóa thiết lập là tên nhân vật, biệt danh, ngoại hiệu)
- Thứ tự: 99 (Nếu là thẻ nhân vật đơn bị chia nhỏ, có thể xếp theo logic: Cơ bản 10 → Ngoại hình 20 → Tính cách 30 → Bối cảnh 40)
- Đệ quy: Không thể đệ quy + Ngăn đệ quy tiếp theo

### Giải thích lần hai (Secondary Explanation)

Giải thích lần hai dùng để điều chỉnh lại sự hiểu lầm của AI về nhân vật. Ví dụ AI luôn viết nhân vật của bạn quá ngoan ngoãn, bạn có thể viết trong Giải thích lần hai là "Nhân vật này sẽ không chủ động nhượng bộ, dù đối mặt với áp lực cũng sẽ kiên trì lập trường của mình".

- Vị trí: Bánh răng D độ sâu 0 (Role chọn `system`)
- Kích hoạt: Đèn xanh lá (Từ khóa thiết lập là tên nhân vật)
- Thứ tự: 1 (Nếu có Giải thích lần hai của nhiều nhân vật, xếp theo thứ tự: Nhân vật A là 1, Nhân vật B là 2)
- Đệ quy: Không thể đệ quy + Ngăn đệ quy tiếp theo

Tại sao Giải thích lần hai đặt ở D0? Vì nó là chỉ đạo điều chỉnh trực tiếp đối với AI, cần sức ảnh hưởng mạnh nhất. D0 là vị trí AI đọc cuối cùng, hiệu quả tốt nhất.

Tại sao dùng đèn xanh lá thay vì đèn xanh dương? Vì Giải thích lần hai là sự điều chỉnh dành riêng cho một nhân vật cụ thể. Khi trong đoạn chat nhắc đến nhân vật này mới cần điều chỉnh, không nhắc đến thì không cần. Hơn nữa nếu là thẻ nhiều nhân vật, tất cả Giải thích lần hai đều đèn xanh dương, D0 sẽ chất đống một mớ lệnh điều chỉnh, ngược lại làm phân tán sự chú ý.

### NPC

- Vị trí: Sau định nghĩa nhân vật (World Info after)
- Kích hoạt: Đèn xanh lá (Từ khóa thiết lập là tên NPC, ngoại hiệu, biệt danh, chức vụ v.v. tất cả các cách gọi có thể được nhắc đến)
- Thứ tự: 100
- Đệ quy: Không thể đệ quy + Ngăn đệ quy tiếp theo

NPC là vai phụ, chỉ xuất hiện khi cần thiết. Nhắc đến trong chat mới tải, không nhắc đến thì không chiếm token.

Từ khóa phải bao phủ toàn diện. Ví dụ một NPC tên là Vương Tĩnh, là giáo viên chủ nhiệm, mọi người gọi cô ấy là Cô giáo Vương. Thì từ khóa thiết lập là: `Vương Tĩnh,Cô giáo Vương,Giáo viên chủ nhiệm`. Bỏ sót bất kỳ cách gọi nào cũng có thể dẫn đến việc lúc cần kích hoạt lại không kích hoạt.

### Cảnh vật / Sự kiện

- Vị trí: Sau định nghĩa nhân vật (World Info after)
- Kích hoạt: Đèn xanh lá (Từ khóa thiết lập là tên cảnh vật, địa danh, tên sự kiện, các từ liên quan)
- Thứ tự: 50-98
- Đệ quy: Không thể đệ quy + Ngăn đệ quy tiếp theo

Cảnh vật và sự kiện cũng được tải theo nhu cầu. Khi đến thư viện mới cần biết thư viện trông như thế nào, không đi thì không cần.

Từ khóa cũng phải bao phủ tất cả các cách đề cập có thể. Từ khóa của "Thư viện trường" có thể thiết lập là: `Thư viện,Thư viện trường,Mượn sách`. Thêm "Mượn sách" là vì khi nhân vật nói "đi mượn sách" có thể sẽ không nhắc đến tên cảnh vật, nhưng bạn biết họ sẽ đi thư viện.

---

## Tám: Thiết kế từ khóa

Từ khóa viết không tốt, đèn xanh lá chỉ là đồ trang trí.

Nguyên tắc cốt lõi: **Bao phủ tất cả các cách xưng hô có thể được nhắc đến.**

Từ khóa của mục nhân vật: Tên đầy đủ, biệt danh, ngoại hiệu. Ví dụ từ khóa của Thu Minh Nguyệt: `Thu Minh Nguyệt,Minh Nguyệt`. Nếu mọi người còn gọi cô ấy là "Nguyệt Nguyệt" hoặc "Chị Thu", thì thêm vào: `Thu Minh Nguyệt,Minh Nguyệt,Nguyệt Nguyệt,Chị Thu`.

Từ khóa của mục NPC: Tên đầy đủ, biệt danh, ngoại hiệu, chức vụ. Ví dụ Vương Tĩnh là giáo viên chủ nhiệm: `Vương Tĩnh,Cô giáo Vương,Giáo viên chủ nhiệm`.

Từ khóa của mục cảnh vật: Tên cảnh vật, tên khu vực đặt cảnh vật, tên gọi khác, hành động liên quan. Ví dụ: `Hồng Trần Tửu Gia,Tửu gia,Hồng Trần,Uống rượu`. Thêm "Uống rượu" là vì nhân vật nói "đi uống rượu" có thể sẽ không nhắc đến tên cảnh vật, nhưng bạn biết họ sẽ đến tửu gia.

Từ khóa của mục thế lực: Tên đầy đủ, tên viết tắt, địa danh đặt trụ sở. Ví dụ: `Thiên Kiếm Thánh Địa,Thiên Kiếm Phong,Thiên Kiếm`.

**Nhấn mạnh lại định dạng: Ngăn cách bằng dấu phẩy tiếng Anh, không được có dấu cách.**

- Đúng: `Lâm Tiểu Vũ,Tiểu Vũ,Lớp trưởng`
- Sai: `Lâm Tiểu Vũ，Tiểu Vũ，Lớp trưởng`
- Sai: `Lâm Tiểu Vũ, Tiểu Vũ, Lớp trưởng` (Sau dấu phẩy có khoảng trắng cũng không được)

---

## Chín: Ví dụ cấu hình hoàn chỉnh

### Ví dụ A: Thẻ nhân vật đơn

Thiết lập nhân vật Lâm Tiểu Vũ được chia thành năm mục. Chỉ có một nhân vật cốt lõi, vì vậy tất cả đều là đèn xanh dương.

Đèn xanh dương, Sau định nghĩa nhân vật (World Info after):
1. Lâm Tiểu Vũ_Thông tin cơ bản (Thứ tự 10)
2. Lâm Tiểu Vũ_Ngoại hình (Thứ tự 20)
3. Lâm Tiểu Vũ_Tính cách (Thứ tự 30)
4. Lâm Tiểu Vũ_Bối cảnh (Thứ tự 40)
5. Lâm Tiểu Vũ_NSFW (Thứ tự 50)

Đèn xanh dương, Bánh răng D độ sâu 0 (D0):
6. Lâm Tiểu Vũ_Giải thích lần hai (Thứ tự 1)

Tất cả các mục đều tick chọn: Không thể đệ quy + Ngăn đệ quy tiếp theo.

Lưu ý: Mặc dù chia thành năm mục, nhưng tất cả đều là đèn xanh dương. Vì năm mục này đều miêu tả một người là Lâm Tiểu Vũ. Đừng vì thấy nhiều mục mà muốn đổi thành đèn xanh lá để tiết kiệm token.

### Ví dụ B: Thẻ nhiều nhân vật

Hai nhân vật cốt lõi là Lâm Tiểu Vũ và Triệu Minh Nguyệt, cộng thêm Thế giới quan, Cảnh vật và NPC.

Đèn xanh dương, Trước định nghĩa nhân vật (World Info before):
1. Thiết lập thế giới quan (Thứ tự 1)
2. Bối cảnh trường học (Thứ tự 2)
3. Xem lướt nhân vật (Thứ tự 4)

Đèn xanh lá, Sau định nghĩa nhân vật (World Info after), Thứ tự 50-98:
4. Cảnh vật_Thư viện trường (Thứ tự 80, Từ khóa: `Thư viện`)
5. Cảnh vật_Nhà Lâm Tiểu Vũ (Thứ tự 80, Từ khóa: `Nhà Lâm Tiểu Vũ,Nhà Tiểu Vũ`)

Đèn xanh lá, Bánh răng D độ sâu 0 (D0):
6. Lâm Tiểu Vũ_Giải thích lần hai (Thứ tự 1, Từ khóa: `Lâm Tiểu Vũ,Tiểu Vũ`)
7. Triệu Minh Nguyệt_Giải thích lần hai (Thứ tự 2, Từ khóa: `Triệu Minh Nguyệt,Minh Nguyệt`)

Đèn xanh lá, Sau định nghĩa nhân vật (World Info after), Thứ tự 99:
8. Lâm Tiểu Vũ_Thông tin cơ bản (Từ khóa: `Lâm Tiểu Vũ,Tiểu Vũ`)
9. Lâm Tiểu Vũ_Tính cách (Từ khóa: `Lâm Tiểu Vũ,Tiểu Vũ`)
10. Triệu Minh Nguyệt_Thông tin cơ bản (Từ khóa: `Triệu Minh Nguyệt,Minh Nguyệt`)
11. Triệu Minh Nguyệt_Tính cách (Từ khóa: `Triệu Minh Nguyệt,Minh Nguyệt`)

Đèn xanh lá, Sau định nghĩa nhân vật (World Info after), Thứ tự 100:
12. NPC_Cô giáo Vương (Từ khóa: `Vương Tĩnh,Cô giáo Vương,Giáo viên chủ nhiệm`)

Tất cả các mục đều tick chọn: Không thể đệ quy + Ngăn đệ quy tiếp theo.

Bạn thấy sự khác biệt chưa? Trong thẻ nhiều nhân vật, thông tin chi tiết của hai nhân vật cốt lõi được kích hoạt bằng đèn xanh lá, chỉ tải khi nhắc đến nhân vật tương ứng. Nhưng Xem lướt nhân vật thì để đèn xanh dương, AI luôn biết thế giới này có ai.

---

## Mười: Xác suất / Độ dính / Thời gian hồi (Probability/Sticky/Cooldown)

Ba tùy chọn này có thể nhìn thấy trong phần cài đặt mục, nhưng cơ bản là không dùng đến. Cứ để mặc định là được, không cần đụng tới chúng.

---

## Mười một: Tóm tắt dễ hiểu

Nói cho cùng thì cấu hình World Info chỉ có mấy việc sau:

**Phán đoán loại thẻ trước khi cấu hình.** Đếm xem bạn có mấy nhân vật cốt lõi. Cùng một nhân vật bị chia thành mười mục thì vẫn là một nhân vật.

**Thẻ nhân vật đơn dùng toàn bộ đèn xanh dương.** Đây là quy luật thép. Đừng vì nhiều mục mà đổi sang đèn xanh lá. Thiếu bất kỳ mục nào, nhân vật sẽ không trọn vẹn, AI sẽ bắt đầu nói bừa.

**Thẻ nhiều nhân vật: Xem lướt để đèn xanh dương, Chi tiết để đèn xanh lá.** AI luôn biết có những ai, dùng đến ai mới tải thông tin chi tiết của người đó.

**Thế giới quan lớn đặt trước định nghĩa nhân vật, Thế giới quan nhỏ đặt sau định nghĩa nhân vật.** Khung sườn trước chi tiết sau, AI đọc sẽ thuận.

**D0 dùng để chỉ đạo, D1 trở lên không đụng vào.** D0 là vị trí đọc cuối cùng, có sức ảnh hưởng lớn nhất, dùng để điều chỉnh sự hiểu lầm của AI. Các độ sâu khác sẽ phá vỡ tính toàn vẹn của lịch sử trò chuyện, đừng nhét bất cứ thứ gì vào đó.

**Tất cả các mục đều tick hai tùy chọn đệ quy.** Không thể đệ quy + Ngăn đệ quy tiếp theo. Không cần nghĩ tại sao, cứ tick hết.

**Từ khóa dùng dấu phẩy tiếng Anh để ngăn cách, bao phủ tất cả cách xưng hô.** Tên, biệt danh, ngoại hiệu, chức vụ, tên gọi khác, nghĩ ra được bao nhiêu thì viết hết bấy nhiêu. Nếu dùng dấu phẩy tiếng Việt hoặc khoảng trắng để ngăn cách, từ khóa sẽ trực tiếp vô hiệu.