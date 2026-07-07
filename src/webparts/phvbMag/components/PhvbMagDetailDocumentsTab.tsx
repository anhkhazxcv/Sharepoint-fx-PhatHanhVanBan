import * as React from 'react';
import type { IAttachmentLibraryItem } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailDocumentsTabProps {
  attachments: IAttachmentLibraryItem[];
}

export function PhvbMagDetailDocumentsTab(props: IPhvbMagDetailDocumentsTabProps): React.ReactElement {
  const { attachments } = props;

  if (attachments.length === 0) {
    return (
      <div className={styles.detailEmptyState}>
        Chưa có tài liệu đính kèm cho yêu cầu này.
      </div>
    );
  }

  const draftFiles = attachments.filter(item => !item.isFormAttachment);
  const formFiles = attachments.filter(item => item.isFormAttachment);

  const renderSection = (title: string, files: IAttachmentLibraryItem[]): React.ReactElement => (
    <div className={styles.detailDocSection}>
      <h4 className={styles.detailDocSectionTitle}>{title}</h4>
      {files.length === 0 ? (
        <p className={styles.detailDocEmpty}>Không có file.</p>
      ) : (
        <table className={styles.detailDocTable}>
          <thead>
            <tr>
              <th>Tên file</th>
              <th>Thư mục</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.id}>
                <td>
                  {file.fileUrl ? (
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.detailDocLink}>
                      {file.name}
                    </a>
                  ) : (
                    file.name
                  )}
                </td>
                <td className={styles.detailDocFolder}>{file.folderPath || '---'}</td>
                <td>
                  {file.fileUrl ? (
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.detailDocLink}>
                      Mở
                    </a>
                  ) : (
                    '---'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className={styles.detailDocuments}>
      {renderSection('Tài liệu soạn thảo', draftFiles)}
      {renderSection('Biểu mẫu đính kèm', formFiles)}
    </div>
  );
}
