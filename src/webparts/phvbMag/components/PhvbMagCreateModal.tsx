import * as React from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';
import type { IAttachmentLibraryItem, ICreateRequestInput, IPhvbDirectoryUser, IPhvbSiteContext, ISelectedBanHanhFolder, SaveRequestMode } from '../models/PhvbMag.models';
import { DRAFT_DOCUMENT_ACCEPT, FORM_ATTACHMENT_ACCEPT, ISSUANCE_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import { getParentStoragePathAfterLibrary, getStoragePathAfterLibrary } from '../utils/PhvbMagBanHanh.tree';
import {
  calculateWorkflowDeadlines,
  getTodayInputDate
} from '../utils/PhvbMagSla.utils';
import {
  collectAttachmentRemovalIds,
  findDuplicateAttachmentGroupFileName,
  getDmvlFormRules,
  getRequestTypeFormRules,
  getRevokeExcludedFormFields,
  isRevokeRequestType,
  sanitizeRequestInputForSave
} from '../utils/PhvbMagRequestForm.utils';
import {
  CREATE_REQUEST_FIELD_IDS,
  focusCreateRequestField,
  getFieldErrorMessage,
  getVisibleFieldErrors,
  validateCreateRequestForm,
  type CreateRequestFieldKey,
  type ICreateRequestFieldError
} from '../utils/PhvbMagCreateRequestValidation.utils';
import { resolveDmvlFolderStoragePath } from '../utils/PhvbMagDmvl.utils';
import { usePhvbBusy } from '../context/PhvbMagBusy.context';
import styles from './PhvbMag.module.scss';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import {
  DeleteFileIcon,
  DocumentFileIcon,
  FieldErrorIcon,
  FolderAccentIcon,
  FolderSelectIcon,
  FormTemplateFileIcon,
  ModalCreateIcon,
  RemoveTagIcon,
  SubmitRequestIcon,
  SummaryHintIcon,
  UploadDocumentIcon,
  UploadFormIcon
} from './PhvbMagIcons';
import { PhvbMagCreateTemplatePanel } from './PhvbMagCreateTemplatePanel';
import { PhvbMagFolderPickerDialog } from './PhvbMagFolderPickerDialog';
import { PhvbMagDateOnlyField } from './primitives/PhvbMagDateOnlyField';
import { PhvbMagDialog } from './primitives/PhvbMagDialog';
import { formatExecutionDate, parseExecutionDateTime } from '../utils/PhvbMagDateTime.utils';

interface IPhvbMagCreateModalProps {
  isOpen: boolean;
  isSaving: boolean;
  isLoadingApprovers: boolean;
  isEditMode?: boolean;
  variant?: 'standard' | 'dmvl';
  initialExistingTaiLieu?: IAttachmentLibraryItem[];
  initialExistingBieuMau?: IAttachmentLibraryItem[];
  defaultValues: ICreateRequestInput;
  siteContext: IPhvbSiteContext;
  approvers: ReadonlyArray<IPhvbDirectoryUser>;
  onClose: () => void;
  onSubmit: (input: ICreateRequestInput, mode: SaveRequestMode) => Promise<boolean>;
  onDmvlBanHanh?: (input: ICreateRequestInput) => Promise<boolean>;
  externalSubmitError?: string;
}

interface IUserPickerProps {
  label: string;
  required?: boolean;
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  approvers: ReadonlyArray<IPhvbDirectoryUser>;
  placeholder?: string;
  peopleError?: string;
  peopleInputId?: string;
  peopleDescribedBy?: string;
  onPeopleBlur?: () => void;
  isLoading?: boolean;
}

function CreateFieldError(props: { id: string; message?: string }): React.ReactElement {
  if (!props.message) {
    return <></>;
  }

  return (
    <p id={props.id} className={styles.fieldErrorRow} role="alert">
      <FieldErrorIcon className={styles.fieldErrorIcon} />
      <span>{props.message}</span>
    </p>
  );
}

function UserTagPicker(props: IUserPickerProps): React.ReactElement {
  const {
    label,
    required,
    selectedEmails,
    onChange,
    approvers,
    placeholder,
    peopleError,
    peopleInputId,
    peopleDescribedBy,
    onPeopleBlur,
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

  const handleSelect = (email: string): void => {
    onChange([...selectedEmails, email]);
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (email: string): void => {
    onChange(selectedEmails.filter(e => e !== email));
  };

  const handleContainerBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
    const nextTarget = event.relatedTarget as Node | null;
    if (containerRef.current && nextTarget && containerRef.current.contains(nextTarget)) {
      return;
    }

    setIsOpen(false);
    onPeopleBlur?.();
  };

  return (
    <div className={`${styles.formGroup} ${styles.userPickerContainer}`} ref={containerRef} onBlur={handleContainerBlur}>
      <label className={styles.fieldLabel} htmlFor={peopleInputId}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      
      <div className={`${styles.userPickerInputWrapper} ${peopleError ? styles.userPickerInputInvalid : ''}`}>
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
            id={peopleInputId}
            type="text"
            placeholder={selectedEmails.length === 0 ? (placeholder || "Nhập tên hoặc email...") : "+ Thêm..."}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className={styles.userPickerInput}
            aria-invalid={Boolean(peopleError)}
            aria-describedby={peopleDescribedBy}
          />
        </div>

        {isOpen && (isLoading || suggestions.length > 0) && (
          <div className={styles.suggestionsDropdown}>
            {isLoading ? (
              <div className={styles.suggestionItemLoading}>
                Đang tải danh sách người dùng...
              </div>
            ) : (
              suggestions.slice(0, 8).map(user => (
                <div
                  key={user.id}
                  className={styles.suggestionItem}
                  onMouseDown={event => event.preventDefault()}
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
      <CreateFieldError id={`${peopleInputId}-error`} message={peopleError} />
    </div>
  );
}

export function PhvbMagCreateModal(props: IPhvbMagCreateModalProps): React.ReactElement {
  const {
    isOpen,
    isSaving,
    isLoadingApprovers,
    isEditMode,
    variant = 'standard',
    initialExistingTaiLieu,
    initialExistingBieuMau,
    defaultValues,
    siteContext,
    approvers,
    onClose,
    onSubmit,
    onDmvlBanHanh,
    externalSubmitError
  } = props;
  const isDmvlMode = variant === 'dmvl' && !isEditMode;
  const { runBusy } = usePhvbBusy();
  const [formValues, setFormValues] = useState<ICreateRequestInput>({ ...defaultValues });
  const [existingTaiLieu, setExistingTaiLieu] = useState<IAttachmentLibraryItem[]>([]);
  const [existingBieuMau, setExistingBieuMau] = useState<IAttachmentLibraryItem[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [touchedFields, setTouchedFields] = useState<ReadonlySet<CreateRequestFieldKey>>(new Set());
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [systemError, setSystemError] = useState<string | undefined>(undefined);
  const [fileRejectError, setFileRejectError] = useState<{ field: CreateRequestFieldKey; message: string } | undefined>(undefined);
  const [isDmvlFolderLoading, setIsDmvlFolderLoading] = useState(false);

  // Refs and Drag-over states for Drag-and-Drop files
  const file1Ref = useRef<HTMLInputElement>(null);
  const file2Ref = useRef<HTMLInputElement>(null);
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const nextValues = isEditMode
        ? { ...defaultValues }
        : isDmvlMode
          ? {
            ...defaultValues,
            hieuLucTu: defaultValues.hieuLucTu || getTodayInputDate()
          }
          : {
            ...defaultValues,
            ...calculateWorkflowDeadlines(defaultValues.loaiSla)
          };
      const openRules = isDmvlMode ? getDmvlFormRules() : getRequestTypeFormRules(nextValues.requestType);
      const nextExistingTaiLieu = openRules.showTaiLieuSoanThao ? (initialExistingTaiLieu || []).slice() : [];
      const nextExistingBieuMau = openRules.showBieuMauDinhKem ? (initialExistingBieuMau || []).slice() : [];
      const nextRemovedAttachmentIds = openRules.includeAttachmentsOnSave
        ? []
        : collectAttachmentRemovalIds(initialExistingTaiLieu || [], initialExistingBieuMau || [], []);

      setFormValues(nextValues);
      setExistingTaiLieu(nextExistingTaiLieu);
      setExistingBieuMau(nextExistingBieuMau);
      setRemovedAttachmentIds(nextRemovedAttachmentIds);
      setShowFolderPicker(false);
      setTouchedFields(new Set());
      setHasAttemptedSubmit(false);
      setSystemError(undefined);
      setFileRejectError(undefined);
    }
  }, [defaultValues, isOpen, isEditMode, isDmvlMode, initialExistingTaiLieu, initialExistingBieuMau]);

  useEffect(() => {
    if (!isOpen || !isDmvlMode) {
      return;
    }

    let isMounted = true;

    const loadDmvlFolder = async (): Promise<void> => {
      setIsDmvlFolderLoading(true);
      setSystemError(undefined);

      try {
        const storagePath = await runBusy('Đang tải thư mục DMVL...', async () => {
          return resolveDmvlFolderStoragePath(siteContext);
        });

        if (!isMounted) {
          return;
        }

        setFormValues(previousState => ({
          ...previousState,
          requestType: 'Tạo mới',
          folderLuuTru: storagePath,
          folder: storagePath
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSystemError(error instanceof Error ? error.message : 'Không tải được thư mục DMVL.');
      } finally {
        if (isMounted) {
          setIsDmvlFolderLoading(false);
        }
      }
    };

    loadDmvlFolder().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [isOpen, isDmvlMode, runBusy, siteContext]);

  const formRules = isDmvlMode ? getDmvlFormRules() : getRequestTypeFormRules(formValues.requestType);
  const allErrors = useMemo(() => {
    return validateCreateRequestForm(formValues, {
      rules: formRules,
      existingTaiLieu,
      existingBieuMau,
      mode: 'submit',
      isDmvl: isDmvlMode
    });
  }, [existingBieuMau, existingTaiLieu, formRules, formValues, isDmvlMode]);
  const visibleErrors = useMemo(() => {
    return getVisibleFieldErrors(allErrors, {
      touched: touchedFields,
      hasAttemptedSubmit
    });
  }, [allErrors, hasAttemptedSubmit, touchedFields]);

  const markFieldTouched = (field: CreateRequestFieldKey): void => {
    setTouchedFields(previous => {
      if (previous.has(field)) {
        return previous;
      }

      const next = new Set<CreateRequestFieldKey>();
      previous.forEach(item => next.add(item));
      next.add(field);
      return next;
    });
  };

  const fieldError = (field: CreateRequestFieldKey): string | undefined => {
    return getFieldErrorMessage(visibleErrors, field);
  };

  const revealSubmitErrors = (errors: ReadonlyArray<ICreateRequestFieldError>): void => {
    setHasAttemptedSubmit(true);
    if (errors.length > 0) {
      window.setTimeout(() => {
        focusCreateRequestField(errors[0].field);
      }, 0);
    }
  };

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

  const handleTitleEnChange = (value: string): void => {
    updateField('titleEn', normalizeDocumentTitle(value));
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

  const getOtherAttachmentGroupNames = (field: 'taiLieuFiles' | 'bieuMauFiles'): string[] => {
    return field === 'taiLieuFiles'
      ? [...formValues.bieuMauFiles.map(file => file.name), ...existingBieuMau.map(item => item.name)]
      : [...formValues.taiLieuFiles.map(file => file.name), ...existingTaiLieu.map(item => item.name)];
  };

  const rejectCrossGroupDuplicateFiles = (
    field: 'taiLieuFiles' | 'bieuMauFiles',
    incomingFiles: FileList | File[]
  ): boolean => {
    const incoming = Array.prototype.slice.call(incomingFiles) as File[];
    const duplicateName = findDuplicateAttachmentGroupFileName(
      getOtherAttachmentGroupNames(field),
      incoming.map(file => file.name)
    );

    if (duplicateName) {
      const otherGroupLabel = field === 'taiLieuFiles' ? 'Biểu mẫu cần ban hành' : 'Tài liệu soạn thảo';
      markFieldTouched(field);
      setFileRejectError({
        field,
        message: `Tên file "${duplicateName}" đã tồn tại ở nhóm ${otherGroupLabel}. Vui lòng đổi tên file hoặc chọn file khác.`
      });
      return true;
    }

    return false;
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'taiLieuFiles' | 'bieuMauFiles'
  ): void => {
    if (event.target.files && event.target.files.length > 0) {
      if (rejectCrossGroupDuplicateFiles(field, event.target.files)) {
        event.target.value = '';
        return;
      }

      const currentFiles = field === 'taiLieuFiles' ? formValues.taiLieuFiles : formValues.bieuMauFiles;
      setFileRejectError(undefined);
      markFieldTouched(field);
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
      if (rejectCrossGroupDuplicateFiles(field, event.dataTransfer.files)) {
        return;
      }

      const currentFiles = field === 'taiLieuFiles' ? formValues.taiLieuFiles : formValues.bieuMauFiles;
      setFileRejectError(undefined);
      markFieldTouched(field);
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
    markFieldTouched(field);
    updateField(
      field,
      currentFiles.filter((_, index) => index !== fileIndex)
    );
  };

  const formatFileSize = (sizeInBytes: number): string => {
    return `${(sizeInBytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatExistingFileMeta = (attachment: IAttachmentLibraryItem): string => {
    const parsedDate = parseExecutionDateTime(attachment.modified);
    if (!parsedDate) {
      return 'Đã lưu trên SharePoint';
    }

    return `Đã lưu • ${formatExecutionDate(attachment.modified)}`;
  };

  const buildSubmitPayload = (): ICreateRequestInput => sanitizeRequestInputForSave({
    ...formValues,
    existingTaiLieuAttachments: existingTaiLieu,
    existingBieuMauAttachments: existingBieuMau,
    removedAttachmentIds: removedAttachmentIds.slice()
  });

  const hasTaiLieuAttachments = formValues.taiLieuFiles.length > 0 || existingTaiLieu.length > 0;
  const requiresTaiLieuAttachments = formRules.requireTaiLieuSoanThao;
  const folderFieldError = fieldError('folderLuuTru') || (isDmvlMode ? systemError : undefined);
  const titleFieldError = fieldError('title');
  const hieuLucTuError = fieldError('hieuLucTu');
  const summaryFieldError = fieldError('summary');
  const taiLieuFieldError = fieldError('taiLieuFiles')
    || (fileRejectError && fileRejectError.field === 'taiLieuFiles' ? fileRejectError.message : undefined);
  const bieuMauFieldError = fieldError('bieuMauFiles')
    || (fileRejectError && fileRejectError.field === 'bieuMauFiles' ? fileRejectError.message : undefined);
  const ghiChuFieldError = fieldError('ghiChuThamDinh');
  const bannerError = externalSubmitError || (!isDmvlMode ? systemError : undefined);

  const handleRemoveExistingAttachment = (
    attachment: IAttachmentLibraryItem,
    field: 'taiLieu' | 'bieuMau',
    event: React.MouseEvent<HTMLButtonElement>
  ): void => {
    event.stopPropagation();

    markFieldTouched(field === 'taiLieu' ? 'taiLieuFiles' : 'bieuMauFiles');

    if (field === 'taiLieu') {
      setExistingTaiLieu(previousState => previousState.filter(item => item.id !== attachment.id));
    } else {
      setExistingBieuMau(previousState => previousState.filter(item => item.id !== attachment.id));
    }

    setRemovedAttachmentIds(previousState => {
      if (previousState.indexOf(attachment.id) > -1) {
        return previousState;
      }

      return [...previousState, attachment.id];
    });
  };


  const handleRequestTypeChange = (type: ICreateRequestInput['requestType']): void => {
    setTouchedFields(new Set());
    setHasAttemptedSubmit(false);
    setSystemError(undefined);
    setFileRejectError(undefined);

    if (isRevokeRequestType(type)) {
      setRemovedAttachmentIds(previousRemovedIds =>
        collectAttachmentRemovalIds(existingTaiLieu, existingBieuMau, previousRemovedIds)
      );
      setExistingTaiLieu([]);
      setExistingBieuMau([]);
    }

    setFormValues(previousState => {
      if (previousState.requestType === type) {
        return previousState;
      }

      const nextState = {
        ...previousState,
        requestType: type,
        title: '',
        folderLuuTru: '',
        folder: '',
        idFolderOld: undefined,
        isSendMailNotify: type === 'Thu hồi' ? false : true
      };

      if (isRevokeRequestType(type)) {
        return {
          ...nextState,
          ...getRevokeExcludedFormFields()
        };
      }

      return nextState;
    });
  };

  const isAdjustOrRevokeRequest = formValues.requestType === 'Điều chỉnh' || isRevokeRequestType(formValues.requestType);
  const isRevoke = isRevokeRequestType(formValues.requestType);

  const handleFolderConfirm = (folder: ISelectedBanHanhFolder): void => {
    const storagePath = isAdjustOrRevokeRequest
      ? getParentStoragePathAfterLibrary(folder.serverRelativePath, ISSUANCE_LIBRARY_TITLE)
      : folder.storagePath || getStoragePathAfterLibrary(folder.serverRelativePath, ISSUANCE_LIBRARY_TITLE);

    markFieldTouched('folderLuuTru');
    if (isAdjustOrRevokeRequest) {
      markFieldTouched('title');
    }
    setFormValues(previousState => ({
      ...previousState,
      folderLuuTru: storagePath,
      folder: storagePath,
      title: isAdjustOrRevokeRequest ? normalizeDocumentTitle(folder.name) : previousState.title,
      idFolderOld: isAdjustOrRevokeRequest ? folder.id : undefined
    }));
  };

  const handleDmvlBanHanhClick = async (): Promise<void> => {
    const errors = validateCreateRequestForm(formValues, {
      rules: formRules,
      existingTaiLieu,
      existingBieuMau,
      mode: 'submit',
      isDmvl: true
    });

    if (errors.length > 0) {
      revealSubmitErrors(errors);
      return;
    }

    if (!onDmvlBanHanh) {
      return;
    }

    const isSuccess = await onDmvlBanHanh(buildSubmitPayload());

    if (isSuccess) {
      setFormValues({ ...defaultValues });
      setHasAttemptedSubmit(false);
      setTouchedFields(new Set());
      setSystemError(undefined);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (isDmvlMode) {
      return;
    }

    const errors = validateCreateRequestForm(formValues, {
      rules: formRules,
      existingTaiLieu,
      existingBieuMau,
      mode: 'submit',
      isDmvl: false
    });

    if (errors.length > 0) {
      revealSubmitErrors(errors);
      return;
    }

    const isSuccess = await onSubmit(buildSubmitPayload(), 'submit');
    if (isSuccess) {
      setFormValues({ ...defaultValues });
      setHasAttemptedSubmit(false);
      setTouchedFields(new Set());
      setSystemError(undefined);
    }
  };

  const handleSaveDraft = async (): Promise<void> => {
    const errors = validateCreateRequestForm(formValues, {
      rules: formRules,
      existingTaiLieu,
      existingBieuMau,
      mode: 'draft',
      isDmvl: false
    });

    if (errors.length > 0) {
      errors.forEach(error => markFieldTouched(error.field));
      window.setTimeout(() => {
        focusCreateRequestField(errors[0].field);
      }, 0);
      return;
    }

    const isSuccess = await onSubmit(buildSubmitPayload(), 'draft');
    if (isSuccess) {
      setFormValues({ ...defaultValues });
      setHasAttemptedSubmit(false);
      setTouchedFields(new Set());
      setSystemError(undefined);
    }
  };

  const createModalFormId = 'phvb-create-modal-form';

  return (
    <>
      <PhvbMagDialog
        isOpen={isOpen}
        title={(
          <span className={styles.modalHeaderTitleArea}>
            <ModalCreateIcon />
            {isEditMode ? 'Chỉnh sửa bản nháp' : isDmvlMode ? 'Trình DMVL' : 'Tạo yêu cầu phát hành văn bản'}
          </span>
        )}
        titleId="phvb-create-modal-title"
        onDismiss={isSaving ? undefined : onClose}
        contentClassName={styles.modalContent}
        footer={(
          <>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </button>

            {isDmvlMode ? (
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={handleDmvlBanHanhClick}
                disabled={isSaving}
              >
                {hasAttemptedSubmit && allErrors.length > 0
                  ? `Ban hành (${allErrors.length} lỗi)`
                  : 'Ban hành'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.btnDraft}
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  Lưu nháp
                </button>

                <button
                  type="submit"
                  form={createModalFormId}
                  className={styles.btnSubmit}
                  disabled={isSaving}
                >
                  <span className={styles.submitButtonContent}>
                    {hasAttemptedSubmit && allErrors.length > 0
                      ? `Gửi yêu cầu (${allErrors.length} lỗi)`
                      : 'Gửi yêu cầu'}
                    <SubmitRequestIcon />
                  </span>
                </button>
              </>
            )}
          </>
        )}
      >
        <form id={createModalFormId} onSubmit={handleSubmit} className={styles.formContainer} noValidate>
          <div className={styles.modalBody}>
            {hasAttemptedSubmit && allErrors.length > 0 ? (
              <div className={styles.createValidationSummary} role="alert">
                <p className={styles.createValidationSummaryTitle}>
                  {`Còn ${allErrors.length} mục cần hoàn thiện`}
                </p>
                <ul className={styles.createValidationSummaryList}>
                  {allErrors.map((error, errorIndex) => (
                    <li key={`${error.field}-${errorIndex}`}>
                      <button
                        type="button"
                        className={styles.createValidationSummaryItem}
                        onClick={() => focusCreateRequestField(error.field)}
                      >
                        {error.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {bannerError ? (
              <div className={styles.createValidationSummary} role="alert">
                <p className={styles.createValidationSummaryTitle}>{bannerError}</p>
              </div>
            ) : null}
            {/* LOẠI TÁC VỤ */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>LOẠI TÁC VỤ</label>
                {isDmvlMode ? (
                  <div className={styles.requestTypeGroup}>
                    <button type="button" className={`${styles.requestTypeBtn} ${styles.requestTypeBtnActive}`} disabled>
                      Tạo mới
                    </button>
                  </div>
                ) : (
                  <div className={styles.requestTypeGroup}>
                    {(['Tạo mới', 'Điều chỉnh'] as const).map(type => (
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
                )}
              </div>
            </div>

            {/* THƯ MỤC BAN HÀNH */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel} htmlFor={CREATE_REQUEST_FIELD_IDS.folderLuuTru}>
                  THƯ MỤC BAN HÀNH <span className={styles.required}>*</span>
                </label>
                <div className={styles.folderInputWrapper}>
                  <div className={`${styles.folderInputLeft} ${folderFieldError ? styles.folderInputInvalid : ''}`}>
                    <FolderAccentIcon />
                    <input
                      id={CREATE_REQUEST_FIELD_IDS.folderLuuTru}
                      type="text"
                      readOnly
                      placeholder={isDmvlMode ? (isDmvlFolderLoading ? 'Đang tải thư mục DMVL...' : 'Thư mục DMVL') : 'Chọn thư mục ban hành...'}
                      value={formValues.folderLuuTru}
                      className={styles.folderInputText}
                      onClick={() => {
                        if (!isDmvlMode) {
                          setShowFolderPicker(true);
                        }
                      }}
                      onBlur={() => markFieldTouched('folderLuuTru')}
                      aria-invalid={Boolean(folderFieldError)}
                      aria-describedby={folderFieldError ? `${CREATE_REQUEST_FIELD_IDS.folderLuuTru}-error` : undefined}
                    />
                  </div>
                  {!isDmvlMode ? (
                  <button
                    type="button"
                    className={styles.btnSelectFolder}
                    onClick={() => setShowFolderPicker(true)}
                  >
                    <FolderSelectIcon />
                    Chọn
                  </button>
                  ) : null}
                </div>
                <CreateFieldError id={`${CREATE_REQUEST_FIELD_IDS.folderLuuTru}-error`} message={folderFieldError} />
              </div>
            </div>

            {/* TÊN VĂN BẢN (TIẾNG VIỆT) */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel} htmlFor={CREATE_REQUEST_FIELD_IDS.title}>
                  TÊN VĂN BẢN (TIẾNG VIỆT) <span className={styles.required}>*</span>
                </label>
                <input
                  id={CREATE_REQUEST_FIELD_IDS.title}
                  type="text"
                  placeholder={isAdjustOrRevokeRequest ? 'Chọn thư mục ban hành để tự điền...' : 'Nhập tên đầy đủ...'}
                  value={formValues.title}
                  onChange={event => handleTitleChange(event.target.value)}
                  onBlur={() => markFieldTouched('title')}
                  readOnly={isAdjustOrRevokeRequest}
                  disabled={isAdjustOrRevokeRequest}
                  className={`${styles.formInput} ${titleFieldError ? styles.formInputInvalid : ''}`}
                  aria-invalid={Boolean(titleFieldError)}
                  aria-describedby={titleFieldError ? `${CREATE_REQUEST_FIELD_IDS.title}-error` : undefined}
                />
                <CreateFieldError id={`${CREATE_REQUEST_FIELD_IDS.title}-error`} message={titleFieldError} />
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
                  onChange={event => handleTitleEnChange(event.target.value)}
                  className={styles.formInput}
                />
              </div>
            </div>

            

            {/* NGÀY HIỆU LỰC & NGÀY HẾT HIỆU LỰC */}
            <div className={styles.formRowTwoCol}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel} htmlFor={CREATE_REQUEST_FIELD_IDS.hieuLucTu}>
                  NGÀY HIỆU LỰC <span className={styles.required}>*</span>
                </label>
                <PhvbMagDateOnlyField
                  id={CREATE_REQUEST_FIELD_IDS.hieuLucTu}
                  value={formValues.hieuLucTu}
                  onChange={value => updateField('hieuLucTu', value)}
                  onBlur={() => markFieldTouched('hieuLucTu')}
                  isInvalid={Boolean(hieuLucTuError)}
                  ariaDescribedBy={hieuLucTuError ? `${CREATE_REQUEST_FIELD_IDS.hieuLucTu}-error` : undefined}
                />
                <CreateFieldError id={`${CREATE_REQUEST_FIELD_IDS.hieuLucTu}-error`} message={hieuLucTuError} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel} htmlFor="phvb-create-hieu-luc-den">NGÀY HẾT HIỆU LỰC</label>
                <PhvbMagDateOnlyField
                  id="phvb-create-hieu-luc-den"
                  value={formValues.hieuLucDen}
                  onChange={value => updateField('hieuLucDen', value)}
                />
              </div>
            </div>

            {/* LÝ DO BAN HÀNH / TÓM TẮT NỘI DUNG */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>
                  LÝ DO BAN HÀNH / TÓM TẮT NỘI DUNG <span className={styles.required}>*</span>
                </label>
                {!isRevoke && (
                  <div className={styles.createSummaryHintCallout}>
                    <SummaryHintIcon className={styles.createSummaryHintIcon} />
                    <p className={styles.createSummaryHintText}>
                      Đây là nội dung mô tả được hiển thị trên Intranet. Ghi chú nội bộ cho cấp thẩm định/phê duyệt vui lòng điền ở phần Ghi chú cho cấp thẩm định / phê duyệt bên dưới.
                    </p>
                  </div>
                )}
                <textarea
                  id={CREATE_REQUEST_FIELD_IDS.summary}
                  rows={4}
                  placeholder={isRevokeRequestType(formValues.requestType)
                    ? 'Nêu rõ lý do thu hồi văn bản...'
                    : 'Mục đích, bối cảnh và nội dung chính của văn bản...'}
                  value={formValues.summary}
                  onChange={event => updateField('summary', event.target.value)}
                  onBlur={() => markFieldTouched('summary')}
                  className={`${styles.formTextArea} ${summaryFieldError ? styles.formInputInvalid : ''}`}
                  aria-invalid={Boolean(summaryFieldError)}
                  aria-describedby={summaryFieldError ? `${CREATE_REQUEST_FIELD_IDS.summary}-error` : undefined}
                />
                <CreateFieldError id={`${CREATE_REQUEST_FIELD_IDS.summary}-error`} message={summaryFieldError} />
              </div>
            </div>

            {formRules.showTaiLieuSoanThao && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel} htmlFor={CREATE_REQUEST_FIELD_IDS.taiLieuFiles}>
                  TÀI LIỆU SOẠN THẢO {requiresTaiLieuAttachments && !hasTaiLieuAttachments && <span className={styles.required}>*</span>}
                </label>
                <span className={styles.fieldSubtitle}>File văn bản chính cần phát hành (.docx, .pdf, .xlsx, .xls)</span>

                <PhvbMagCreateTemplatePanel isActive={isOpen} siteContext={siteContext} />

                <div
                  id={CREATE_REQUEST_FIELD_IDS.taiLieuFiles}
                  tabIndex={0}
                  className={`${styles.dragDropZone} ${isDragging1 ? styles.dragDropActive : ''} ${hasTaiLieuAttachments ? styles.dragDropHasFile : ''} ${taiLieuFieldError ? styles.dragDropInvalid : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging1(true); }}
                  onDragLeave={() => setIsDragging1(false)}
                  onDrop={event => handleDropFiles(event, 'taiLieuFiles')}
                  onClick={() => openFilePicker(file1Ref)}
                  onBlur={() => markFieldTouched('taiLieuFiles')}
                  aria-invalid={Boolean(taiLieuFieldError)}
                  aria-describedby={taiLieuFieldError ? `${CREATE_REQUEST_FIELD_IDS.taiLieuFiles}-error` : undefined}
                >
                  <input
                    type="file"
                    ref={file1Ref}
                    accept={DRAFT_DOCUMENT_ACCEPT}
                    multiple
                    style={{ display: 'none' }}
                    onChange={event => handleFileInputChange(event, 'taiLieuFiles')}
                  />
                  
                  {hasTaiLieuAttachments ? (
                    <div className={styles.dragDropContent} style={{ width: '100%', gap: 8 }}>
                      {existingTaiLieu.map(attachment => (
                        <div key={`existing-tl-${attachment.id}`} className={styles.fileCard}>
                          <div className={styles.fileIconArea}>
                            <DocumentFileIcon />
                          </div>
                          <div className={styles.fileMetaArea}>
                            <div className={styles.fileName}>
                              <PhvbMagExternalLink href={attachment.fileUrl}>
                                {attachment.name}
                              </PhvbMagExternalLink>
                            </div>
                            <div className={styles.fileSize}>{formatExistingFileMeta(attachment)}</div>
                          </div>
                          <button
                            type="button"
                            className={styles.btnTrash}
                            onClick={event => handleRemoveExistingAttachment(attachment, 'taiLieu', event)}
                            aria-label={`Xóa tài liệu ${attachment.name}`}
                          >
                            <DeleteFileIcon />
                          </button>
                        </div>
                      ))}
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
                <CreateFieldError id={`${CREATE_REQUEST_FIELD_IDS.taiLieuFiles}-error`} message={taiLieuFieldError} />
              </div>
            </div>
            )}
            {formRules.showBieuMauDinhKem && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel} htmlFor={CREATE_REQUEST_FIELD_IDS.bieuMauFiles}>BIỂU MẪU CẦN BAN HÀNH</label>
                <span className={styles.fieldSubtitle}>
                  CBNV có thể tải được biểu mẫu về để sử dụng sau khi ban hành
                </span>

                <div
                  id={CREATE_REQUEST_FIELD_IDS.bieuMauFiles}
                  tabIndex={0}
                  className={`${styles.dragDropZone} ${isDragging2 ? styles.dragDropActive : ''} ${existingBieuMau.length > 0 || formValues.bieuMauFiles.length > 0 ? styles.dragDropHasFile : ''} ${bieuMauFieldError ? styles.dragDropInvalid : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging2(true); }}
                  onDragLeave={() => setIsDragging2(false)}
                  onDrop={event => handleDropFiles(event, 'bieuMauFiles')}
                  onClick={() => openFilePicker(file2Ref)}
                  onBlur={() => markFieldTouched('bieuMauFiles')}
                  aria-invalid={Boolean(bieuMauFieldError)}
                  aria-describedby={bieuMauFieldError ? `${CREATE_REQUEST_FIELD_IDS.bieuMauFiles}-error` : undefined}
                >
                  <input
                    type="file"
                    ref={file2Ref}
                    accept={FORM_ATTACHMENT_ACCEPT}
                    multiple
                    style={{ display: 'none' }}
                    onChange={event => handleFileInputChange(event, 'bieuMauFiles')}
                  />

                  {existingBieuMau.length > 0 || formValues.bieuMauFiles.length > 0 ? (
                    <div className={styles.dragDropContent} style={{ width: '100%', gap: 8 }}>
                      {existingBieuMau.map(attachment => (
                        <div key={`existing-bm-${attachment.id}`} className={styles.fileCard}>
                          <div className={styles.fileIconArea}>
                            <FormTemplateFileIcon />
                          </div>
                          <div className={styles.fileMetaArea}>
                            <div className={styles.fileName}>
                              <PhvbMagExternalLink href={attachment.fileUrl}>
                                {attachment.name}
                              </PhvbMagExternalLink>
                            </div>
                            <div className={styles.fileSize}>{formatExistingFileMeta(attachment)}</div>
                          </div>
                          <button
                            type="button"
                            className={styles.btnTrash}
                            onClick={event => handleRemoveExistingAttachment(attachment, 'bieuMau', event)}
                            aria-label={`Xóa biểu mẫu ${attachment.name}`}
                          >
                            <DeleteFileIcon />
                          </button>
                        </div>
                      ))}
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
                <CreateFieldError id={`${CREATE_REQUEST_FIELD_IDS.bieuMauFiles}-error`} message={bieuMauFieldError} />
              </div>
            </div>
            )}

            {!isDmvlMode ? (
            <>
            {/* LUỒNG THẨM ĐỊNH SECTION */}
            <div className={styles.workflowSection}>
              <h4 className={styles.workflowSectionTitle}>LUỒNG THẨM ĐỊNH</h4>

              {formRules.showGhiChuThamDinh && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel} htmlFor={CREATE_REQUEST_FIELD_IDS.ghiChuThamDinh}>
                    GHI CHÚ CHO CẤP THẨM ĐỊNH / PHÊ DUYỆT
                    {formRules.requireGhiChuThamDinh && <span className={styles.required}>*</span>}
                  </label>
                  <textarea
                    id={CREATE_REQUEST_FIELD_IDS.ghiChuThamDinh}
                    rows={2}
                    placeholder="Điểm cần chú ý, yêu cầu đặc biệt khi thẩm định / phê duyệt..."
                    value={formValues.ghiChuThamDinh}
                    onChange={event => updateField('ghiChuThamDinh', event.target.value)}
                    onBlur={() => markFieldTouched('ghiChuThamDinh')}
                    className={`${styles.formTextAreaSmall} ${ghiChuFieldError ? styles.formInputInvalid : ''}`}
                    aria-invalid={Boolean(ghiChuFieldError)}
                    aria-describedby={ghiChuFieldError ? `${CREATE_REQUEST_FIELD_IDS.ghiChuThamDinh}-error` : undefined}
                  />
                  <CreateFieldError id={`${CREATE_REQUEST_FIELD_IDS.ghiChuThamDinh}-error`} message={ghiChuFieldError} />
                </div>
              </div>
              )}

              {(formRules.showNguoiGopY || formRules.showNguoiThamDinh) && (
              <div className={styles.formRowTwoCol}>
                {formRules.showNguoiGopY && (
                <UserTagPicker
                  label="NGƯỜI GÓP Ý"
                  required={formRules.requireNguoiGopY}
                  selectedEmails={formValues.nguoiGopY}
                  onChange={emails => {
                    markFieldTouched('nguoiGopY');
                    updateField('nguoiGopY', emails);
                  }}
                  approvers={approvers}
                  peopleError={fieldError('nguoiGopY')}
                  peopleInputId={CREATE_REQUEST_FIELD_IDS.nguoiGopY}
                  peopleDescribedBy={fieldError('nguoiGopY') ? `${CREATE_REQUEST_FIELD_IDS.nguoiGopY}-error` : undefined}
                  onPeopleBlur={() => markFieldTouched('nguoiGopY')}
                  placeholder="Nhập tên hoặc email..."
                  isLoading={isLoadingApprovers}
                />
                )}

                {formRules.showNguoiThamDinh && (
                <UserTagPicker
                  label="NGƯỜI THẨM ĐỊNH"
                  required={formRules.requireNguoiThamDinh}
                  selectedEmails={formValues.nguoiThamDinh}
                  onChange={emails => {
                    markFieldTouched('nguoiThamDinh');
                    updateField('nguoiThamDinh', emails);
                  }}
                  approvers={approvers}
                  peopleError={fieldError('nguoiThamDinh')}
                  peopleInputId={CREATE_REQUEST_FIELD_IDS.nguoiThamDinh}
                  peopleDescribedBy={fieldError('nguoiThamDinh') ? `${CREATE_REQUEST_FIELD_IDS.nguoiThamDinh}-error` : undefined}
                  onPeopleBlur={() => markFieldTouched('nguoiThamDinh')}
                  placeholder="Nhập tên hoặc email..."
                  isLoading={isLoadingApprovers}
                />
                )}
              </div>
              )}

              <div className={styles.formRowTwoCol}>
                <UserTagPicker
                  label="NGƯỜI PHÊ DUYỆT"
                  required
                  selectedEmails={formValues.approvalUsers}
                  onChange={emails => {
                    markFieldTouched('approvalUsers');
                    updateField('approvalUsers', emails);
                  }}
                  approvers={approvers}
                  peopleError={fieldError('approvalUsers')}
                  peopleInputId={CREATE_REQUEST_FIELD_IDS.approvalUsers}
                  peopleDescribedBy={fieldError('approvalUsers') ? `${CREATE_REQUEST_FIELD_IDS.approvalUsers}-error` : undefined}
                  onPeopleBlur={() => markFieldTouched('approvalUsers')}
                  placeholder="Nhập tên hoặc email..."
                  isLoading={isLoadingApprovers}
                />
              </div>
            </div>
            </>
            ) : null}
          </div>
        </form>
      </PhvbMagDialog>

      <PhvbMagFolderPickerDialog
        isOpen={showFolderPicker}
        requestType={formValues.requestType}
        siteContext={siteContext}
        onClose={() => setShowFolderPicker(false)}
        onConfirm={handleFolderConfirm}
      />
    </>
  );
}