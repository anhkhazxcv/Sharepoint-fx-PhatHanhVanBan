import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(__dirname, 'phvb-data-model.manifest.json');
const outputPath = path.join(rootDir, 'docs', 'PHVB_DataModel_Lists_Fields.xlsx');

function resolveGitRef() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    return `${branch} @ ${commit}`;
  } catch {
    return '(unknown)';
  }
}

function inferSpType(field) {
  const name = field.internalName;
  const tsType = field.tsType || 'string';

  if (name === 'Id' && tsType === 'number') {
    return { spType: 'Counter', confidence: 'High', note: '' };
  }

  if (['Created', 'Modified', 'TimeLastModified'].includes(name) ||
    /^Ngay/i.test(name) || /^Date_/i.test(name) || /^HieuLuc/i.test(name)) {
    return { spType: 'DateTime', confidence: 'High', note: name === 'Modified' || name === 'Created' ? 'Built-in' : '' };
  }

  if (tsType === 'boolean' || /^Is[A-Z]/.test(name)) {
    return { spType: 'Yes/No', confidence: 'High', note: '' };
  }

  if (tsType === 'number' || ['IDFolderOld', 'LibraryItemId', 'IdThuMuc', 'ItemId', 'ThuTu', 'FSObjType'].includes(name)) {
    return { spType: 'Number', confidence: 'High', note: name === 'FSObjType' ? '0=file, 1=folder' : '' };
  }

  if (['FileRef', 'FileDirRef', 'FileLeafRef', 'UniqueId', 'Name', 'ServerRelativeUrl', 'EffectiveBasePermissions'].includes(name)) {
    return { spType: 'Built-in (Document Library)', confidence: 'High', note: '' };
  }

  if (['StatusApproved', 'LoaiYeuCau', 'TrangThai_ThucHien', 'LoaiLienKet'].includes(name)) {
    return { spType: 'Choice', confidence: 'Medium', note: 'Verify Choice vs Text trên site' };
  }

  if (['PheDuyet', 'NguoiGopY', 'ThamDinh'].includes(name)) {
    return { spType: 'Text (Multi-line)', confidence: 'Medium', note: 'Danh sách participant dạng text' };
  }

  if (/^TomTat/i.test(name) || name === 'NoiDung' || /^GhiChu/i.test(name) ||
    name === 'BodyEmail' || name === 'RequestPayload' || name === 'RequestFields' ||
    name === 'ErrorMessage' || name === 'Notes' || name === 'Value') {
    const note = name === 'BodyEmail' ? 'Có thể Enhanced rich text trên site' : '';
    return { spType: 'Note (Multiline)', confidence: 'Medium', note };
  }

  if (name === 'Label') {
    return { spType: 'Text (Single line)', confidence: 'Medium', note: 'Key cấu hình' };
  }

  if (name === 'Title' && field.listTitle === 'PHVB_Role') {
    return { spType: 'Choice', confidence: 'Medium', note: 'dc | admin | superAdmin' };
  }

  return { spType: 'Text (Single line)', confidence: 'High', note: '' };
}

function sheetFromRows(rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  return worksheet;
}

function autoWidth(rows) {
  if (!rows.length) {
    return [];
  }

  const keys = Object.keys(rows[0]);
  return keys.map(key => ({
    wch: Math.min(60, Math.max(key.length, ...rows.map(row => String(row[key] ?? '').length)) + 2)
  }));
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const exportedAt = new Date().toISOString();
  const gitRef = resolveGitRef();

  const listsRows = manifest.lists.map((list, index) => ({
    STT: index + 1,
    'Config constant': list.configConstant,
    'List title': list.listTitle,
    'Loại': list.listType,
    'Mục đích nghiệp vụ': list.businessPurpose,
    'Override web part?': list.webPartOverride || '',
    'Service chính': list.primaryServices
  }));

  const fieldsRows = manifest.fields.map(field => {
    const inferred = inferSpType(field);
    return {
      'List title': field.listTitle,
      'Field internal name': field.internalName,
      'Mô tả nghiệp vụ (VN)': field.businessDesc,
      'TS Type': field.tsType,
      'SP Type (suy luận)': inferred.spType,
      'Độ tin cậy': inferred.confidence,
      'Read/Create/Update/Filter': field.operations,
      'Nguồn file': field.sourceFile,
      'Ghi chú kỹ thuật': [field.technicalNote, inferred.note].filter(Boolean).join(' | '),
      'DisplayName (BA)': '',
      'SP Type (xác nhận site)': '',
      'Required (BA)': ''
    };
  });

  const spTypeLegendRows = manifest.spTypeLegend.map(item => ({
    'SP Type': item.spType,
    'Mô tả': item.description,
    'Quy tắc suy luận': item.inferenceRule
  }));

  const relationshipRows = manifest.relationships.map(item => ({
    'From list': item.fromList,
    'To list': item.toList,
    'Join field (From)': item.fromField,
    'Join field (To)': item.toField,
    'Loại quan hệ': item.cardinality,
    'Mô tả': item.description
  }));

  const enumRows = manifest.enums.map(item => ({
    'Enum name': item.enumName,
    'Giá trị': item.value,
    'Gợi ý SP Type': item.suggestedSpType,
    'Nguồn config': item.source
  }));

  const labelRows = manifest.labelConfigKeys.map(item => ({
    'Label key': item.labelKey,
    'Mục đích': item.purpose,
    'Ví dụ Value': item.exampleValue,
    'SP columns': item.spColumns
  }));

  const notesRows = manifest.notes.map(item => ({
    'Chủ đề': item.topic,
    'Chi tiết': item.detail
  }));

  const docMetaRows = [
    { 'Thuộc tính': 'Version manifest', 'Giá trị': manifest.version },
    { 'Thuộc tính': 'Ngày export', 'Giá trị': exportedAt },
    { 'Thuộc tính': 'Git ref', 'Giá trị': gitRef },
    { 'Thuộc tính': 'Số list/library', 'Giá trị': String(manifest.lists.length) },
    { 'Thuộc tính': 'Số field', 'Giá trị': String(manifest.fields.length) },
    { 'Thuộc tính': 'Hướng dẫn BA', 'Giá trị': 'Điền DisplayName, SP Type (xác nhận site), Required; đối chiếu luồng tại docs/PhvbMag_Luong_TrangThai.md' },
    { 'Thuộc tính': 'Tái sinh', 'Giá trị': 'npm run export:data-model' }
  ];

  const workbook = XLSX.utils.book_new();

  const sheets = [
    ['Lists', listsRows],
    ['Fields', fieldsRows],
    ['SPTypeLegend', spTypeLegendRows],
    ['Relationships', relationshipRows],
    ['Enums', enumRows],
    ['LabelConfigKeys', labelRows],
    ['Notes', notesRows],
    ['DocMeta', docMetaRows]
  ];

  sheets.forEach(([name, rows]) => {
    const worksheet = sheetFromRows(rows);
    worksheet['!cols'] = autoWidth(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(workbook, outputPath);

  console.log(`Exported: ${outputPath}`);
  console.log(`Lists: ${manifest.lists.length}, Fields: ${manifest.fields.length}, Enums: ${manifest.enums.length}`);
}

main();
