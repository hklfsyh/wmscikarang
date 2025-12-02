'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera, CheckCircle, XCircle, Info, Scan } from 'lucide-react';

/**
 * QR Scanner Component with Real Camera (Improved)
 * 
 * Format QR Code yang diharapkan (text):
 * EKSPEDISI|PRODUK_ID|BB_PALLET|KD_PLANT|EXPIRED_DATE
 * 
 * Contoh:
 * HGS|AQ200_1X48|270404|90A8|2025-12-31
 */

export interface QRData {
  ekspedisi: string;
  produkId: string;
  bbPallet: string;
  kdPlant: string;
  expiredDate: string;
}

interface QRScannerProps {
  onScanSuccess: (data: QRData) => void;
  onScanError?: (error: string) => void;
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>("");

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      const decodedText = result[0].rawValue;
      setScanStatus("✅ QR Code terdeteksi! Memproses...");
      
      // Parse format: EKSPEDISI|PRODUK_ID|BB_PALLET|KD_PLANT|EXPIRED_DATE
      const parts = decodedText.split("|");
      
      if (parts.length !== 5) {
        const errorMsg = "Format QR tidak valid. Format: EKSPEDISI|PRODUK_ID|BB_PALLET|KD_PLANT|EXPIRED_DATE";
        setScanStatus("❌ " + errorMsg);
        setError(errorMsg);
        onScanError?.(errorMsg);
        return;
      }

      const [ekspedisi, produkId, bbPallet, kdPlant, expiredDate] = parts;

      if (!ekspedisi || !produkId || !bbPallet || !kdPlant || !expiredDate) {
        const errorMsg = "Salah satu field di QR code kosong";
        setScanStatus("❌ " + errorMsg);
        setError(errorMsg);
        onScanError?.(errorMsg);
        return;
      }

      // Success
      setSuccess(true);
      onScanSuccess({
        ekspedisi: ekspedisi.trim(),
        produkId: produkId.trim(),
        bbPallet: bbPallet.trim(),
        kdPlant: kdPlant.trim(),
        expiredDate: expiredDate.trim(),
      });
      
      setTimeout(() => {
        setIsScanning(false);
        setSuccess(false);
        setScanStatus("");
        setError(null);
      }, 800);
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
    setError('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
  };

  const handleToggle = () => {
    if (isScanning) {
      setIsScanning(false);
      setScanStatus("");
      setError(null);
      setSuccess(false);
    } else {
      setIsScanning(true);
      setScanStatus("📷 Arahkan kamera ke QR Code...");
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold"
      >
        {isScanning ? (
          <>
            <X className="h-5 w-5" />
            <span>Tutup Scanner</span>
          </>
        ) : (
          <>
            <Camera className="h-5 w-5" />
            <span>Scan QR Code</span>
          </>
        )}
      </button>

      {isScanning && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-linear-to-r from-purple-500 to-indigo-600 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Scan className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">QR Scanner</h3>
                    <p className="text-xs text-purple-100">Arahkan ke QR Code</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggle}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Scanner Container */}
            <div className="p-3">
              {/* Camera Preview Area */}
              <div className="relative rounded-lg overflow-hidden" style={{ height: '280px' }}>
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{
                    facingMode: 'environment',
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      height: '280px',
                    },
                  }}
                />
                
                {success && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3">
                      <CheckCircle className="w-12 h-12 text-green-500" />
                      <p className="text-lg font-semibold text-gray-900">Berhasil!</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status */}
              {scanStatus && (
                <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-900 text-center">
                    {scanStatus}
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-red-900 font-medium">Error</p>
                    <p className="text-xs text-red-800 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start gap-2">
                  <Info className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 mb-1">
                      Format QR:
                    </p>
                    <code className="text-[10px] bg-white px-2 py-1 rounded border border-slate-300 block font-mono text-slate-700 overflow-x-auto whitespace-nowrap">
                      EKSPEDISI|PRODUK_ID|BB_PALLET|KD_PLANT|EXPIRED_DATE
                    </code>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <div className="bg-gray-50 rounded p-1.5 text-center">
                  <p className="text-xs font-medium text-gray-900">💡 Terang</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center">
                  <p className="text-xs font-medium text-gray-900">📏 10-20cm</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center">
                  <p className="text-xs font-medium text-gray-900">🎯 Tengah</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
