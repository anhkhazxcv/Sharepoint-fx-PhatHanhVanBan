import { toast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'light'
};

export class ToastService {
  public static success(message: string, options?: ToastOptions): void {
    toast.success(message, { ...defaultOptions, ...options });
  }

  public static error(message: string, options?: ToastOptions): void {
    toast.error(message, { ...defaultOptions, ...options });
  }

  public static info(message: string, options?: ToastOptions): void {
    toast.info(message, { ...defaultOptions, ...options });
  }

  public static warning(message: string, options?: ToastOptions): void {
    toast.warn(message, { ...defaultOptions, ...options });
  }
}
