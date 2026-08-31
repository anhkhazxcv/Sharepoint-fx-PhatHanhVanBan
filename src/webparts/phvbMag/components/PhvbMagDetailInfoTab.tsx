import * as React from 'react';
import { useState } from 'react';
import { ISSUANCE_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext, ISelectedBanHanhFolder, IVanBanItem } from '../models/PhvbMag.models';
import { formatDateOnlyVi } from '../utils/PhvbMagDateTime.utils';
import { getStoragePathAfterLibrary } from '../utils/PhvbMagBanHanh.tree';
import {
  buildRequestInfoFieldsFromRelease,
  type IRequestInfoFieldsInput
} from '../utils/PhvbMagDetailInfoEdit.utils';
import { getRequestTypeFormRules, type RequestTypeValue } from '../utils/PhvbMagRequestForm.utils';
import { FolderAccentIcon, FolderSelectIcon, NotePinIcon } from './PhvbMagIcons';
import { PhvbMagFolderPickerDialog } from './PhvbMagFolderPickerDialog';
import { PhvbMagDateOnlyField } from './primitives/PhvbMagDateOnlyField';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailInfoTabProps {
  release: IVanBanItem;
  siteContext?: IPhvbSiteContext;
  canEdit?: boolean;
  isSaving?: boolean;
  errorMessage?: string;
  onSave?: (input: IRequestInfoFieldsInput) => Promise<boolean>;
}

function renderField(label: string, value: React.ReactNode): React.ReactElement {
  return (
    <div className={styles.detailField}>
      <span className={styles.detailFieldLabel}>{label}</span>
      <div className={styles.detailFieldValue}>{value || '---'}</div>
    </div>
  );
}

