import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast from '@/components/Toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('info');
  const [toastDuration, setToastDuration] = useState(3000);

  const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
    setToastMessage(message);
    setToastType(type);
    setToastDuration(duration);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={toastMessage}
        type={toastType}
        duration={toastDuration}
        visible={toastVisible}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};
