---
name: omeu-design
description: Dùng skill này khi thiết kế hoặc code bất kỳ UI nào cho hệ thống MDM/MAG của OneMount (portal back-office, listing, detail page, form, bảng dữ liệu, luồng phê duyệt). Enterprise UI trầm tính, dày dữ liệu, một accent nâu đồng duy nhất, copy tiếng Việt.
---

# OMEU Design System — Skill

Bạn đang thiết kế cho **OMEU**, design system sản phẩm của OneMount, đang được
dùng bởi **MAG portal** (MDM của Masterise Group). Tính cách hệ thống:
**đáng tin, chính xác, im lặng** — giao diện lùi lại phía sau để dữ liệu và
hành động nổi lên.

Ba nguyên tắc chi phối mọi quyết định:

1. **Màu = ý nghĩa.** Không bao giờ là trang trí.
2. **Phẳng.** Phân cấp đến từ tone bề mặt + viền 1px, không phải đổ bóng.
3. **Nhịp 8px.** Mọi khoảng cách đến từ thang spacing, không có số lẻ.

---

## 1. Non-negotiables (kiểm tra trước khi commit)

- [ ] Font **Roboto** cho toàn bộ UI. **JetBrains Mono** cho số, mã, ngày/giờ, version.
- [ ] Chỉ **một** accent nâu đồng `#AE7129`, dùng cho **một** hành động primary / trạng thái selected mỗi màn hình. Còn lại neutral.
- [ ] Chỉ **hai** bán kính: `4px` (button, input, control) và `8px` (card, container), cộng `100px` cho pill status tag. Không có bán kính nào khác.
- [ ] **Không đổ bóng** trên card, panel, header. Shadow chỉ cho pop-over/dropdown/snackbar.
- [ ] Nền trang: grey `#EBECED` (listing) hoặc white `#FFFFFF` (detail). **Không** gradient, ảnh, texture, nền màu kem/pastel.
- [ ] Icon: **Material Symbols Outlined** (ligature, wght 300). FILL 1 khi selected. Không emoji, không SVG vẽ tay.
- [ ] Copy tiếng Việt đủ dấu, sentence case, giọng vô ngã (không "tôi"/"bạn"). Enum trạng thái theo data model có thể để ALL-CAPS tiếng Anh.
- [ ] Transition 120ms ease cho màu/nền. Không scale, không bounce, không loop trang trí.
- [ ] Không hard-code hex — luôn dùng `var(--*)`.

---

## 2. Token (copy nguyên khối này nếu chưa có file token)

```css
:root {
  /* ---------- Brand — nâu đồng (BrandMH) ---------- */
  --color-primary-900: #371C11;
  --color-primary-800: #704223;
  --color-primary-700: #64300D;  /* press */
  --color-primary-600: #9C5C10;  /* hover */
  --color-primary-500: #AE7129;  /* BRONZE — accent duy nhất */
  --color-primary-400: #D1A03E;
  --color-primary-300: #DDBA67;
  --color-primary-200: #F3EBCE;
  --color-primary-100: #F7F2ED;  /* wash cho hàng selected / secondary btn */

  /* ---------- Neutral — xương sống cấu trúc ---------- */
  --color-neutral-900: #212121;  /* text chính, viền strong */
  --color-neutral-800: #757575;  /* text phụ, icon default */
  --color-neutral-700: #BBBBBB;  /* hint / disabled text */
  --color-neutral-600: #BFBFBF;  /* viền hover */
  --color-neutral-500: #E6E6E6;  /* VIỀN DEFAULT 1px */
  --color-neutral-400: #EBECED;  /* nền trang listing */
  --color-neutral-300: #F2F2F2;
  --color-neutral-200: #F5F5F5;
  --color-neutral-100: #F9F9F9;  /* table header, hover row */
  --white: #FFFFFF;

  /* ---------- Status — chỉ mang ý nghĩa ---------- */
  --color-info-500:    #3062EB;  --color-info-100:    #EAEDF6;
  --color-success-500: #4CAF50;  --color-success-100: #EDF7ED;
  --color-warning-500: #F0930D;  --color-warning-100: #FEF4E7;
  --color-error-500:   #E73722;  --color-error-100:   #FED5D0;

  /* ---------- Type ---------- */
  --font-body: "Roboto", system-ui, sans-serif;
  --font-code: "JetBrains Mono", ui-monospace, monospace;

  /* ---------- Spacing — nhịp 8px + micro 2/4 ---------- */
  --spacing-3xs: 2px;  --spacing-2xs: 4px;  --spacing-xs: 8px;
  --spacing-sm: 12px;  --spacing-md: 16px;  --spacing-lg: 20px;
  --spacing-xl: 24px;  --spacing-2xl: 28px; --spacing-3xl: 32px;
  --spacing-4xl: 40px;

  /* ---------- Radius — chỉ ba giá trị ---------- */
  --border-xs: 4px;  --border-sm: 8px;  --border-pill: 100px;

  /* ---------- Shadow — dùng rất tiết chế ---------- */
  --shadow-xs: 0 1px 2px 0 rgba(0,0,0,.05);
  --shadow-sm: 0 1px 3px 0 rgba(0,0,0,.10), 0 1px 2px -1px rgba(0,0,0,.10);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,.10), 0 2px 4px -2px rgba(0,0,0,.10);
}
```

