'use client';

import { Toast, ToastClose, ToastDescription, ToastRegion, ToastTitle } from '@ui-sdk/react/toast';

export function Toaster() {
  return (
    <ToastRegion side="bottom" align="end" className="toasts">
      {() => (
        <Toast className="toast">
          <ToastTitle className="toast-title" />
          <ToastDescription className="toast-description" />
          <ToastClose className="toast-close" aria-label="Dismiss" />
        </Toast>
      )}
    </ToastRegion>
  );
}
