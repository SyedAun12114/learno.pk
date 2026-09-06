import toast from 'react-hot-toast';

export function useToast() {
  return {
    success: (m: string) => toast.success(m),
    error: (m: string) => toast.error(m),
    loading: (m: string) => toast.loading(m),
    dismiss: (id?: string) => toast.dismiss(id),
    promise: toast.promise,
  };
}
