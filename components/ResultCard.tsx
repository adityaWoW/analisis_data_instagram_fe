"use client";

interface ResultData {
  status?: string;
  total_baris?: number;
  "KOL NAME"?: string[];
  STATUS?: string[];
  "TOTAL IMP"?: number[];
  "TOTAL IMP original"?: number[];
}

interface Props {
  result: ResultData | null; // Diubah menjadi bisa menerima null agar aman saat inisialisasi awal
  analyzing?: boolean; // Ditambahkan agar sinkron dengan pemanggilan di HomePage
}

export default function ResultCard({ result, analyzing = false }: Props) {
  // 1. Tampilkan state loading jika proses analisis sedang berjalan
  if (analyzing) {
    return (
      <div className="w-full bg-white rounded-2xl p-8 border border-pink-100 shadow-sm flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-pink-100 border-t-rose-500 rounded-full animate-spin" />
          <span className="absolute text-lg animate-pulse">📊</span>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-700">
            Sedang Menganalisis Berkas...
          </p>
          <p className="text-xs text-slate-400">
            Harap tunggu, sistem sedang memetakan data KOL Anda ✨
          </p>
        </div>
      </div>
    );
  }

  // 2. Safely handle jika result masih null/belum dipilih
  const safeResult = result || {};
  const kolNames = safeResult["KOL NAME"] || [];
  const backendStatuses = safeResult["STATUS"] || [];
  const totalImps = safeResult["TOTAL IMP"] || [];
  const originalImps = safeResult["TOTAL IMP original"] || [];

  return (
    <div className="w-full bg-rose-50/30 rounded-2xl p-6 border border-rose-100/70 shadow-sm animate-fade-in">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-500">
            Ringkasan Data KOL
          </h3>
        </div>
        {safeResult.total_baris && (
          <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-3 py-1 rounded-full w-fit">
            Total: {safeResult.total_baris} Baris
          </span>
        )}
      </div>

      {kolNames.length === 0 ? (
        <div className="text-sm text-slate-400 italic text-center py-12 bg-white rounded-xl border border-slate-100/80 shadow-inner">
          <p className="text-2xl mb-2 select-none">🎐</p>
          Belum ada data yang dianalisis. Pilih file berkas di samping untuk
          memulai.
        </div>
      ) : (
        /* Container Tabel dengan Scroll Horizontal Otomatis jika Layar Kecil */
        <div className="bg-white rounded-xl border border-slate-100 shadow-inner overflow-hidden">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              {/* Header Tabel */}
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 shadow-sm z-10">
                <tr>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center w-16">
                    No
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    KOL Name
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                    Status
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                    Total IMP
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                    IMP Original
                  </th>
                </tr>
              </thead>

              {/* Body Tabel */}
              <tbody className="divide-y divide-slate-100">
                {kolNames.map((name, index) => {
                  const impValue = totalImps[index] ?? 0;
                  const oriImpValue = originalImps[index] ?? 0;

                  // Mengambil status langsung dari data backend dan membersihkan karakter [ ]
                  const rawStatus = backendStatuses[index] || "";
                  const cleanStatus = rawStatus
                    .replace(/[\[\]]/g, "")
                    .toUpperCase()
                    .trim();

                  return (
                    <tr
                      key={index}
                      className="hover:bg-rose-50/20 transition-colors group"
                    >
                      {/* Kolom Nomor */}
                      <td className="p-4 text-sm text-slate-400 text-center font-medium">
                        {index + 1}
                      </td>

                      {/* Kolom Nama KOL */}
                      <td className="p-4 text-sm font-semibold text-slate-700 group-hover:text-rose-600 transition-colors">
                        {name.startsWith("@") ? name : `@${name}`}
                      </td>

                      {/* Kolom Indikator Status Boosting */}
                      <td className="p-4 text-center">
                        {cleanStatus === "BOOSTED" ? (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/50 tracking-wider shadow-sm">
                            🚀 Boosted
                          </span>
                        ) : cleanStatus === "ORGANIC" ? (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50 tracking-wider shadow-sm">
                            🌿 Organic
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-200/60 tracking-wider">
                            No Status
                          </span>
                        )}
                      </td>

                      {/* Kolom Total Impressions */}
                      <td className="p-4 text-sm font-bold text-slate-800 text-right tabular-nums">
                        {impValue === 0 ? (
                          <span className="text-slate-300 font-normal">0</span>
                        ) : (
                          impValue.toLocaleString("id-ID")
                        )}
                      </td>

                      {/* Kolom Total Impressions Original */}
                      <td className="p-4 text-sm font-bold text-rose-600 text-right tabular-nums bg-rose-50/10 group-hover:bg-rose-50/30 transition-colors">
                        {oriImpValue === 0 ? (
                          <span className="text-slate-300 font-normal">0</span>
                        ) : (
                          oriImpValue.toLocaleString("id-ID")
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
