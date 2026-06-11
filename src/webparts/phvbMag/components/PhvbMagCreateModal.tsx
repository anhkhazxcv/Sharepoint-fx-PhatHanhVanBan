import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import type { ICreateRequestInput, IPhvbDirectoryUser, IPhvbSiteContext, ISelectedBanHanhFolder, SaveRequestMode } from '../models/PhvbMag.models';
import { DRAFT_DOCUMENT_ACCEPT, FORM_ATTACHMENT_ACCEPT, ISSUANCE_LIBRARY_TITLE, SLA_OPTIONS } from '../config/PhvbMag.configuration';
import { getParentStoragePathAfterLibrary, getStoragePathAfterLibrary } from '../utils/PhvbMagBanHanh.tree';
import {
  calculateWorkflowDeadlines,
  getSlaMaxDeadline,
  getTodayInputDate,
  shiftInputDate,
  validateWorkflowDeadlines,
  type IDeadlineValidationResult
} from '../utils/PhvbMagSla.utils';
import styles from './PhvbMag.module.scss';
import {
  CloseIcon,
  DeleteFileIcon,
  DocumentFileIcon,
  FolderAccentIcon,
  FolderSelectIcon,
  FormTemplateFileIcon,
  ModalCreateIcon,
  RemoveTagIcon,
  SubmitRequestIcon,
  UploadDocumentIcon,
  UploadFormIcon
} from './PhvbMagIcons';
import { PhvbMagFolderPickerDialog } from './PhvbMagFolderPickerDialog';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';

interface IPhvbMagCreateModalProps {
  isOpen: boolean;
  isSaving: boolean;
  isLoadingApprovers: boolean;
  defaultValues: ICreateRequestInput;
  documentTypes: ReadonlyArray<string>;
  departments: ReadonlyArray<string>;
  siteContext: IPhvbSiteContext;
  approvers: ReadonlyArray<IPhvbDirectoryUser>;
  onClose: () => void;
  onSubmit: (input: ICreateRequestInput, mode: SaveRequestMode) => Promise<boolean>;
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
  deadlineMin?: string;
  deadlineMax?: string;
  deadlineError?: string;
  isLoading?: boolean;
}