Nếu dự án đã có `styles.css` của OMEU thì **chỉ link nó** và dùng role token
tier-3, đừng khai lại primitive:

```
--color-bg-base-page | --color-bg-base-page-alt
--color-bg-surface-fill-{neutral|primary|info|success|warning|error}-{default|hover|press|light-default|table-header|disable}
--color-border-{neutral|primary|success|info|warning|error}-{default|hover|selected|light-default}
--color-text-{neutral-strong|neutral-medium|neutral-light|primary|success|error|on-primary|disabled}
--color-icon-{default|primary|success|warning|error|on-primary|disabled}
```

### Font loading

```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0..1,0" rel="stylesheet">
<style>
  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
  }
</style>
```

---

## 3. Thang typography

| Role | Size / Line / Weight | Dùng cho |
|---|---|---|
| Display | 48 / 56 / 700 | Tên trang lớn (hiếm) |
| Headline LG | 32 / 40 / 600 | Header module |
| Headline MD | 24 / 32 / 600 | **Tên record ở detail page** |
| Title LG | 20 / 28 / 500 | Header card / nhóm |
| Title MD | 18 / 24 / 500 | Sub-header |
| Body LG | 16 / 24 / 400 | Đoạn đọc |
| **Body MD** | **14 / 20 / 400** | **Workhorse: bảng, form, nội dung** |
| Body SM | 12 / 16 / 400 | Metadata, nhãn badge |
| Label MD | 14 / 20 / 500 | Button, chip, header cột |
| Label SM | 12 / 16 / 500 | Caption |
| Code | 14 / 20 / 400 mono | Mã record, MST, version, **ngày/giờ** |

Text màu: chính `#212121`, phụ/placeholder `#757575`, hint `#BBBBBB`.

---

## 4. Công thức component

**Card** — `background: #FFF; border: 1px solid #E6E6E6; border-radius: 8px; padding: 16px;` không shadow.

**Button**
- Primary: nền `#AE7129`, text trắng, radius 4px, cao 40px (md) / 32px (sm), padding ngang 16px, label 14/500. Hover `#9C5C10`, press `#64300D`.
- Secondary: nền `#F7F2ED`, text `#AE7129`, không viền.
- Outline/ghost: nền trắng, viền 1px `#E6E6E6`, text `#212121`; hover nền `#F9F9F9`.
- Destructive: nền `#E73722`.
- Mỗi màn hình **một** primary. Mọi hành động khác là outline/ghost.

**Status tag / badge** — pill 100px, nền `*-100`, text + icon `*-500`, label 12/500, icon 16px, padding `2px 8px`. Success `check_circle`, Error `cancel`, Warning `warning`, Info `info`, Chờ/neutral `schedule` trên `#F5F5F5` + text `#757575`.

**Input / Select / Textarea** — cao 40px, radius 4px, viền `#E6E6E6`; hover `#BFBFBF`; focus viền `#212121`; error viền `#E73722` + helper text `#E73722`. Placeholder `#757575`. Icon affordance 20px.

**Table** — header nền `#F9F9F9`, label 14/500, ô body 14/400, chiều cao hàng 48px, divider 1px `#E6E6E6`, hover hàng `#F9F9F9`, selected hàng `#F7F2ED`. Số và mã dùng mono, số căn phải.

**Tab bar** — tab inactive text `#757575`, active text `#212121` + gạch chân 2px `#AE7129`; divider 1px `#E6E6E6` chạy hết chiều rộng; nội dung tab cách gạch chân ≥ 20px.

**Stepper (luồng phê duyệt)** — trạng thái node:
| Trạng thái | Node | Nhãn |
|---|---|---|
| Hoàn thành | nền `#AE7129`, icon `check` trắng | `#212121` |
| Hiện tại | viền 2px `#AE7129`, nền `#F7F2ED`, số nâu | `#212121` 500 |
| Chờ | viền 1px `#E6E6E6`, nền trắng, số `#BBBBBB` | `#757575` |
| Từ chối / lỗi | nền `#E73722`, icon `close` trắng | `#E73722` |
Connector 1px `#E6E6E6`; đoạn đã qua `#AE7129`. Node **luôn phải** phản ánh đúng bước hiện tại và trạng thái từ chối của danh sách bên dưới — một nguồn dữ liệu duy nhất.

