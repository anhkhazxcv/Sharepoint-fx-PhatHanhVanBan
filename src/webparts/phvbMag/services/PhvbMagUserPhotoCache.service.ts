import type { MSGraphClientFactory } from '@microsoft/sp-http';
import { phvbMagGraphService } from './PhvbMagGraph.service';

const photoPromiseByEmail = new Map<string, Promise<string | undefined>>();

export function getOrFetchUserPhotoByEmail(
  msGraphClientFactory: MSGraphClientFactory,
  email: string
): Promise<string | undefined> {
  const key = email.trim().toLowerCase();

  if (!key) {
    return Promise.resolve(undefined);
  }

  let pending = photoPromiseByEmail.get(key);

  if (!pending) {
    pending = phvbMagGraphService.loadUserPhotoByEmail(msGraphClientFactory, key);
    photoPromiseByEmail.set(key, pending);
  }

  return pending;
}
