"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock3,
  CheckCircle2,
  AlertCircle,
  Terminal,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useIGWorker } from "@/service/worker";

export default function IGWorkerPanel() {
  // 1. Konsumsi custom hook worker
  const { status, isStarting, restartJob } = useIGWorker();

  // 2. Ref untuk Menyimpan Logika Waktu Mulai & Pointer Elemen DOM HTML
  const startTimeRef = useRef<number | null>(null);
  const runtimeDisplayRef = useRef<HTMLHeadingElement | null>(null);

  // Efek Pengatur Timer Runtime
  useEffect(() => {
    if (!status.running) {
      startTimeRef.current = null;
      if (runtimeDisplayRef.current) {
        runtimeDisplayRef.current.innerText = "00:00:00";
      }
      return;
    }

    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    const updateDisplay = () => {
      if (!startTimeRef.current || !runtimeDisplayRef.current) return;

      const diff = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (diff < 0) return;

      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");

      runtimeDisplayRef.current.innerText = `${h}:${m}:${s}`;
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [status.running]);

  // 3. Handler untuk Restart
  const handleRestart = async () => {
    if (
      confirm(
        "Apakah Anda yakin ingin menghentikan paksa status running saat ini dan memproses ulang spreadsheet dari awal?",
      )
    ) {
      await restartJob({
        spreadsheetId: "",
        sheetName: "Sheet1",
      });
    }
  };

  return (
    // Menambahkan w-full block keras untuk memutus rantai flex samping dari parent page
    <div className="block w-full max-w-6xl space-y-6 clear-both">
      {/* BANNER ALERT JIKA COOKIES INSTAGRAM KOSONG */}
      {!status.sessionActive && (
        <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle
            className="mt-0.5 flex-shrink-0 text-amber-500"
            size={18}
          />
          <div>
            <span className="font-bold">Session Instagram Tidak Aktif!</span>{" "}
            Worker kemungkinan gagal berjalan. Silakan sinkronisasikan ulang
            cookies akun Anda melalui browser extension.
          </div>
        </div>
      )}

      {/* ERROR ALERT DARI HOOK */}
      {status.error && (
        <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle
            className="mt-0.5 flex-shrink-0 text-rose-500"
            size={18}
          />
          <div>
            <span className="font-bold">Error Terdeteksi:</span> {status.error}
          </div>
        </div>
      )}

      {/* MONITOR STATUS CARD (Menghapus properti layout framer-motion untuk menghindari penyusutan CSS) */}
      <div
        className={`w-full block rounded-2xl border p-6 shadow-sm transition-all duration-300 ${
          status.running
            ? "bg-emerald-50/60 border-emerald-200"
            : "bg-rose-50/60 border-rose-200"
        }`}
      >
        {/* Menggunakan grid mandiri yang memaksa pemisahan baris teks dan tombol */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-3 space-y-2">
            <p className="text-xs uppercase font-bold tracking-widest text-gray-500">
              Current Status
            </p>
            <div className="flex items-center gap-3 mt-1">
              <div className="relative">
                {status.running && (
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
                )}
                <div
                  className={`relative h-4 w-4 rounded-full ${status.running ? "bg-emerald-500" : "bg-rose-400"}`}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.span
                  key={String(status.running)}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`font-black text-2xl tracking-wide ${status.running ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {status.running ? "RUNNING" : "STOPPED"}
                </motion.span>
              </AnimatePresence>
            </div>

            <p className="text-gray-600 text-sm">
              {status.running
                ? "Worker sedang aktif memproses baris spreadsheet dari background task server..."
                : "Worker dalam keadaan stand-by. Klik 'Restart Job' untuk memicu pemrosesan ulang."}
            </p>
          </div>

          <div className="md:col-span-1 w-full flex justify-start md:justify-end">
            <button
              onClick={handleRestart}
              disabled={isStarting}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold transition-all shadow-md cursor-pointer text-center"
              // Ditambahkan backgroundColor & color inline keras sebagai cadangan anti-gagal
              style={{
                minWidth: "150px",
                display: "flex",
                backgroundColor: isStarting ? "#E5E7EB" : "#F59E0B",
                color: isStarting ? "#9CA3AF" : "#FFFFFF",
              }}
            >
              <RefreshCw
                size={16}
                className={isStarting ? "animate-spin" : ""}
              />
              <span className="whitespace-nowrap">
                {isStarting ? "Restarting..." : "Restart Job"}
              </span>
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        {status.running && (
          <div className="mt-6 pt-6 border-t border-emerald-200/50 w-full block">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-emerald-700">
                Progress Task
              </span>
              <span className="font-bold text-emerald-800">
                {status.processed} / {status.total} Items ({status.progress}%)
              </span>
            </div>
            <div className="w-full bg-emerald-200/50 h-3 rounded-full overflow-hidden">
              <motion.div
                className="bg-emerald-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${status.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* METRICS STATS */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <Clock3 className="text-amber-500" size={18} />
            <span className="text-xs font-bold text-gray-400">RUNTIME</span>
          </div>
          <h3
            ref={runtimeDisplayRef}
            className="text-3xl font-bold text-gray-800 mt-4 font-mono"
          >
            00:00:00
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Durasi panel UI memantau proses
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <CheckCircle2 className="text-indigo-500" size={18} />
            <span className="text-xs font-bold text-gray-400">LAST RUN</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mt-4 break-all">
            {status.lastRun || "-"}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Timestamp terakhir dari server log
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <ShieldCheck
              className={
                status.sessionActive ? "text-emerald-500" : "text-rose-500"
              }
              size={18}
            />
            <span className="text-xs font-bold text-gray-400">
              SESSION AUTH
            </span>
          </div>
          <h3
            className={`text-xl font-bold mt-4 ${status.sessionActive ? "text-emerald-600" : "text-rose-500"}`}
          >
            {status.sessionActive ? "CONNECTED" : "DISCONNECTED"}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Status ketersediaan token di backend
          </p>
        </div>
      </div>

      {/* REAL-TIME TERMINAL LOG */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Terminal size={18} className="text-gray-600" /> Activity Log Terminal
        </h3>
        <div className="bg-slate-900 rounded-xl p-4 text-emerald-400 text-xs font-mono h-64 overflow-y-auto space-y-1 shadow-inner select-text">
          {status.log.length === 0 ? (
            <div className="text-gray-500 italic">
              [SYSTEM] Menunggu pembaruan log server...
            </div>
          ) : (
            status.log.map((logStr, idx) => (
              <div
                key={idx}
                className="hover:bg-slate-800 px-1 py-0.5 rounded transition-colors"
              >
                {logStr}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
