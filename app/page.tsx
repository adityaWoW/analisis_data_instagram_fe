"use client";

import { useEffect, useState, useCallback } from "react";
import FileSelector from "@/components/FileSelector";
import API from "@/service/api";
import API2 from "@/service/api2";
import IGWorkerPanel from "@/components/IGWorkerPanel";

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

export default function HomePage() {
  // ─── NAVBAR STATE ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"proses" | "monitoring">("proses");

  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [sheetToAnalyze, setSheetToAnalyze] = useState<string>("");
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const resetFileSelection = useCallback(() => {
    setSelectedFile(null);
    setAvailableSheets([]);
    setSheetToAnalyze("");
  }, []);

  const fetchRootFiles = useCallback(async () => {
    try {
      const res = await API.get<ApiResponse<FileItem[]>>("/files");
      setFiles(res.data?.data || []);
      resetFileSelection();
      setFolderStack([]);
    } catch {
      alert("Gagal mengambil file utama 😢");
    }
  }, [resetFileSelection]);

  const openFolder = useCallback(
    async (folder: FileItem) => {
      try {
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
    }
  }, [folderStack, resetFileSelection]);

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
      await API2.post("/spreadSheet", {
        spreadsheet_id: selectedFile.id,
        sheet_name: sheetToAnalyze,
      });

      alert("Analisis berhasil dikirim! 🚀");
      setActiveTab("monitoring");
    } catch (err) {
      console.error(err);

      const errorWithResponse = err as {
        response?: { data?: { detail?: string } };
      };

      const errorMessage =
        errorWithResponse.response?.data?.detail || "Gagal memulai analisis 😢";
      alert(errorMessage);
    } finally {
      setAnalyzing(false);
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

  return (
    <main className="min-h-screen bg-[#FDF8F5] p-6 md:p-12 flex items-start justify-center font-sans">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-md shadow-rose-100/40 p-6 md:p-10 border border-rose-100/60 transition-all">
        {/* HEADER */}
        <div className="text-center mb-6">
          <span className="text-4xl inline-block mb-2">✨</span>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight md:text-4xl">
            Google Drive File Analyzer
          </h1>
        </div>

        {/* SUB NAVBAR MODERN PILL DESIGN */}
        <div className="flex justify-center mb-10">
          <div className="flex flex-row gap-16 px-8 py-3 bg-transparent justify-center items-center w-full max-w-md mx-auto">
            {/* TAB 1: PROSES DATA */}
            <button
              onClick={() => setActiveTab("proses")}
              className="flex items-center gap-2.5 py-2 px-4 focus:outline-none group transition-all duration-300 rounded-lg"
            >
              <svg
                className={`w-4 h-4 transition-all duration-300 ${
                  activeTab === "proses"
                    ? "rotate-45 text-rose-500 scale-110"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span
                className={`text-sm font-semibold tracking-wide transition-colors duration-300 ${
                  activeTab === "proses"
                    ? "text-rose-500"
                    : "text-gray-400 group-hover:text-gray-700"
                }`}
              >
                Proses Data
              </span>
            </button>

            {/* TAB 2: MONITORING JOB */}
            <button
              onClick={() => setActiveTab("monitoring")}
              className="flex items-center gap-2.5 py-2 px-4 focus:outline-none group transition-all duration-300 rounded-lg"
            >
              <svg
                className={`w-4 h-4 transition-all duration-300 ${
                  activeTab === "monitoring"
                    ? "text-rose-500 scale-110"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"
                />
              </svg>
              <span
                className={`text-sm font-semibold tracking-wide transition-colors duration-300 ${
                  activeTab === "monitoring"
                    ? "text-rose-500"
                    : "text-gray-400 group-hover:text-gray-700"
                }`}
              >
                Monitoring Job
              </span>

              {analyzing && (
                <span className="flex h-1.5 w-1.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB CONTENT: PROSES DATA */}
        {activeTab === "proses" && (
          <div className="space-y-6 animate-fadeIn">
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
                    <span className="text-gray-600 font-medium">
                      {folder.name}
                    </span>
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
                analyzing ||
                loadingSheets ||
                !selectedFile ||
                (availableSheets.length > 0 && !sheetToAnalyze)
              }
              className="w-full mt-6 bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-6 rounded-xl text-base transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md flex items-center justify-center gap-2"
            >
              {analyzing
                ? "⏳ Sedang Menganalisis..."
                : `Analyze Sheet: ${sheetToAnalyze || selectedFile?.name || ""} 🚀`}
            </button>
          </div>
        )}

        {/* ─── TAB CONTENT: MONITORING JOB ─── */}
        {activeTab === "monitoring" && (
          <div className="animate-fadeIn">
            <IGWorkerPanel />
          </div>
        )}
      </div>
    </main>
  );
}
