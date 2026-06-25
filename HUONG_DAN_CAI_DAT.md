# 🔧 Hướng dẫn cài đặt Machine Tracker

## Tổng quan hệ thống
```
[Điện thoại - App PWA]
       ↕ Giọng nói
[Web Speech API - Chrome]
       ↕ Text
[Gemini 1.5 Flash API] → Trích xuất thông tin
       ↕ JSON
[Google Apps Script] → Lưu vào Google Sheets
```

---

## BƯỚC 1 — Lấy Gemini API Key (miễn phí)

1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập Google → Nhấn **"Create API key"**
3. Copy key (dạng `AIzaSy...`)

---

## BƯỚC 2 — Tạo Google Apps Script Backend

1. Truy cập: https://script.google.com
2. Nhấn **"New project"**
3. Xoá code mẫu, dán toàn bộ nội dung file `apps-script.gs` vào
4. Tạo Google Sheet mới tại sheets.google.com
5. Copy ID từ URL của Sheet (phần giữa `/d/` và `/edit`)
   - VD: `https://docs.google.com/spreadsheets/d/`**`1BxiM...`**`/edit`
6. Dán ID vào dòng `const SHEET_ID = '...'` trong Apps Script
7. Nhấn **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Nhấn **Deploy** → Copy URL web app

---

## BƯỚC 3 — Cài đặt trong App

1. Mở `index.html` trong Chrome
2. Nhấn icon **⚙️** góc phải header
3. Điền:
   - **Gemini API Key**: key từ Bước 1
   - **Google Apps Script URL**: URL từ Bước 2
   - **Tên nhà máy**: tên đơn vị của bạn
4. Nhấn **Lưu cài đặt**

---

## BƯỚC 4 — Cài lên điện thoại (PWA)

### Cách A: GitHub Pages (khuyên dùng)
1. Tạo tài khoản GitHub miễn phí
2. Tạo repository mới, upload tất cả file trong thư mục MachineTracker
3. Vào Settings → Pages → Source: main branch
4. App sẽ chạy tại: `https://[username].github.io/[repo-name]`
5. Trên điện thoại: mở URL → Chrome menu → **"Add to Home screen"**

### Cách B: Chạy cục bộ (test nhanh)
1. Cài Node.js (nodejs.org)
2. Mở terminal trong thư mục MachineTracker:
   ```
   npx serve .
   ```
3. Mở trình duyệt theo địa chỉ hiển thị

---

## Cách sử dụng Voice Input

### Ví dụ câu nói:
- **"Máy BBC101 ca hai, vận hành Nguyễn Văn A, tổng sản lượng 500"**
- **"Dừng máy 15 phút do lỗi E001 móp bát, đã xử lý xong"**
- **"MX02 dừng 30 phút thiếu nguyên liệu, đang xử lý, người xử lý Trần Thị B"**

### Quy trình:
1. Nhấn 🎤 → Nói thông tin
2. Nhấn lại 🎤 để dừng
3. Nhấn **✨ Phân tích bằng AI**
4. Kiểm tra thông tin đã điền (ô màu xanh = do AI điền)
5. Nhấn **💾 Lưu phiếu**

---

## Bảng mã lỗi mặc định

| Mã  | Tên lỗi              | Danh mục          |
|-----|---------------------|-------------------|
| E001| Móp bát / hộp       | Chất lượng        |
| E002| Lỗi tem nhãn        | Chất lượng        |
| E003| Thiếu trọng lượng   | Chất lượng        |
| E004| Kẹt băng tải        | Cơ khí            |
| E005| Lỗi đầu hàn/ghép mí | Cơ khí            |
| E006| Thay khuôn          | Cơ khí            |
| E007| Lỗi cảm biến        | Điện - Điều khiển |
| E008| Lỗi nguồn điện      | Điện - Điều khiển |
| E009| Lỗi phần mềm        | Điện - Điều khiển |
| E010| Thiếu nguyên liệu   | Vật tư            |
| E011| Bảo trì định kỳ(PM)| Bảo trì           |
| E012| Vệ sinh máy         | Bảo trì           |
| E013| Chờ QC kiểm tra     | Quy trình         |
| E014| Chờ lệnh sản xuất   | Quy trình         |
| E015| Sự cố khác          | Khác              |

---

## Chi phí (hoàn toàn miễn phí)

| Dịch vụ | Giới hạn miễn phí |
|---------|-------------------|
| Gemini 1.5 Flash | 15 req/phút, 1 triệu token/ngày |
| Google Apps Script | 6 giờ chạy/ngày, 20.000 URL fetch |
| Google Sheets | 10 GB storage |
| GitHub Pages | Không giới hạn (repo public) |

---

## Hỗ trợ
Nếu có vấn đề, kiểm tra:
- Console trình duyệt (F12) để xem lỗi chi tiết
- Gemini API Key có đúng không
- Apps Script đã Deploy chưa
- Chrome có quyền microphone chưa