function renderNoteBody(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.length > 4 && part.indexOf('**') === 0 && part.lastIndexOf('**') === part.length - 2) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function PhvbMagDetailInfoTab(props: IPhvbMagDetailInfoTabProps): React.ReactElement {
  const { release, siteContext, canEdit = false, isSaving = false, errorMessage, onSave } = props;
  const noteText = release.GhiChuChoThamDinh?.trim();
  const requestType = release.LoaiYeuCau as RequestTypeValue;
  const formRules = getRequestTypeFormRules(requestType);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<IRequestInfoFieldsInput>(() => buildRequestInfoFieldsFromRelease(release));
  const [showFolderPicker, setShowFolderPicker] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  const handleStartEdit = (): void => {
    setDraft(buildRequestInfoFieldsFromRelease(release));
    setValidationError(undefined);
    setIsEditing(true);
  };

  const handleCancelEdit = (): void => {
    setDraft(buildRequestInfoFieldsFromRelease(release));
    setValidationError(undefined);
    setIsEditing(false);
  };

  const handleFolderConfirm = (folder: ISelectedBanHanhFolder): void => {
    const storagePath = folder.storagePath || getStoragePathAfterLibrary(folder.serverRelativePath, ISSUANCE_LIBRARY_TITLE);
    setDraft(previous => ({ ...previous, folderLuuTru: storagePath }));
    setShowFolderPicker(false);
  };

  const handleSave = async (): Promise<void> => {
    if (!onSave) {
      return;
    }

    if (!draft.tenVanBan.trim()) {
      setValidationError('Tên văn bản không được để trống.');
      return;
    }

    if (!draft.folderLuuTru.trim()) {
      setValidationError('Vui lòng chọn thư mục ban hành.');
      return;
    }

    if (!draft.hieuLucTu.trim()) {
      setValidationError('Vui lòng chọn ngày hiệu lực.');
      return;
    }

    if (draft.hieuLucDen && draft.hieuLucTu && draft.hieuLucDen < draft.hieuLucTu) {
      setValidationError('Ngày hết hiệu lực phải sau ngày hiệu lực.');
      return;
    }

    if (!draft.summary.trim()) {
      setValidationError('Vui lòng nhập tóm tắt nội dung.');
      return;
    }

    if (formRules.requireGhiChuThamDinh && !draft.ghiChuThamDinh.trim()) {
      setValidationError('Vui lòng nhập ghi chú cho cấp thẩm định / phê duyệt.');
      return;
    }

    setValidationError(undefined);

    const succeeded = await onSave(draft);

    if (succeeded) {
      setIsEditing(false);
    }
  };

  return (
    <div className={styles.detailInfoLayout}>
      {canEdit && !isEditing ? (
        <div className={styles.detailActions}>
          <button type="button" className={styles.detailActionEdit} onClick={handleStartEdit}>
            Chỉnh sửa thông tin
          </button>
        </div>
      ) : null}

      {isEditing && (validationError || errorMessage) ? (
        <p className={styles.detailActionError} role="alert">{validationError || errorMessage}</p>
      ) : null}

      <div className={styles.detailInfoGrid}>
        {isEditing ? (
          <div className={styles.detailField}>
            <label htmlFor="phvb-detail-info-ten-van-ban" className={styles.detailFieldLabel}>TÊN VĂN BẢN <span className={styles.required}>*</span></label>
            <input
              id="phvb-detail-info-ten-van-ban"
              type="text"
              value={draft.tenVanBan}
              onChange={event => setDraft(previous => ({ ...previous, tenVanBan: event.target.value }))}
              className={styles.formInput}
            />
          </div>
        ) : (
          renderField('TÊN VĂN BẢN', release.Tenvanban ? <strong>{release.Tenvanban}</strong> : undefined)
        )}

        {isEditing ? (
          <div className={styles.detailField}>
            <label htmlFor="phvb-detail-info-ten-van-ban-eng" className={styles.detailFieldLabel}>TÊN VĂN BẢN (TIẾNG ANH)</label>
            <input
              id="phvb-detail-info-ten-van-ban-eng"
              type="text"
              value={draft.tenVanBanEng}
              onChange={event => setDraft(previous => ({ ...previous, tenVanBanEng: event.target.value }))}
              className={styles.formInput}
            />
          </div>
        ) : (
          renderField('TÊN VĂN BẢN (TIẾNG ANH)', release.TenVanBan_ENG)
        )}
      </div>

      <section className={styles.detailInfoNoteCallout} aria-label="Ghi chú cho cấp thẩm định / phê duyệt">
        <div className={styles.detailInfoNoteHeader}>
          <NotePinIcon className={styles.detailInfoNoteIcon} />
          <span className={styles.detailInfoNoteTitle}>
            GHI CHÚ CHO CẤP THẨM ĐỊNH / PHÊ DUYỆT {isEditing && formRules.requireGhiChuThamDinh ? <span className={styles.required}>*</span> : null}
          </span>
        </div>
        {isEditing ? (
          <textarea
            rows={3}
            value={draft.ghiChuThamDinh}
            onChange={event => setDraft(previous => ({ ...previous, ghiChuThamDinh: event.target.value }))}
            className={styles.formTextAreaSmall}
          />
        ) : (
          <div className={styles.detailInfoNoteBody}>
            {noteText ? renderNoteBody(noteText) : <span className={styles.detailPlaceholder}>Không có ghi chú.</span>}
          </div>
        )}
      </section>

      <div className={styles.detailInfoGrid}>
        {renderField('LOẠI TÁC VỤ', release.LoaiYeuCau)}

        {isEditing ? (
          <div className={styles.detailField}>
            <label htmlFor="phvb-detail-info-folder" className={styles.detailFieldLabel}>THƯ MỤC <span className={styles.required}>*</span></label>
            <div className={styles.folderInputWrapper}>
              <div className={styles.folderInputLeft}>
                <FolderAccentIcon />
                <input
                  id="phvb-detail-info-folder"
                  type="text"
                  readOnly
                  placeholder="Chọn thư mục ban hành..."
                  value={draft.folderLuuTru}
                  className={styles.folderInputText}
                  onClick={() => setShowFolderPicker(true)}
                />
              </div>
              <button type="button" className={styles.btnSelectFolder} onClick={() => setShowFolderPicker(true)}>
                <FolderSelectIcon />
                Chọn
              </button>
            </div>
          </div>
        ) : (
          renderField('THƯ MỤC', release.ThuMucBanHanh)
        )}

        {isEditing ? (
          <div className={styles.detailField}>
            <label htmlFor="phvb-detail-info-hieu-luc-tu" className={styles.detailFieldLabel}>NGÀY HIỆU LỰC <span className={styles.required}>*</span></label>
            <PhvbMagDateOnlyField
              id="phvb-detail-info-hieu-luc-tu"
              value={draft.hieuLucTu}
              onChange={value => setDraft(previous => ({ ...previous, hieuLucTu: value }))}
            />
          </div>
        ) : (
          renderField('NGÀY HIỆU LỰC', formatDateOnlyVi(release.HieuLucTu))
        )}

        {isEditing ? (
          <div className={styles.detailField}>
            <label htmlFor="phvb-detail-info-hieu-luc-den" className={styles.detailFieldLabel}>NGÀY HẾT HIỆU LỰC</label>
            <PhvbMagDateOnlyField
              id="phvb-detail-info-hieu-luc-den"
              value={draft.hieuLucDen}
              onChange={value => setDraft(previous => ({ ...previous, hieuLucDen: value }))}
            />
          </div>
        ) : (
          renderField('NGÀY HẾT HIỆU LỰC', formatDateOnlyVi(release.HieuLucDen))
        )}

        {renderField('SỐ VĂN BẢN', release.SoVanBan || <span className={styles.detailPlaceholder}>Chưa cấp số</span>)}

        {isEditing ? (
          <div className={styles.detailField}>
            <label htmlFor="phvb-detail-info-lien-he" className={styles.detailFieldLabel}>ĐẦU MỐI LIÊN HỆ</label>
            <input
              id="phvb-detail-info-lien-he"
              type="text"
              value={draft.lienHe}
              onChange={event => setDraft(previous => ({ ...previous, lienHe: event.target.value }))}
              className={styles.formInput}
            />
          </div>
        ) : (
          renderField('ĐẦU MỐI LIÊN HỆ', release.LienHe || <span className={styles.detailPlaceholder}>Chưa có</span>)
        )}

        <div className={styles.detailField}>
          <span className={styles.detailFieldLabel}>KÊNH THÔNG BÁO</span>
          <div className={styles.detailFieldValue}>
            <label className={styles.detailCheckboxReadonly}>
              <input
                type="checkbox"
                checked={isEditing ? draft.isSendMailNotify : release.IsSendMailNotify === true}
                readOnly={!isEditing}
                disabled={!isEditing}
                onChange={event => setDraft(previous => ({ ...previous, isSendMailNotify: event.target.checked }))}
              />
              <span>Email</span>
            </label>
          </div>
        </div>
      </div>

      <section className={styles.detailInfoSummaryBlock} aria-label="Tóm tắt nội dung">
        <span className={styles.detailInfoSummaryTitle}>
          TÓM TẮT NỘI DUNG {isEditing ? <span className={styles.required}>*</span> : null}
        </span>
        {isEditing ? (
          <textarea
            rows={3}
            value={draft.summary}
            onChange={event => setDraft(previous => ({ ...previous, summary: event.target.value }))}
            className={styles.formTextAreaSmall}
          />
        ) : (
          <div className={styles.detailInfoSummaryBody}>
            {release.TomTatNoiDung?.trim() || <span className={styles.detailPlaceholder}>Không có tóm tắt.</span>}
          </div>
        )}
      </section>

      {isEditing ? (
        <div className={styles.detailActions}>
          <button type="button" className={styles.detailActionApprove} disabled={isSaving} onClick={handleSave}>
            Lưu
          </button>
          <button type="button" className={styles.detailActionEdit} disabled={isSaving} onClick={handleCancelEdit}>
            Hủy
          </button>
        </div>
      ) : null}

      {siteContext ? (
        <PhvbMagFolderPickerDialog
          isOpen={showFolderPicker}
          requestType={requestType}
          siteContext={siteContext}
          onClose={() => setShowFolderPicker(false)}
          onConfirm={handleFolderConfirm}
        />
      ) : null}
    </div>
  );
}
