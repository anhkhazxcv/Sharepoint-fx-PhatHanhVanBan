import { useEffect, useState } from 'react';

interface IPhvbAvatarPhotoState {
  showPhoto: boolean;
  onImageError: () => void;
}

export function usePhvbAvatarPhotoState(photoUrl?: string): IPhvbAvatarPhotoState {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  return {
    showPhoto: Boolean(photoUrl) && !failed,
    onImageError: () => setFailed(true)
  };
}
