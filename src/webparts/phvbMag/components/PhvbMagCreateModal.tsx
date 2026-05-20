import * as React from 'react';
import { useEffect, useState } from 'react';
import styles from './PhvbMag.module.scss';
import type { ICreateRequestInput } from './PhvbMag.types';
import { DEFAULT_REQUEST_FORM, DEPARTMENT_OPTIONS, DOCUMENT_TYPE_OPTIONS, FOLDER_OPTIONS } from './PhvbMag.types';
import { CloseIcon } from './PhvbMagIcons';

interface IPhvbMagCreateModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: ICreateRequestInput) => Promise<boolean>;
}

export function PhvbMagCreateModal(props: IPhvbMagCreateModalProps): React.ReactElement | null {
  const { isOpen, isSaving, onClose, onSubmit } = props;
  const [formValues, setFormValues] = useState<ICreateRequestInput>(DEFAULT_REQUEST_FORM);

  useEffect(() => {
    if (isOpen) {
      setFormValues(DEFAULT_REQUEST_FORM);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const updateField = (field: keyof ICreateRequestInput, value: string): void => {
    setFormValues(previousState => ({
      ...previousState,
      [field]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const isSuccess = await onSubmit(formValues);
    if (isSuccess) {
      setFormValues(DEFAULT_REQUEST_FORM);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Tạo yêu cầu ban hành văn bản mới</h3>
          <button type="button" className={styles.btnClose} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>
                  Tên văn bản nội bộ <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên đầy đủ của văn bản..."
                  value={formValues.title}
                  onChange={event => updateField('title', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.formRowTwoCol}>
              <div className={styles.formGroup}>
                <label>Mã hiệu / Số hiệu văn bản</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 01/2026-TC-MAG"
                  value={formValues.code}
                  onChange={event => updateField('code', event.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Loại văn bản</label>
                <select value={formValues.type} onChange={event => updateField('type', event.target.value)}>
                  {DOCUMENT_TYPE_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRowTwoCol}>
              <div className={styles.formGroup}>
                <label>Phòng ban soạn thảo</label>
                <select value={formValues.department} onChange={event => updateField('department', event.target.value)}>
                  {DEPARTMENT_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Thư mục ban hành</label>
                <select value={formValues.folder} onChange={event => updateField('folder', event.target.value)}>
                  {FOLDER_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRowTwoCol}>
              <div className={styles.formGroup}>
                <label>Hiệu lực từ ngày</label>
                <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={formValues.hieuLucTu}
                  onChange={event => updateField('hieuLucTu', event.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Hiệu lực đến ngày</label>
                <input
                  type="text"
                  placeholder="DD/MM/YYYY hoặc Vô thời hạn"
                  value={formValues.hieuLucDen}
                  onChange={event => updateField('hieuLucDen', event.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRowTwoCol}>
              <div className={styles.formGroup}>
                <label>Liên hệ hỗ trợ</label>
                <input
                  type="text"
                  placeholder="Tên nhóm hỗ trợ hoặc số nội bộ..."
                  value={formValues.contact}
                  onChange={event => updateField('contact', event.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Địa điểm lưu trữ bản cứng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tủ hồ sơ Phòng hành chính..."
                  value={formValues.noiLuu}
                  onChange={event => updateField('noiLuu', event.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Tóm tắt nội dung chính</label>
                <textarea
                  rows={3}
                  placeholder="Nhập tóm tắt sơ lược về phạm vi, mục đích của văn bản nội bộ..."
                  value={formValues.summary}
                  onChange={event => updateField('summary', event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSaving}>
              Hủy bỏ
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
              {isSaving ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}