// Highly polished, tag-based autocomplete user picker component
function UserTagPicker(props: IUserPickerProps): React.ReactElement {
  const {
    label,
    required,
    selectedEmails,
    onChange,
    approvers,
    placeholder,
    deadlineValue,
    onDeadlineChange,
    deadlineMin,
    deadlineMax,
    deadlineError,
    isLoading
  } = props;
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
    <div className={`${styles.formGroup} ${styles.userPickerContainer}`} ref={containerRef}>
      <label className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      
      <div className={styles.userPickerInputWrapper}>
        <div className={styles.tagsContainer}>
          {selectedEmails.map(email => {
            const user = approvers.filter((a: IPhvbDirectoryUser) => a.email === email)[0];
            const displayName = user ? user.displayName : email;
            return (
              <span key={email} className={styles.userTag}>
                {displayName}
                <button type="button" className={styles.btnRemoveTag} onClick={() => handleRemove(email)} aria-label="Xóa">
                  <RemoveTagIcon />
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
        <div>
          <div className={styles.deadlineRow}>
            <span className={styles.deadlineLabel}>Deadline:</span>
            <input
              type="date"
              value={deadlineValue || ''}
              min={deadlineMin}
              max={deadlineMax}
              onChange={e => onDeadlineChange(e.target.value)}
              className={`${styles.deadlineInput} ${deadlineError ? styles.deadlineInputInvalid : ''}`}
            />
          </div>
          {deadlineError && <p className={styles.deadlineError}>{deadlineError}</p>}
        </div>
      )}
    </div>
  );
}

export function PhvbMagCreateModal(props: IPhvbMagCreateModalProps): React.ReactElement {
  const { isOpen, isSaving, isLoadingApprovers, defaultValues, siteContext, approvers, onClose, onSubmit } = props;
  const [formValues, setFormValues] = useState<ICreateRequestInput>({ ...defaultValues });
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [deadlineErrors, setDeadlineErrors] = useState<IDeadlineValidationResult>({ isValid: true });
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [folderError, setFolderError] = useState<string | undefined>(undefined);
  const [savingMode, setSavingMode] = useState<SaveRequestMode | undefined>(undefined);

  // Refs and Drag-over states for Drag-and-Drop files
  const file1Ref = useRef<HTMLInputElement>(null);
  const file2Ref = useRef<HTMLInputElement>(null);
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const deadlines = calculateWorkflowDeadlines(defaultValues.loaiSla);
      const nextValues = {
        ...defaultValues,
        ...deadlines
      };

      setFormValues(nextValues);
      setDeadlineErrors(validateWorkflowDeadlines({
        deadlineGopY: nextValues.deadlineGopY,
        deadlineThamDinh: nextValues.deadlineThamDinh,
        deadlinePheDuyet: nextValues.deadlinePheDuyet,
        loaiSla: nextValues.loaiSla
      }));
      setShowFolderPicker(false);
    }
  }, [defaultValues, isOpen]);

  if (!isOpen) {
    return <></>;
  }

  const updateField = (field: keyof ICreateRequestInput, value: unknown): void => {
    setFormValues(previousState => ({
      ...previousState,
      [field]: value
    }));
  };

  const normalizeDocumentTitle = (value: string): string => {
    return value.toLocaleUpperCase('vi-VN');
  };

  const handleTitleChange = (value: string): void => {
    updateField('title', normalizeDocumentTitle(value));
  };

  const appendFiles = (existingFiles: File[], incomingFiles: FileList | File[]): File[] => {
    const nextFiles = existingFiles.slice();
    const filesToAdd = Array.prototype.slice.call(incomingFiles) as File[];

    filesToAdd.forEach(file => {
      const isDuplicate = nextFiles.some(
        existingFile =>
          existingFile.name === file.name &&
          existingFile.size === file.size &&
          existingFile.lastModified === file.lastModified
      );

      if (!isDuplicate) {
        nextFiles.push(file);
      }
    });

    return nextFiles;
  };

  const openFilePicker = (inputRef: React.RefObject<HTMLInputElement>): void => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'taiLieuFiles' | 'bieuMauFiles'
  ): void => {
    if (event.target.files && event.target.files.length > 0) {
      const currentFiles = field === 'taiLieuFiles' ? formValues.taiLieuFiles : formValues.bieuMauFiles;
      updateField(field, appendFiles(currentFiles, event.target.files));
    }

    event.target.value = '';
  };

  const handleDropFiles = (
    event: React.DragEvent<HTMLDivElement>,
    field: 'taiLieuFiles' | 'bieuMauFiles'
  ): void => {
    event.preventDefault();

    if (field === 'taiLieuFiles') {
      setIsDragging1(false);
    } else {
      setIsDragging2(false);
    }

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const currentFiles = field === 'taiLieuFiles' ? formValues.taiLieuFiles : formValues.bieuMauFiles;
      updateField(field, appendFiles(currentFiles, event.dataTransfer.files));
    }
  };

  const handleRemoveFile = (
    field: 'taiLieuFiles' | 'bieuMauFiles',
    fileIndex: number,
    event: React.MouseEvent<HTMLButtonElement>
  ): void => {
    event.stopPropagation();
    const currentFiles = field === 'taiLieuFiles' ? formValues.taiLieuFiles : formValues.bieuMauFiles;
    updateField(
      field,
      currentFiles.filter((_, index) => index !== fileIndex)
    );
  };

  const formatFileSize = (sizeInBytes: number): string => {
    return `${(sizeInBytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const runDeadlineValidation = (values: ICreateRequestInput): IDeadlineValidationResult => {
    return validateWorkflowDeadlines({
      deadlineGopY: values.deadlineGopY,
      deadlineThamDinh: values.deadlineThamDinh,
      deadlinePheDuyet: values.deadlinePheDuyet,
      loaiSla: values.loaiSla
    });
  };

  const handleDeadlineChange = (
    field: 'deadlineGopY' | 'deadlineThamDinh' | 'deadlinePheDuyet',
    date: string
  ): void => {
    const nextState = {
      ...formValues,
      [field]: date
    };
    setFormValues(nextState);
    setDeadlineErrors(runDeadlineValidation(nextState));
  };

  const handleSlaChange = (loaiSla: string): void => {
    const deadlines = calculateWorkflowDeadlines(loaiSla);
    const nextState = {
      ...formValues,
      loaiSla,
      ...deadlines
    };
    setFormValues(nextState);
    setDeadlineErrors(runDeadlineValidation(nextState));
  };

  const slaMaxDeadline = getSlaMaxDeadline(formValues.loaiSla);
  const todayInputDate = getTodayInputDate();
  const gopYMaxDate = shiftInputDate(formValues.deadlineThamDinh || '', -1) || slaMaxDeadline;
  const thamDinhMinDate = shiftInputDate(formValues.deadlineGopY || '', 1) || todayInputDate;
  const thamDinhMaxDate = shiftInputDate(formValues.deadlinePheDuyet || '', -1) || slaMaxDeadline;
  const pheDuyetMinDate = shiftInputDate(formValues.deadlineThamDinh || '', 1) || todayInputDate;

  const handleRequestTypeChange = (type: ICreateRequestInput['requestType']): void => {
    setFolderError(undefined);
    setFormValues(previousState => {
      if (previousState.requestType === type) {
        return previousState;
      }

      return {
        ...previousState,
        requestType: type,
        title: '',
        folderLuuTru: '',
        folder: '',
        idFolderOld: undefined,
        isSendMailNotify: true
      };
    });
  };

  const isAdjustOrRevokeRequest = formValues.requestType === 'Điều chỉnh' || formValues.requestType === 'Thu hồi';

  const validateIssuanceFolder = (): boolean => {
    if (!formValues.folderLuuTru.trim()) {
      setFolderError('Vui lòng chọn thư mục ban hành.');
      return false;
    }

    setFolderError(undefined);
    return true;
  };

  const handleFolderConfirm = (folder: ISelectedBanHanhFolder): void => {
    const storagePath = isAdjustOrRevokeRequest
      ? getParentStoragePathAfterLibrary(folder.serverRelativePath, ISSUANCE_LIBRARY_TITLE)
      : folder.storagePath || getStoragePathAfterLibrary(folder.serverRelativePath, ISSUANCE_LIBRARY_TITLE);

    setFolderError(undefined);
    setFormValues(previousState => ({
      ...previousState,
      folderLuuTru: storagePath,
      folder: storagePath,
      title: isAdjustOrRevokeRequest ? normalizeDocumentTitle(folder.name) : previousState.title,
      idFolderOld: isAdjustOrRevokeRequest ? folder.id : undefined
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitError(undefined);

    if (!validateIssuanceFolder()) {
      return;
    }

    if (!formValues.taiLieuFiles || formValues.taiLieuFiles.length === 0) {
      setSubmitError('Vui lòng đính kèm ít nhất một tài liệu soạn thảo trước khi gửi yêu cầu.');
      return;
    }

    const validation = runDeadlineValidation(formValues);
    setDeadlineErrors(validation);

    if (!validation.isValid) {
      return;
    }

    setSavingMode('submit');
    try {
      const isSuccess = await onSubmit(formValues, 'submit');
      if (isSuccess) {
        setFormValues({ ...defaultValues });
        setSubmitError(undefined);
      }
    } finally {
      setSavingMode(undefined);
    }
  };

  const handleSaveDraft = async (): Promise<void> => {
    setSubmitError(undefined);
    setDeadlineErrors({ isValid: true });

    if (!validateIssuanceFolder()) {
      return;
    }

    setSavingMode('draft');
    try {
      const isSuccess = await onSubmit(formValues, 'draft');
      if (isSuccess) {
        setFormValues({ ...defaultValues });
      }
    } finally {
      setSavingMode(undefined);
    }
  };

  const savingMessage = savingMode === 'draft'
    ? 'Đang lưu nháp...'
    : savingMode === 'submit'
      ? 'Đang gửi yêu cầu...'
      : 'Đang xử lý...';

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitleArea}>
            <ModalCreateIcon />
            <h3>Tạo yêu cầu phát hành văn bản</h3>
          </div>
          <button type="button" className={styles.btnClose} onClick={onClose} disabled={isSaving}>
            <CloseIcon />
          </button>
        </div>

        <PhvbMagLoadingOverlay isOpen={isSaving} message={savingMessage} />

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <div className={styles.modalBody}>
            {/* LOẠI YÊU CẦU + THÔNG BÁO EMAIL */}
            <div className={styles.formRowTwoCol}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>LOẠI YÊU CẦU</label>
                <div className={styles.requestTypeGroup}>
                  {(['Viết mới', 'Điều chỉnh', 'Thu hồi'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`${styles.requestTypeBtn} ${formValues.requestType === type ? styles.requestTypeBtnActive : ''}`}
                      onClick={() => handleRequestTypeChange(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>THÔNG BÁO EMAIL</label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', minHeight: '36px' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(formValues.isSendMailNotify)}
                    onChange={event => updateField('isSendMailNotify', event.target.checked)}
                    disabled={formValues.requestType !== 'Thu hồi'}
                  />
                  <span style={{ color: formValues.requestType !== 'Thu hồi' ? '#8C827A' : undefined }}>Gửi thông báo email</span>
                </label>
              </div>
            </div>

            {/* THƯ MỤC BAN HÀNH */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  THƯ MỤC BAN HÀNH <span className={styles.required}>*</span>
                </label>
                <div className={styles.folderInputWrapper}>
                  <div className={`${styles.folderInputLeft} ${folderError ? styles.folderInputInvalid : ''}`}>
                    <FolderAccentIcon />
                    <input
                      type="text"
                      readOnly
                      placeholder="Chọn thư mục ban hành..."
                      value={formValues.folderLuuTru}
                      className={styles.folderInputText}
                      onClick={() => setShowFolderPicker(true)}
                      aria-invalid={Boolean(folderError)}
                      aria-describedby={folderError ? 'folderLuuTruError' : undefined}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.btnSelectFolder}
                    onClick={() => setShowFolderPicker(true)}
                  >
                    <FolderSelectIcon />
                    Chọn
                  </button>
                </div>
                {folderError && (
                  <p id="folderLuuTruError" className={styles.deadlineError}>{folderError}</p>
                )}
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
                  placeholder={isAdjustOrRevokeRequest ? 'Chọn thư mục ban hành để tự điền...' : 'Nhập tên đầy đủ...'}
                  value={formValues.title}
                  onChange={event => handleTitleChange(event.target.value)}
                  readOnly={isAdjustOrRevokeRequest}
                  disabled={isAdjustOrRevokeRequest}
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
                <span className={styles.fieldSubtitle}>File văn bản chính cần phát hành (.docx, .pdf, .xlsx, .xls)</span>
                
                <div
                  className={`${styles.dragDropZone} ${isDragging1 ? styles.dragDropActive : ''} ${formValues.taiLieuFiles.length > 0 ? styles.dragDropHasFile : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging1(true); }}
                  onDragLeave={() => setIsDragging1(false)}
                  onDrop={event => handleDropFiles(event, 'taiLieuFiles')}
                  onClick={() => openFilePicker(file1Ref)}
                >
                  <input
                    type="file"
                    ref={file1Ref}
                    accept={DRAFT_DOCUMENT_ACCEPT}
                    multiple
                    style={{ display: 'none' }}
                    onChange={event => handleFileInputChange(event, 'taiLieuFiles')}
                  />
                  
                  {formValues.taiLieuFiles.length > 0 ? (
                    <div className={styles.dragDropContent} style={{ width: '100%', gap: 8 }}>
                      {formValues.taiLieuFiles.map((file, fileIndex) => (
                        <div key={`${file.name}-${file.lastModified}-${fileIndex}`} className={styles.fileCard}>
                          <div className={styles.fileIconArea}>
                            <DocumentFileIcon />
                          </div>
                          <div className={styles.fileMetaArea}>
                            <div className={styles.fileName}>{file.name}</div>
                            <div className={styles.fileSize}>{formatFileSize(file.size)}</div>
                          </div>
                          <button
                            type="button"
                            className={styles.btnTrash}
                            onClick={event => handleRemoveFile('taiLieuFiles', fileIndex, event)}
                            aria-label={`Xóa tài liệu ${file.name}`}
                          >
                            <DeleteFileIcon />
                          </button>
                        </div>
                      ))}
                      <div className={styles.dragDropFormat}>Click hoặc kéo thả để thêm file</div>
                    </div>
                  ) : (
                    <div className={styles.dragDropContent}>
                      <UploadDocumentIcon />
                      <div className={styles.dragDropTitle}>Kéo thả hoặc click để đính kèm</div>
                      <div className={styles.dragDropFormat}>.docx, .pdf, .xlsx, .xls - Tối đa 50MB/file</div>
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
                  className={`${styles.dragDropZone} ${isDragging2 ? styles.dragDropActive : ''} ${formValues.bieuMauFiles.length > 0 ? styles.dragDropHasFile : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging2(true); }}
                  onDragLeave={() => setIsDragging2(false)}
                  onDrop={event => handleDropFiles(event, 'bieuMauFiles')}
                  onClick={() => openFilePicker(file2Ref)}
                >
                  <input
                    type="file"
                    ref={file2Ref}
                    accept={FORM_ATTACHMENT_ACCEPT}
                    multiple
                    style={{ display: 'none' }}
                    onChange={event => handleFileInputChange(event, 'bieuMauFiles')}
                  />

                  {formValues.bieuMauFiles.length > 0 ? (
                    <div className={styles.dragDropContent} style={{ width: '100%', gap: 8 }}>
                      {formValues.bieuMauFiles.map((file, fileIndex) => (
                        <div key={`${file.name}-${file.lastModified}-${fileIndex}`} className={styles.fileCard}>
                          <div className={styles.fileIconArea}>
                            <FormTemplateFileIcon />
                          </div>
                          <div className={styles.fileMetaArea}>
                            <div className={styles.fileName}>{file.name}</div>
                            <div className={styles.fileSize}>{formatFileSize(file.size)}</div>
                          </div>
                          <button
                            type="button"
                            className={styles.btnTrash}
                            onClick={event => handleRemoveFile('bieuMauFiles', fileIndex, event)}
                            aria-label={`Xóa biểu mẫu ${file.name}`}
                          >
                            <DeleteFileIcon />
                          </button>
                        </div>
                      ))}
                      <div className={styles.dragDropFormat}>Click hoặc kéo thả để thêm file</div>
                    </div>
                  ) : (
                    <div className={styles.dragDropContent}>
                      <UploadFormIcon />
                      <div className={styles.dragDropTitle}>Thêm biểu mẫu (nếu có)</div>
                      <div className={styles.dragDropFormat}>.docx, .pdf, .xlsx, .xls - Không bắt buộc</div>
                    </div>
                  )}
                </div>
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
                  onChange={event => handleSlaChange(event.target.value)}
                  required
                  className={styles.formSelect}
                >
                  <option value="">Chọn loại SLA...</option>
                  {SLA_OPTIONS.map(option => (
                    <option key={option.value} value={option.value} title={option.description}>
                      {option.label}: {option.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LUỒNG XÉT DUYỆT SECTION */}
            <div className={styles.workflowSection}>
              <h4 className={styles.workflowSectionTitle}>LUỒNG XÉT DUYỆT</h4>

              {!deadlineErrors.isValid && deadlineErrors.message && (
                <p className={styles.deadlineError}>{deadlineErrors.message}</p>
              )}

              <div className={styles.formRowTwoCol}>
                {/* NGƯỜI GÓP Ý */}
                <UserTagPicker
                  label="NGƯỜI GÓP Ý"
                  required
                  selectedEmails={formValues.nguoiGopY}
                  onChange={emails => updateField('nguoiGopY', emails)}
                  approvers={approvers}
                  deadlineValue={formValues.deadlineGopY}
                  onDeadlineChange={date => handleDeadlineChange('deadlineGopY', date)}
                  deadlineMin={todayInputDate}
                  deadlineMax={gopYMaxDate}
                  deadlineError={deadlineErrors.deadlineGopY}
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
                  onDeadlineChange={date => handleDeadlineChange('deadlineThamDinh', date)}
                  deadlineMin={thamDinhMinDate}
                  deadlineMax={thamDinhMaxDate}
                  deadlineError={deadlineErrors.deadlineThamDinh}
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
                  onDeadlineChange={date => handleDeadlineChange('deadlinePheDuyet', date)}
                  deadlineMin={pheDuyetMinDate}
                  deadlineMax={slaMaxDeadline}
                  deadlineError={deadlineErrors.deadlinePheDuyet}
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

          {submitError && (
            <p className={styles.submitError} role="alert">{submitError}</p>
          )}

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
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu nháp'}
            </button>
            
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                'Đang gửi...'
              ) : (
                <span className={styles.submitButtonContent}>
                  Gửi yêu cầu
                  <SubmitRequestIcon />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      <PhvbMagFolderPickerDialog
        isOpen={showFolderPicker}
        requestType={formValues.requestType}
        siteContext={siteContext}
        onClose={() => setShowFolderPicker(false)}
        onConfirm={handleFolderConfirm}
      />
    </div>
  );
}