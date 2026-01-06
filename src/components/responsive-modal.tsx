// src/components/responsive-modal.tsx
"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  showCloseButton?: boolean;
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "lg",
  showCloseButton = true,
}: ResponsiveModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full ${maxWidthClasses[maxWidth]} max-h-[95vh] overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-2xl flex flex-col`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 flex-shrink-0">
            {title && <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  type = "info",
  isLoading = false,
}: ConfirmModalProps) {
  const colors = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    info: "bg-violet-600 hover:bg-violet-700",
  };

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} maxWidth="sm" showCloseButton={false}>
      <div className="text-center">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{title}</h3>
        <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 whitespace-pre-line">{message}</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 sm:py-3 ${colors[type]} text-white rounded-lg sm:rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base`}
          >
            {isLoading ? "Memproses..." : confirmText}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: "success" | "error" | "warning";
}

export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type,
}: NotificationModalProps) {
  const bgColors = {
    success: "bg-gradient-to-r from-green-500 to-emerald-600",
    error: "bg-gradient-to-r from-red-500 to-pink-600",
    warning: "bg-gradient-to-r from-amber-500 to-orange-600",
  };

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
  };

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} maxWidth="md" showCloseButton={false}>
      <div className={`${bgColors[type]} -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-4 sm:py-6 mb-4 sm:mb-6`}>
        <div className="flex flex-col items-center text-center">
          <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">{icons[type]}</div>
          <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 whitespace-pre-line">{message}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base"
        >
          Tutup
        </button>
      </div>
    </ResponsiveModal>
  );
}
