import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * @description Helper function untuk menggabungkan classNames Tailwind CSS secara kondisional.
 * Ini memastikan class duplicate yang bertentangan (misalnya 'p-4' dan 'p-8') akan dihapus,
 * dan hanya class terakhir yang valid yang dipertahankan (fungsi twMerge).
 * * @param inputs Daftar string, array, atau objek classNames.
 * @returns String tunggal yang berisi classNames yang sudah di-merge dan divalidasi.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
