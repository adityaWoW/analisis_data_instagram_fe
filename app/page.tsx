"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import FileSelector from "@/components/FileSelector";
import ResultCard from "@/components/ResultCard";
import API from "@/service/api";

interface FileItem {
  id: string;
  name: string;
  mimeType?: string;
  type: "folder" | "sheet" | "file";
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface JobStatus {
  job_id: string;
  status: "running" | "done" | "error";
  progress: number;
  total: number;
  done: number;
  batch_done: number;
  batch_total: number;
  message: string;
  result: Record<string, unknown> | null;
  error: string | null;
}

export default function HomePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [sheetToAnalyze, setSheetToAnalyze] = useState<string>("");
  const [loadingSheets, setLoadingSheets] = useState(false);

  // ─── JOB STATE ────────────────────────────────────────────
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Polling status job tiap 5 detik
  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await API.get<JobStatus>(`/analyze/status/${id}`);
          const status = res.data;
          setJobStatus(status);

          if (status.status === "done") {
            stopPolling();
            setAnalyzing(false);
            setResult(status.result);
          } else if (status.status === "error") {
            stopPolling();
            setAnalyzing(false);
            alert(`Analisis gagal: ${status.error || status.message}`);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    },
    [stopPolling],
  );

  // Cleanup polling saat unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const resetFileSelection = useCallback(() => {
    setSelectedFile(null);
    setAvailableSheets([]);
    setSheetToAnalyze("");
    setResult(null);
    setJobId(null);
    setJobStatus(null);
    stopPolling();
  }, [stopPolling]);

  const fetchRootFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get<ApiResponse<FileItem[]>>("/files");
      setFiles(res.data?.data || []);
      resetFileSelection();
      setFolderStack([]);
    } catch {
      alert("Gagal mengambil file utama 😢");
    } finally {
      setLoading(false);
    }
  }, [resetFileSelection]);

  const openFolder = useCallback(
    async (folder: FileItem) => {
      try {
        setLoading(true);
        const res = await API.get<ApiResponse<FileItem[]>>(
          `/files/${folder.id}`,
        );
        setFiles(res.data?.data || []);
        setFolderStack((prev) => [
          ...prev,
          { id: folder.id, name: folder.name },
        ]);
        resetFileSelection();
      } catch {
        alert("Gagal membuka folder 😢");
      } finally {
        setLoading(false);
      }
    },
    [resetFileSelection],
  );

  const fetchSpreadsheetSheets = async (fileId: string) => {
    try {
      setLoadingSheets(true);
      setAvailableSheets([]);
      setSheetToAnalyze("");
      const res = await API.get<ApiResponse<string[]>>(
        `/files/${fileId}/sheets`,
      );
      const sheetList = res.data?.data || [];
      setAvailableSheets(sheetList);
      if (sheetList.length > 0) setSheetToAnalyze(sheetList[0]);
    } catch {
      alert("Gagal memuat sheet. Pastikan Service Account memiliki akses 😢");
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleSelectFile = async (fileId: string) => {
    if (!fileId) {
      resetFileSelection();
      return;
    }
    const selected = files.find((f) => f.id === fileId);
    if (!selected) return;

    if (
      selected.type === "folder" ||
      selected.mimeType === "application/vnd.google-apps.folder"
    ) {
      await openFolder(selected);
      return;
    }

    setSelectedFile(selected);
    setResult(null);
    setJobId(null);
    setJobStatus(null);

    const isSheet =
      selected.type === "sheet" ||
      selected.mimeType?.includes("spreadsheet") ||
      selected.mimeType?.includes("sheet") ||
      selected.name.endsWith(".xlsx") ||
      selected.name.endsWith(".xls");

    if (isSheet) {
      await fetchSpreadsheetSheets(selected.id);
    } else {
      try {
        setLoadingSheets(true);
        const res = await API.get<ApiResponse<string[]>>(
          `/files/${selected.id}/sheets`,
        );
        const sheetList = res.data?.data || [];
        setAvailableSheets(sheetList);
        if (sheetList.length > 0) setSheetToAnalyze(sheetList[0]);
      } catch {
        setAvailableSheets([]);
        setSheetToAnalyze("");
      } finally {
        setLoadingSheets(false);
      }
    }
  };

  const goBack = useCallback(async () => {
    try {
      setLoading(true);
      const updatedStack = [...folderStack];
      updatedStack.pop();
      resetFileSelection();

      if (updatedStack.length === 0) {
        const res = await API.get<ApiResponse<FileItem[]>>("/files");
        setFiles(res.data?.data || []);
        setFolderStack([]);
        return;
      }

      const prev = updatedStack[updatedStack.length - 1];
      const res = await API.get<ApiResponse<FileItem[]>>(`/files/${prev.id}`);
      setFiles(res.data?.data || []);
      setFolderStack(updatedStack);
    } catch {
      alert("Gagal kembali ke folder sebelumnya 💔");
    } finally {
      setLoading(false);
    }
  }, [folderStack, resetFileSelection]);

  // ─── ANALYZE — kirim job, lalu polling ────────────────────
  const analyzeFile = async () => {
    if (!selectedFile) {
      alert("Pilih file terlebih dahulu ✨");
      return;
    }
    if (availableSheets.length > 0 && !sheetToAnalyze) {
      alert("Pilih sheet terlebih dahulu ✨");
      return;
    }

    try {
      setAnalyzing(true);
      setResult(null);
      setJobStatus(null);

      const res = await API.post<{ success: boolean; job_id: string }>(
        "/analyze",
        {
          file_id: selectedFile.id,
          sheet_name: sheetToAnalyze,
        },
      );

      const id = res.data?.job_id;
      if (!id) throw new Error("job_id tidak diterima dari server");

      setJobId(id);
      setJobStatus({
        job_id: id,
        status: "running",
        progress: 0,
        total: 0,
        done: 0,
        batch_done: 0,
        batch_total: 0,
        message: "Job dimulai...",
        result: null,
        error: null,
      });

      startPolling(id);
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
      alert("Gagal memulai analisis 😢");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (isMounted) {
        await fetchRootFiles();
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [fetchRootFiles]);

  const isRunning = analyzing || jobStatus?.status === "running";

  return (
    <main className="min-h-screen bg-[#FDF8F5] p-6 md:p-12 flex items-start justify-center font-sans">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-md shadow-rose-100/40 p-6 md:p-10 border border-rose-100/60 transition-all">
        {/* HEADER */}
        <div className="text-center mb-8">
          <span className="text-4xl inline-block mb-2">✨</span>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight md:text-4xl">
            Google Drive File Analyzer
          </h1>
          <p className="text-base text-gray-500 mt-2 font-medium">
            Pilih file, lalu tentukan sheet yang ingin dianalisis.
          </p>
        </div>

        {/* BREADCRUMB */}
        {folderStack.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-4 items-center">
            <button
              onClick={fetchRootFiles}
              className="hover:text-rose-500 font-medium transition-colors"
            >
              🏠 Utama
            </button>
            {folderStack.map((folder) => (
              <span key={folder.id} className="text-gray-400">
                /{" "}
                <span className="text-gray-600 font-medium">{folder.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* FILE SELECTOR */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-rose-500">
            Pilih File / Folder
          </label>
          <div className="p-1.5 bg-gray-50 rounded-xl border border-gray-200">
            <FileSelector
              files={files}
              selected={selectedFile?.id || ""}
              onChange={handleSelectFile}
            />
          </div>
        </div>

        {folderStack.length > 0 && (
          <button
            onClick={goBack}
            className="mt-3 text-sm text-rose-500 hover:text-rose-600 transition-colors"
          >
            ← Kembali Folder
          </button>
        )}

        {/* SHEET SELECTOR */}
        {selectedFile && (
          <div className="mt-6 p-5 rounded-xl bg-rose-50/50 border border-rose-100 space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                File Induk:
              </p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">
                📄 {selectedFile.name}
              </p>
            </div>

            {loadingSheets ? (
              <div className="pt-2 border-t border-rose-200/60 flex items-center gap-2 text-sm text-rose-500 font-medium animate-pulse">
                ⏳ Sedang memuat sheet...
              </div>
            ) : (
              availableSheets.length > 0 && (
                <div className="pt-4 border-t border-rose-200/60 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                    Pilih Sheet 👇
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {availableSheets.map((sheetName) => {
                      const isSelected = sheetToAnalyze === sheetName;
                      return (
                        <button
                          key={sheetName}
                          onClick={() => setSheetToAnalyze(sheetName)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between border ${
                            isSelected
                              ? "bg-rose-500 text-white border-rose-500 shadow-md scale-[1.01]"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <span className="truncate">📊 {sheetName}</span>
                          {isSelected && (
                            <span className="text-xs bg-white text-rose-500 px-2.5 py-1 rounded-full font-bold">
                              Terpilih
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ANALYZE BUTTON */}
        <button
          onClick={analyzeFile}
          disabled={
            isRunning ||
            loadingSheets ||
            !selectedFile ||
            (availableSheets.length > 0 && !sheetToAnalyze)
          }
          className="w-full mt-6 bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-6 rounded-xl text-base transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md flex items-center justify-center gap-2"
        >
          {isRunning
            ? "⏳ Sedang Menganalisis..."
            : `Analyze Sheet: ${sheetToAnalyze || selectedFile?.name || ""} 🚀`}
        </button>

        {/* PROGRESS BAR */}
        {jobStatus && jobStatus.status === "running" && (
          <div className="mt-6 p-5 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between text-sm font-semibold text-blue-700">
              <span>🔄 {jobStatus.message}</span>
              <span>{jobStatus.progress}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${jobStatus.progress}%` }}
              />
            </div>

            {/* Detail batch */}
            {jobStatus.batch_total > 0 && (
              <div className="flex justify-between text-xs text-blue-500 font-medium">
                <span>
                  Batch {jobStatus.batch_done}/{jobStatus.batch_total}
                </span>
                <span>
                  {jobStatus.done}/{jobStatus.total} URL selesai
                </span>
              </div>
            )}

            <p className="text-xs text-blue-400 text-center">
              Polling otomatis tiap 5 detik · Jangan tutup halaman ini
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {jobStatus?.status === "error" && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
            ❌ {jobStatus.error || jobStatus.message}
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div className="mt-10 pt-8 border-t border-gray-100">
            <h2 className="text-base font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              <span>📊</span> Hasil Analisis Sheet [{sheetToAnalyze}]
            </h2>
            <div className="text-gray-800 w-full overflow-hidden">
              <ResultCard result={result} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
