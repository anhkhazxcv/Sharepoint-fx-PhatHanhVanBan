import { useEffect, useMemo, useState } from 'react';
import type { MSGraphClientFactory } from '@microsoft/sp-http';
import { getOrFetchUserPhotoByEmail } from '../services/PhvbMagUserPhotoCache.service';

interface IUsePhvbUserPhotosByEmailOptions {
  msGraphClientFactory: MSGraphClientFactory;
  emails: Array<string | undefined>;
}

function buildUniqueEmailsKey(emails: Array<string | undefined>): string {
  const seen: Record<string, boolean> = {};

  emails.forEach(email => {
    const normalized = (email || '').trim().toLowerCase();
    if (normalized) {
      seen[normalized] = true;
    }
  });

  return Object.keys(seen).sort().join('|');
}

export function usePhvbUserPhotosByEmail(options: IUsePhvbUserPhotosByEmailOptions): Record<string, string | undefined> {
  const { msGraphClientFactory, emails } = options;
  const uniqueEmailsKey = useMemo(() => buildUniqueEmailsKey(emails), [emails]);
  const [photosByEmail, setPhotosByEmail] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    let isMounted = true;
    const uniqueEmails = uniqueEmailsKey ? uniqueEmailsKey.split('|') : [];

    uniqueEmails.forEach(email => {
      getOrFetchUserPhotoByEmail(msGraphClientFactory, email)
        .then(photoUrl => {
          if (isMounted) {
            setPhotosByEmail(previous => ({ ...previous, [email]: photoUrl }));
          }
        })
        .catch(() => undefined);
    });

    return () => {
      isMounted = false;
    };
  }, [uniqueEmailsKey, msGraphClientFactory]);

  return photosByEmail;
}
