"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import API2 from "./api2";

// ─── Types ───────────────────────────────────────────────────
export interface WorkerConfig {
  spreadsheetId: string;
  sheetName: string;
}

export interface WorkerStatus {
  running: boolean;
  progress: number;
  processed: number;
  total: number;
  lastRun: string | null;
  error: string | null;
  log: string[];
  sessionActive: boolean; // Berdasarkan return "session_active" dari backend
}

// ─── Hook ────────────────────────────────────────────────────
const DEFAULT_STATUS: WorkerStatus = {
  running: false,
  progress: 0,
  processed: 0,
  total: 0,
  lastRun: null,
  error: null,
  log: [],
  sessionActive: false,
};

export function useIGWorker() {
  const [status, setStatus] = useState<WorkerStatus>(DEFAULT_STATUS);
  const [isStarting, setIsStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fungsi untuk menghentikan loop polling data status
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await API2.get("/status");
        setStatus({
          running: data.running,
          progress: data.progress,
          processed: data.processed,
          total: data.total,
          lastRun: data.last_run,
          error: data.error,
          log: data.log ?? [],
          sessionActive: data.session_active,
        });

        // Jika backend menyatakan job sudah selesai/berhenti, hentikan interval polling
        if (!data.running) stopPolling();
      } catch (err) {
        console.log(err);
      }
    }, 3000);
  }, [stopPolling]);

  // AUTOMATIC INITIAL CHECK: Dipanggil sekali saat halaman dibuka/refresh
  // AUTOMATIC INITIAL CHECK: Dipanggil sekali saat halaman dibuka/refresh
  useEffect(() => {
    let isMounted = true;

    const checkInitialStatus = async () => {
      try {
        const { data } = await API2.get("/status");

        if (!isMounted) return;

        setStatus({
          running: data.running,
          progress: data.progress,
          processed: data.processed,
          total: data.total,
          lastRun: data.last_run,
          error: data.error,
          log: data.log ?? [],
          sessionActive: data.session_active,
        });

        // FIX: Gunakan setTimeout 0 untuk memindahkan eksekusi startPolling
        // ke antrean event loop berikutnya, menghindari sinkronisasi render di React.
        if (data.running) {
          setTimeout(() => {
            if (isMounted) startPolling();
          }, 0);
        }
      } catch (err) {
        console.error("Gagal mengambil status inisialisasi server:", err);
      }
    };

    checkInitialStatus();

    // Jalankan pembersihan sisa interval saat komponen di-unmount
    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  // 2. FORCE RESTART JOB (POST ke /api/job/restart)
  const restartJob = useCallback(
    async (config: WorkerConfig) => {
      setIsStarting(true);
      setStatus((prev) => ({ ...prev, error: null }));
      try {
        await API2.post("/api/job/restart", {
          spreadsheet_id: config.spreadsheetId,
          sheet_name: config.sheetName,
        });

        setStatus((prev) => ({ ...prev, running: true }));
        startPolling();
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? (e instanceof Error ? e.message : String(e));
        setStatus((prev) => ({ ...prev, error: msg }));
      } finally {
        setIsStarting(false);
      }
    },
    [startPolling],
  );

  // 3. STOP JOB (POST ke /stop)
  const stopJob = useCallback(async () => {
    setIsStarting(true);
    try {
      await API2.post("/stop");
      stopPolling();
      setStatus((prev) => ({ ...prev, running: false }));
    } catch (e: unknown) {
      console.error("Gagal mengirim sinyal stop ke server:", e);
    } finally {
      setIsStarting(false);
    }
  }, [stopPolling]);

  return { status, isStarting, restartJob, stopJob };
}
