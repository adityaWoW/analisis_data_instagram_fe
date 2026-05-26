"use client";

import { useEffect, useState, useCallback } from "react";
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

export default function HomePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [folderStack, setFolderStack] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  // STATE: Menyimpan daftar sheets dan sheet yang dipilih
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [sheetToAnalyze, setSheetToAnalyze] = useState<string>("");
  const [loadingSheets, setLoadingSheets] = useState(false);

  const resetFileSelection = useCallback(() => {
    setSelectedFile(null);
    setAvailableSheets([]);
    setSheetToAnalyze("");
    setResult(null);
  }, []);

  // AMBIL FILE UTAMA (ROOT)
  const fetchRootFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get<ApiResponse<FileItem[]>>("/files");
      setFiles(res.data?.data || []);
      resetFileSelection();
      setFolderStack([]);
    } catch (error) {
      console.error("Error fetching root files:", error);
      alert("Gagal mengambil file utama 😢");
    } finally {
      setLoading(false);
    }
  }, [resetFileSelection]);

  // BUKA FOLDER
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
      } catch (error) {
        console.error("Error opening folder:", error);
        alert(
          "Gagal membuka folder. Pastikan Service Account memiliki akses ke folder ini 😢",
        );
      } finally {
        setLoading(false);
      }
    },
    [resetFileSelection],
  );

  // AMBIL DAFTAR SHEETS DARI SPREADSHEET
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

      if (sheetList.length > 0) {
        setSheetToAnalyze(sheetList[0]);
      }
    } catch (err) {
      console.error("Error fetching sheets:", err);
      alert(
        "Gagal memuat sheet berkas ini.\n\n" +
          "💡 Solusi: Pastikan berkas ini sudah Anda 'Share/Bagikan' dengan memberikan akses ke email Service Account Anda di Google Drive.",
      );
    } finally {
      setLoadingSheets(false);
    }
  };

  // HANDLE SELEKSI FILE / FOLDER
  const handleSelectFile = async (fileId: string) => {
    if (!fileId) {
      resetFileSelection();
      return;
    }

    const selected = files.find((file) => file.id === fileId);
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

    // Filter deteksi multi-sheet yang aman dari inkonsistensi tipe data API
    const isSpreadsheetFile =
      selected.type === "sheet" ||
      selected.mimeType === "application/vnd.google-apps.spreadsheet" ||
      selected.mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selected.mimeType?.toLowerCase().includes("spreadsheet") ||
      selected.mimeType?.toLowerCase().includes("sheet") ||
      selected.name.endsWith(".xlsx") ||
      selected.name.endsWith(".xls");

    if (isSpreadsheetFile) {
      await fetchSpreadsheetSheets(selected.id);
    } else {
      // Fallback Aman: Coba check langsung jika mimeType tidak terdeteksi teratur oleh backend
      try {
        setLoadingSheets(true);
        const res = await API.get<ApiResponse<string[]>>(
          `/files/${selected.id}/sheets`,
        );
        const sheetList = res.data?.data || [];

        if (sheetList.length > 0) {
          setAvailableSheets(sheetList);
          setSheetToAnalyze(sheetList[0]);
        } else {
          setAvailableSheets([]);
          setSheetToAnalyze("");
        }
      } catch (err) {
        const errWithResponse = err as { response?: { data?: unknown } };
        console.error(
          "Fallback check failed:",
          errWithResponse.response?.data || err,
        );

        alert(
          "Akses Ditolak (Error 500/403) 😢\n\n" +
            "Google API tidak dapat membaca berkas ini. Silakan bagikan berkas ini ke email Service Account Anda terlebih dahulu di Google Drive.",
        );
        setAvailableSheets([]);
        setSheetToAnalyze("");
      } finally {
        setLoadingSheets(false);
      }
    }
  };

  // KEMBALI KE FOLDER SEBELUMNYA
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

      const previousFolder = updatedStack[updatedStack.length - 1];
      const res = await API.get<ApiResponse<FileItem[]>>(
        `/files/${previousFolder.id}`,
      );

      setFiles(res.data?.data || []);
      setFolderStack(updatedStack);
    } catch (error) {
      console.error("Error going back:", error);
      alert("Gagal kembali ke folder sebelumnya 💔");
    } finally {
      setLoading(false);
    }
  }, [folderStack, resetFileSelection]);

  // ANALYZE FILE
  const analyzeFile = async () => {
    if (!selectedFile) {
      alert("Silahkan pilih file terlebih dahulu ✨");
      return;
    }

    if (availableSheets.length > 0 && !sheetToAnalyze) {
      alert("Silahkan pilih sheet yang ingin dianalisis terlebih dahulu ✨");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post<ApiResponse<Record<string, unknown>>>(
        "/analyze",
        {
          file_id: selectedFile.id,
          sheet_name: sheetToAnalyze,
        },
      );
      console.log("debug", res);
      setResult(res.data?.data || null);
    } catch (error) {
      console.error("Error analyzing file:", error);
      alert(
        "Gagal menganalisis sheet yang dipilih. Pastikan Service Account memiliki akses 'Editor/Viewer' di berkas tersebut 😢",
      );
    } finally {
      setLoading(false);
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
      {/* UKURAN DIPERBESAR: Mengubah max-w-xl menjadi max-w-4xl agar layout jauh lebih lebar */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-md shadow-rose-100/40 p-6 md:p-10 border border-rose-100/60 transition-all">
        {/* HEADER (DISEDERHANAKAN AGAR PROPORSIONAL) */}
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
              className="hover:text-rose-500 font-medium transition-colors flex items-center gap-1"
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

        {/* FILE SELECTOR (UKURAN INPUT MENYESUAIKAN LEBAR BARU) */}
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

        {/* BACK BUTTON */}
        {folderStack.length > 0 && (
          <button
            onClick={goBack}
            className="mt-3 text-sm text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1"
          >
            ← Kembali Folder
          </button>
        )}

        {/* DAFTAR SHEET */}
        {selectedFile && (
          <div className="mt-6 p-5 rounded-xl bg-rose-50/50 border border-rose-100 space-y-4 animate-fadeIn">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                File Induk:
              </p>
              <p className="text-lg font-bold text-gray-800 flex items-center gap-1.5 mt-0.5">
                📄 {selectedFile.name}
              </p>
            </div>

            {loadingSheets ? (
              <div className="pt-2 border-t border-rose-200/60 flex items-center gap-2 text-sm text-rose-500 font-medium animate-pulse">
                ⏳ Sedang memuat semua sheet di dalam file...
              </div>
            ) : (
              availableSheets.length > 0 && (
                <div className="pt-4 border-t border-rose-200/60 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                    Silahkan Pilih Sheet yang Akan Di-Analyze 👇
                  </label>

                  {/* UKURAN LAYOUT GRID: Menggunakan 2 kolom di layar medium ke atas agar tidak memanjang ke bawah */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {availableSheets.map((sheetName) => {
                      const isSelected = sheetToAnalyze === sheetName;
                      return (
                        <button
                          key={sheetName}
                          type="button"
                          onClick={() => setSheetToAnalyze(sheetName)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between border ${
                            isSelected
                              ? "bg-rose-500 text-white border-rose-500 shadow-md transform scale-[1.01]"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <span className="truncate">📊 {sheetName}</span>
                          {isSelected && (
                            <span className="text-xs bg-white text-rose-500 px-2.5 py-1 rounded-full font-bold shadow-sm">
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

        {/* ANALYZE BUTTON (UKURAN TOMBOL DIPERBESAR) */}
        <button
          onClick={analyzeFile}
          disabled={
            loading ||
            loadingSheets ||
            !selectedFile ||
            (availableSheets.length > 0 && !sheetToAnalyze)
          }
          className="w-full mt-6 bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-6 rounded-xl text-base transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-md hover:shadow-rose-200 flex items-center justify-center gap-2"
        >
          {loading
            ? "Sedang Menganalisis..."
            : `Analyze Sheet: ${sheetToAnalyze || selectedFile?.name || ""} 🚀`}
        </button>

        {/* RESULT (SEKANG JAUH LEBIH LUAS UNTUK MENAMPILKAN TABEL) */}
        {result && (
          <div className="mt-10 pt-8 border-t border-gray-100">
            <h2 className="text-base font-extrabold text-gray-800 mb-4 flex items-center gap-2 tracking-tight">
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