**Hàng bước phê duyệt** — card trắng, viền 1px. Trạng thái thể hiện bằng **icon + tag**, không phải nền màu kín cả hàng. Nếu cần nhấn hàng đang xử lý thì dùng wash `#F7F2ED`; hàng bị từ chối dùng viền `#E73722` + nền `#FED5D0` ở mức nhạt, không dùng cho nhiều hàng cùng lúc.

---

## 5. Pattern trang

**Item Listing** — nền `#EBECED`; page header (tên module 32/600 + sub-title một câu + primary action bên phải); filter panel card 8px; bảng trong card trắng; phân trang dưới bảng.

**Item Detail** — nền trắng; breadcrumb 12/400 `#757575`; tên record 24/600; nhóm action bên phải (một primary); tab bar; các section chia bằng divider 1px + padding dưới 28px; mọi section dùng cùng số cột.

**Layout hai cột (detail + panel hoạt động)** — cột chính ≥ 2/3, panel phụ 1/3, gap 24px. Panel phụ là card trắng viền 1px, header 14/500 ALL-CAPS `#757575` + đếm số. Chỉ **một** vùng scroll trên trang; tránh scroll lồng nhau. Nếu buộc phải scroll trong panel thì đặt `max-height` rõ ràng và ẩn scrollbar khi không hover.

**Empty state** — icon 40px `#BBBBBB`, tiêu đề 16/500, mô tả 14/400 `#757575`, một action.

---

## 6. Anti-pattern (tuyệt đối tránh)

- Font geometric bo tròn (Poppins, Gilroy, Nunito…) thay Roboto.
- Nền trang màu kem/be/pastel; gradient; blur; glass.
- Bán kính 12/16/20/24px. Card bo tròn mềm + đổ bóng mềm.
- Nhiều sắc nâu khác nhau trên cùng màn hình, hoặc nâu bị bạc màu (`#A89078`) thay cho `#AE7129`.
- Nhiều phần tử cùng trông như primary action.
- Viền màu bên trái (left accent border) làm decor cho card.
- Chữ viết tắt trong vòng tròn ("KO", "OK") thay cho icon Material Symbols.
- Ngày/giờ và mã record đặt bằng font body thay vì mono.
- Emoji, unicode làm icon, illustration trang trí.
- Trùng tiêu đề (tên tab + heading section giống nhau ngay dưới).
- Scrollbar luôn hiện, ba vùng scroll lồng nhau.
- Con số ở stepper trên và danh sách dưới không khớp nhau.
- Hover làm phần tử scale/nhấc lên.

---

## 7. Ngôn ngữ & nội dung

- Tiếng Việt đủ dấu, sentence case cho label và body (`Tên tổ chức`, `Ngày cập nhật`).
- Label là danh từ; action là động từ mệnh lệnh (`Tạo tổ chức`, `Cập nhật`, `Đồng bộ CDE`, `Tải xuống`, `In`, `Nhân bản`).
- Giọng trung tính, không "tôi"/"bạn", không marketing.
- Từ vựng domain giữ nguyên: `Hồ sơ`, `Tổ chức`, `Dự án`, `Gói thầu`, `Phiên bản`, `Hiệu lực`, `MST`; acronym giữ nguyên: MDM, MAG, CDE, SAP, BOQ, OCR.
- Enum lifecycle theo data model để ALL-CAPS tiếng Anh (`ACTIVE`, `DRAFT`, `EXPIRED`) — nhưng nhãn hành động/trạng thái hướng người dùng thì tiếng Việt (`Hoàn thành`, `Đồng ý`, `Đã từ chối`, `Chờ`). Chọn một quy ước và giữ nhất quán toàn app.
- Sub-title giải thích phạm vi trong một câu; spec ID nếu có thì để trong sub-title (`FR-01 · Quản lý tập trung Organization`).

---

## 8. Quy trình khi nhận yêu cầu

1. Xác định pattern trang: Listing / Detail / Form / Detail + panel.
2. Liệt kê trạng thái cần thể hiện, map từng cái vào **một** status family.
3. Chọn **một** hành động primary. Ghi rõ nó là gì.
4. Dựng layout bằng spacing token, sau đó mới đặt màu.
5. Chạy checklist mục 1 và soát mục 6 trước khi giao.

Khi thiếu token cho một nhu cầu (ví dụ cần bán kính lớn hơn 8px) — **báo cáo
khoảng trống đó, đừng tự sáng tạo giá trị mới.**
