"use client";

import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
  }[type];

  const icon = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 z-9999 ${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl max-w-md animate-slideIn flex items-start gap-3`}
    >
      <div className="shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium whitespace-pre-line">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="shrink-0 text-white/80 hover:text-white transition-colors ml-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );
}

// Hook untuk menggunakan toast
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType }>>([]);
  let nextId = 0;

  const showToast = (message: string, type: ToastType = "info", duration = 3000) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    showToast,
    removeToast,
    success: (msg: string, duration?: number) => showToast(msg, "success", duration),
    error: (msg: string, duration?: number) => showToast(msg, "error", duration),
    warning: (msg: string, duration?: number) => showToast(msg, "warning", duration),
    info: (msg: string, duration?: number) => showToast(msg, "info", duration),
  };
}

// Toast Container Component
export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Array<{ id: number; message: string; type: ToastType }>;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-9999 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
