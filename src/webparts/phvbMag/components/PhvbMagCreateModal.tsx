import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import type { ICreateRequestInput, IPhvbDirectoryUser } from '../models/PhvbMag.models';
import { SLA_OPTIONS } from '../config/PhvbMag.configuration';
import styles from './PhvbMag.module.scss';
import { CloseIcon } from './PhvbMagIcons';

interface IPhvbMagCreateModalProps {
  isOpen: boolean;
  isSaving: boolean;
  isLoadingApprovers: boolean;
  defaultValues: ICreateRequestInput;
  documentTypes: ReadonlyArray<string>;
  departments: ReadonlyArray<string>;
  folders: ReadonlyArray<string>;
  approvers: ReadonlyArray<IPhvbDirectoryUser>;
  onClose: () => void;
  onSubmit: (input: ICreateRequestInput) => Promise<boolean>;
}

interface IUserPickerProps {
  label: string;
  required?: boolean;
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  approvers: ReadonlyArray<IPhvbDirectoryUser>;
  placeholder?: string;
  deadlineValue?: string;
  onDeadlineChange?: (date: string) => void;
  isLoading?: boolean;
}

// Highly polished, tag-based autocomplete user picker component
function UserTagPicker(props: IUserPickerProps): React.ReactElement {
  const { label, required, selectedEmails, onChange, approvers, placeholder, deadlineValue, onDeadlineChange, isLoading } = props;
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = React.useMemo(() => {
    return approvers.filter((item: IPhvbDirectoryUser) => {
      const isAlreadySelected = selectedEmails.indexOf(item.email) > -1;
      if (isAlreadySelected) return false;

      if (!query.trim()) return true;
      const normalizedQuery = query.trim().toLowerCase();
      return (
        item.displayName.toLowerCase().indexOf(normalizedQuery) > -1 ||
        item.email.toLowerCase().indexOf(normalizedQuery) > -1 ||
        Boolean(item.department && item.department.toLowerCase().indexOf(normalizedQuery) > -1)
      );
    });
  }, [approvers, selectedEmails, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (email: string): void => {
    onChange([...selectedEmails, email]);
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (email: string): void => {
    onChange(selectedEmails.filter(e => e !== email));
  };

  return (
    <div className={styles.userPickerContainer} ref={containerRef}>
      <label className={styles.fieldLabel}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      
      <div className={styles.userPickerInputWrapper}>
        <div className={styles.tagsContainer}>
          {selectedEmails.map(email => {
            const user = approvers.filter((a: IPhvbDirectoryUser) => a.email === email)[0];
            const displayName = user ? user.displayName : email;
            return (
              <span key={email} className={styles.userTag}>
                {displayName}
                <button type="button" className={styles.btnRemoveTag} onClick={() => handleRemove(email)}>
                  ×
                </button>
              </span>
            );
          })}
          
          <input
            type="text"
            placeholder={selectedEmails.length === 0 ? (placeholder || "Nhập tên hoặc email...") : "+ Thêm..."}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className={styles.userPickerInput}
          />
        </div>

        {isOpen && (isLoading || suggestions.length > 0) && (
          <div className={styles.suggestionsDropdown}>
            {isLoading ? (
              <div className={styles.suggestionItem} style={{ color: '#8C827A', fontStyle: 'italic', cursor: 'default' }}>
                Đang tải danh sách người dùng...
              </div>
            ) : (
              suggestions.slice(0, 8).map(user => (
                <div
                  key={user.id}
                  className={styles.suggestionItem}
                  onClick={() => handleSelect(user.email)}
                >
                  <div className={styles.suggestionName}>{user.displayName}</div>
                  <div className={styles.suggestionMeta}>
                    {user.email} {user.department ? `• ${user.department}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {onDeadlineChange && (
        <div className={styles.deadlineRow}>
          <span className={styles.deadlineLabel}>Deadline:</span>
          <input
            type="date"
            value={deadlineValue || ''}
            onChange={e => onDeadlineChange(e.target.value)}
            className={styles.deadlineInput}
          />
        </div>
      )}
    </div>
  );
}

export function PhvbMagCreateModal(props: IPhvbMagCreateModalProps): React.ReactElement {
  const { isOpen, isSaving, isLoadingApprovers, defaultValues, folders, approvers, onClose, onSubmit } = props;
  const [formValues, setFormValues] = useState<ICreateRequestInput>({ ...defaultValues });
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);

  // Refs and Drag-over states for Drag-and-Drop files
  const file1Ref = useRef<HTMLInputElement>(null);
  const file2Ref = useRef<HTMLInputElement>(null);
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormValues({ ...defaultValues });
      setShowFolderDropdown(false);
    }
  }, [defaultValues, isOpen]);

  // Click outside listener for folder selection dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (folderRef.current && !folderRef.current.contains(event.target as Node)) {
        setShowFolderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) {
    return <></>;
  }

  const updateField = (field: keyof ICreateRequestInput, value: unknown): void => {
    setFormValues(previousState => ({
      ...previousState,
      [field]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const isSuccess = await onSubmit(formValues);
    if (isSuccess) {
      setFormValues({ ...defaultValues });
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitleArea}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#7B4C2C">
              <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" />
            </svg>
            <h3>Tạo yêu cầu phát hành văn bản</h3>
          </div>
          <button type="button" className={styles.btnClose} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <div className={styles.modalBody}>
            {/* LOẠI YÊU CẦU */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>LOẠI YÊU CẦU</label>
                <div className={styles.requestTypeGroup}>
                  {(['Viết mới', 'Điều chỉnh', 'Thu hồi'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`${styles.requestTypeBtn} ${formValues.requestType === type ? styles.requestTypeBtnActive : ''}`}
                      onClick={() => updateField('requestType', type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TÊN VĂN BẢN (TIẾNG VIỆT) */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  TÊN VĂN BẢN (TIẾNG VIỆT) <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên đầy đủ..."
                  value={formValues.title}
                  onChange={event => updateField('title', event.target.value)}
                  required
                  className={styles.formInput}
                />
              </div>
            </div>

            {/* TÊN VĂN BẢN (TIẾNG ANH) */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>TÊN VĂN BẢN (TIẾNG ANH)</label>
                <input
                  type="text"
                  placeholder="English name (optional)"
                  value={formValues.titleEn}
                  onChange={event => updateField('titleEn', event.target.value)}
                  className={styles.formInput}
                />
              </div>
            </div>

            {/* THƯ MỤC LƯU TRỮ */}
            <div className={styles.formRow} ref={folderRef}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  THƯ MỤC LƯU TRỮ <span className={styles.required}>*</span>
                </label>
                <div className={styles.folderInputWrapper}>
                  <div className={styles.folderInputLeft}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="#F4B400">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                    <input
                      type="text"
                      readOnly
                      placeholder="Chọn thư mục..."
                      value={formValues.folderLuuTru}
                      className={styles.folderInputText}
                      onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.btnSelectFolder}
                    onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10H6v-2h8v2zm4-4H6v-2h12v2z" />
                    </svg>
                    Chọn
                  </button>

                  {showFolderDropdown && (
                    <div className={styles.folderDropdownMenu}>
                      <div className={styles.folderDropdownHeader}>Chọn thư mục lưu trữ</div>
                      <div className={styles.folderDropdownList}>
                        {folders.map(option => (
                          <div
                            key={option}
                            className={`${styles.folderDropdownItem} ${formValues.folderLuuTru === option ? styles.folderItemActive : ''}`}
                            onClick={() => {
                              updateField('folderLuuTru', option);
                              updateField('folder', option); // Sync old property
                              setShowFolderDropdown(false);
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="#F4B400">
                              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                            </svg>
                            <span>{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* NGÀY HIỆU LỰC & NGÀY HẾT HIỆU LỰC */}
            <div className={styles.formRowTwoCol}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  NGÀY HIỆU LỰC <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  value={formValues.hieuLucTu}
                  onChange={event => updateField('hieuLucTu', event.target.value)}
                  required
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>NGÀY HẾT HIỆU LỰC</label>
                <input
                  type="date"
                  value={formValues.hieuLucDen}
                  onChange={event => updateField('hieuLucDen', event.target.value)}
                  className={styles.formInput}
                />
              </div>
            </div>

            {/* LÝ DO PHÁT HÀNH / TÓM TẤT NỘI DUNG */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  LÝ DO PHÁT HÀNH / TÓM TẤT NỘI DUNG <span className={styles.required}>*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Mục đích, bối cảnh và nội dung chính của văn bản..."
                  value={formValues.summary}
                  onChange={event => updateField('summary', event.target.value)}
                  required
                  className={styles.formTextArea}
                />
              </div>
            </div>

            {/* TÀI LIỆU SOẠN THẢO */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  TÀI LIỆU SOẠN THẢO <span className={styles.required}>*</span>
                </label>
                <span className={styles.fieldSubtitle}>File văn bản chính cần phát hành (.docx hoặc .pdf)</span>
                
                <div
                  className={`${styles.dragDropZone} ${isDragging1 ? styles.dragDropActive : ''} ${formValues.taiLieuFile ? styles.dragDropHasFile : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging1(true); }}
                  onDragLeave={() => setIsDragging1(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging1(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      updateField('taiLieuFile', e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    if (!formValues.taiLieuFile && file1Ref.current) {
                      file1Ref.current.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    ref={file1Ref}
                    accept=".docx,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        updateField('taiLieuFile', e.target.files[0]);
                      }
                    }}
                  />
                  
                  {formValues.taiLieuFile ? (
                    <div className={styles.fileCard}>
                      <div className={styles.fileIconArea}>
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="#7B4C2C">
                          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>
                      </div>
                      <div className={styles.fileMetaArea}>
                        <div className={styles.fileName}>{formValues.taiLieuFile.name}</div>
                        <div className={styles.fileSize}>{(formValues.taiLieuFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      <button
                        type="button"
                        className={styles.btnTrash}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateField('taiLieuFile', undefined);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={styles.dragDropContent}>
                      <svg viewBox="0 0 24 24" width="38" height="38" fill="#8C827A">
                        <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" />
                      </svg>
                      <div className={styles.dragDropTitle}>Kéo thả hoặc click để đính kèm</div>
                      <div className={styles.dragDropFormat}>.docx, .pdf - Tối đa 50MB</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BIỂU MẪU ĐÍNH KÈM */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>BIỂU MẪU ĐÍNH KÈM</label>
                <span className={styles.fieldSubtitle}>
                  Các mẫu tham chiếu đi kèm - Sau khi ban hành, CBNV tải được biểu mẫu nhưng chỉ xem được văn bản chính
                </span>

                <div
                  className={`${styles.dragDropZone} ${isDragging2 ? styles.dragDropActive : ''} ${formValues.bieuMauFile ? styles.dragDropHasFile : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging2(true); }}
                  onDragLeave={() => setIsDragging2(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging2(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      updateField('bieuMauFile', e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    if (!formValues.bieuMauFile && file2Ref.current) {
                      file2Ref.current.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    ref={file2Ref}
                    accept=".docx,.xlsx,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        updateField('bieuMauFile', e.target.files[0]);
                      }
                    }}
                  />

                  {formValues.bieuMauFile ? (
                    <div className={styles.fileCard}>
                      <div className={styles.fileIconArea}>
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="#7B4C2C">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm4-4H6v-2h10v2zm0-4H6V7h10v2z" />
                        </svg>
                      </div>
                      <div className={styles.fileMetaArea}>
                        <div className={styles.fileName}>{formValues.bieuMauFile.name}</div>
                        <div className={styles.fileSize}>{(formValues.bieuMauFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      <button
                        type="button"
                        className={styles.btnTrash}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateField('bieuMauFile', undefined);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={styles.dragDropContent}>
                      <svg viewBox="0 0 24 24" width="38" height="38" fill="#8C827A">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                      </svg>
                      <div className={styles.dragDropTitle}>Thêm biểu mẫu (nếu có)</div>
                      <div className={styles.dragDropFormat}>.docx, .xlsx, .pdf - Không bắt buộc</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* THƯ MỤC LƯU TRỮ BIỂU MẪU ĐÍNH KÈM */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  THƯ MỤC LƯU TRỮ BIỂU MẪU ĐÍNH KÈM <span className={styles.required}>*</span>
                </label>
                <select
                  value={formValues.folderBieuMauDinhKem}
                  onChange={event => updateField('folderBieuMauDinhKem', event.target.value)}
                  required
                  className={styles.formSelect}
                >
                  <option value="">Chọn thư mục...</option>
                  {folders.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LOẠI SLA */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  LOẠI SLA <span className={styles.required}>*</span>
                </label>
                <select
                  value={formValues.loaiSla}
                  onChange={event => updateField('loaiSla', event.target.value)}
                  required
                  className={styles.formSelect}
                >
                  <option value="">Chọn loại SLA...</option>
                  {SLA_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LUỒNG XÉT DUYỆT SECTION */}
            <div className={styles.workflowSection}>
              <h4 className={styles.workflowSectionTitle}>LUỒNG XÉT DUYỆT</h4>

              <div className={styles.formRowTwoCol}>
                {/* NGƯỜI GÓP Ý */}
                <UserTagPicker
                  label="NGƯỜI GÓP Ý"
                  required
                  selectedEmails={formValues.nguoiGopY}
                  onChange={emails => updateField('nguoiGopY', emails)}
                  approvers={approvers}
                  deadlineValue={formValues.deadlineGopY}
                  onDeadlineChange={date => updateField('deadlineGopY', date)}
                  placeholder="+ Thêm người góp ý..."
                  isLoading={isLoadingApprovers}
                />

                {/* NGƯỜI THẨM ĐỊNH */}
                <UserTagPicker
                  label="NGƯỜI THẨM ĐỊNH"
                  required
                  selectedEmails={formValues.nguoiThamDinh}
                  onChange={emails => updateField('nguoiThamDinh', emails)}
                  approvers={approvers}
                  deadlineValue={formValues.deadlineThamDinh}
                  onDeadlineChange={date => updateField('deadlineThamDinh', date)}
                  placeholder="Nhập tên hoặc email..."
                  isLoading={isLoadingApprovers}
                />
              </div>

              <div className={styles.formRowTwoCol}>
                {/* NGƯỜI PHÊ DUYỆT (maps to old approvalUsers) */}
                <UserTagPicker
                  label="NGƯỜI PHÊ DUYỆT"
                  required
                  selectedEmails={formValues.approvalUsers}
                  onChange={emails => updateField('approvalUsers', emails)}
                  approvers={approvers}
                  deadlineValue={formValues.deadlinePheDuyet}
                  onDeadlineChange={date => updateField('deadlinePheDuyet', date)}
                  placeholder="Nhập tên hoặc email..."
                  isLoading={isLoadingApprovers}
                />

                {/* GHI CHÚ CHO NGƯỜI THẨM ĐỊNH */}
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>GHI CHÚ CHO NGƯỜI THẨM ĐỊNH</label>
                  <textarea
                    rows={2}
                    placeholder="Điểm cần chú ý, yêu cầu đặc biệt..."
                    value={formValues.ghiChuThamDinh}
                    onChange={event => updateField('ghiChuThamDinh', event.target.value)}
                    className={styles.formTextAreaSmall}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </button>
            
            <button
              type="button"
              className={styles.btnDraft}
              onClick={onClose}
              disabled={isSaving}
            >
              Lưu nháp
            </button>
            
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={isSaving}
            >
              {isSaving ? 'Đang gửi...' : 'Gửi yêu cầu ↓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}