# PHVB Ban hành HTTP 202

Package Power Automate để Super Admin ban hành **không đợi copy/mail trên browser**. Web part (giai đoạn 2) POST rồi nhận **202** ngay; flow chạy copy, stamp, archive, short URL, mail ở background.

Giai đoạn 1: **chỉ import và test Postman**. Chưa sửa SPFx.

## Phạm vi

Flow **chỉ** xử lý `LoaiYeuCau` = `Tạo mới` hoặc `Điều chỉnh` (DMVL là Tạo mới, folder `Danh mục vật liệu dự án` nằm trong `ThuMucBanHanh`).

`Thu hồi` và mọi loại khác: HTTP **202** rồi **Terminate / Cancelled**. Không copy, không mail.

Không ghi list `Log`. Không ghi `LichSuThucHien`. Không PATCH `StatusApproved`. Chỉ PATCH `BodyEmail` sau khi có short URL.

## License

Trigger HTTP + action HTTP (mail, short URL) = **Premium**. License M365 E3/E5 seeded **không đủ**.

- Khuyến nghị: **Power Automate Process** gắn vào flow (solution-aware).
- Super Admin gọi từ web part / Postman **không** cần license PA trên từng user.
- Import xong, xác nhận tenant có Process hoặc Premium hợp lệ trước khi chạy UAT.

## Import

1. Vào [make.powerautomate.com](https://make.powerautomate.com) → **My flows** → **Import** → **Import package (Legacy)**.
2. Chọn `PhvbBanHanhHttp202.zip`.
3. Resource flow: **Create as new**.
4. SharePoint: **Select during import** → connection có quyền Contribute/Edit trên site PHVB (`InDoc_Release`, `VanBanGopYThamDinh`, `VanBanBanHanh_Ver02`, `lstConfigLabelCustom`, `lstConfigNoiDungMail`).
5. Import → mở flow → **Save**.
6. Mở trigger **When a HTTP request is received** → copy **HTTP POST URL** (PA generate, có SAS).

Nếu designer báo lỗi action **Create_Folder_Segment**: set **Configure run after** = Failed (khi folder chưa tồn tại). Action **Set_issuanceCurrentPath** cần run after Get = Succeeded/Failed và Create = Succeeded/Failed/Skipped.

## Body bắt buộc

Không có biến/config trên flow. Mọi thứ lấy từ `triggerBody()`. Không gửi `idYeuCau` — flow GET `InDoc_Release` theo `itemId`.

| Field | Ý nghĩa |
| --- | --- |
| `siteUrl` | Site SharePoint, ví dụ `https://tenant.sharepoint.com/sites/phvb` |
| `itemId` | Id item `InDoc_Release` |
| `endPointSendMail` | URL POST mail `{ EmailTo, Subject, Body }` |
| `endPointShortUrl` | URL POST short URL (thường `https://s.masterisehomes.com/rest/v3/short-urls`) |
| `webPartPageUrl` | URL trang chứa web part, **không** gồm `#...`. Dùng cho `{{LinkTatCaTaiLieu}}` = `{page}#/tab/ThuVienTaiLieu/folder/{folderId}` |
| `roleGroupID` | Principal Id group được cấp Read trên file biểu mẫu |
| `nguoiThucHien` | Tên người bấm Ban hành (token mail lưu trữ) |

API key short URL **không** gửi trên body. Flow GET `lstConfigLabelCustom` label `apiKeyShortLink`.

Xem [`sample-body.json`](sample-body.json).

## Postman

```
POST {HTTP POST URL từ trigger}
Content-Type: application/json
```

Kỳ vọng: **202** ngay, body `{ "accepted": true, "itemId": 123 }`. Copy/mail xem **Run history** (có thể vài chục giây sau).

### Checklist

- Tạo mới: file từ `{VanBanGopYThamDinh}/{IdYeuCau}/` vào `{VanBanBanHanh_Ver02}/{ThuMucBanHanh}/{Tenvanban}/`, stamp metadata, short URL, PATCH `BodyEmail`, mail xác nhận + mail lưu trữ.
- Điều chỉnh: thêm archive `IDFolderOld` → `Expired_yyyyMMdd_{Tenvanban}`, stamp `HieuLucDen` hôm qua, break inheritance folder Expired. Không có `IDFolderOld` thì bỏ qua archive.
- DMVL: `ThuMucBanHanh` chứa `Danh mục vật liệu dự án` — cùng pipeline Tạo mới.
- POST lần 2 sau khi hết `{{LinkFile}}` và folder đích đã có file: Terminate succeeded (idempotent).
- Item `Thu hồi`: 202 rồi Cancelled. **Không** dùng PA cho nhánh này.

## REST khớp SPFx

- Copy: `GetFileByServerRelativeUrl(...)/copyTo(..., boverwrite=true)`
- Form: `IsBieuMau eq true`; ACL `breakroleinheritance` + Read (`roledefinitions/getByType(2)`) cho `roleGroupID`
- Short URL body: `{ longUrl, tags: ["mas_phvb"], shortCodeLength: 9, forwardQuery: true }`, header `X-Api-Key`, response `shortUrl`
- File long URL: origin + path encode từng segment + `?web=1`
- Mail xác nhận: `EmailNhanBanHanh` + `SubjectBanHanh` + Body đã replace `{{LinkFile}}` / `{{LinkTatCaTaiLieu}}`
- Mail lưu trữ: template `lstConfigNoiDungMail` `MaLoaiMail eq THONG_BAO_LUU_TRU`, `EmailTo` = `EmailNguoiTao`

Tên folder sanitize: bỏ `"*:<>?/\|#%`, gộp khoảng trắng.

## Giới hạn khi review

- Ngày stamp dùng timezone `SE Asia Standard Time`, format `yyyy-MM-dd`. Nếu `ValidateUpdateListItem` fail theo locale site, đổi format trong designer.
- `issuanceCurrentPath` là biến **runtime** khi ensure folder (không phải config site/endpoint).
- Zip không phải tenant export: phải map lại connection SharePoint.
- URL HTTP trigger lộ SAS: chỉ đưa Super Admin / property pane giai đoạn 2, không commit URL production vào git.
