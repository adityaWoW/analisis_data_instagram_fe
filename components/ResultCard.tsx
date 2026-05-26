interface Props {
  result: {
    status?: string;
    total_baris?: number;
    "KOL NAME"?: string[];
    STATUS?: string[];
    "TOTAL IMP"?: number[];
    "TOTAL IMP original"?: number[];
  };
}

export default function ResultCard({ result }: Props) {
  // Ambil data array dari result, berikan fallback array kosong jika data belum ada
  const kolNames = result["KOL NAME"] || [];
  const backendStatuses = result["STATUS"] || [];
  const totalImps = result["TOTAL IMP"] || [];
  const originalImps = result["TOTAL IMP original"] || [];

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
        {result.total_baris && (
          <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-3 py-1 rounded-full w-fit">
            Total: {result.total_baris} Baris
          </span>
        )}
      </div>

      {kolNames.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-8 bg-white rounded-xl border border-gray-100">
          Tidak ada data yang dapat ditampilkan.
        </p>
      ) : (
        /* Container Tabel dengan Scroll Horizontal Otomatis jika Layar Kecil */
        <div className="bg-white rounded-xl border border-gray-100 shadow-inner overflow-hidden">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              {/* Header Tabel */}
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 shadow-sm z-10">
                <tr>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center w-16">
                    No
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                    KOL Name
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">
                    Status
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">
                    Total IMP
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">
                    IMP Original
                  </th>
                </tr>
              </thead>

              {/* Body Tabel */}
              <tbody className="divide-y divide-gray-100">
                {kolNames.map((name, index) => {
                  const impValue = totalImps[index] ?? 0;
                  const oriImpValue = originalImps[index] ?? 0;

                  // Mengambil status langsung dari data backend dan membersihkan karakter [ ]
                  const rawStatus = backendStatuses[index] || "";
                  const cleanStatus = rawStatus
                    .replace(/[\[\]]/g, "")
                    .toUpperCase();

                  return (
                    <tr
                      key={index}
                      className="hover:bg-rose-50/20 transition-colors group"
                    >
                      {/* Kolom Nomor */}
                      <td className="p-4 text-sm text-gray-400 text-center font-medium">
                        {index + 1}
                      </td>

                      {/* Kolom Nama KOL */}
                      <td className="p-4 text-sm font-semibold text-gray-700 group-hover:text-rose-600 transition-colors">
                        @{name}
                      </td>

                      {/* Kolom Indikator Status Boosting berdasarkan Data Riil Backend */}
                      <td className="p-4 text-center">
                        {cleanStatus === "BOOSTED" ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 tracking-wider">
                            🚀 Boosted
                          </span>
                        ) : cleanStatus === "ORGANIC" ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wider">
                            🌿 Organic
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-400 tracking-wider">
                            No Status
                          </span>
                        )}
                      </td>

                      {/* Kolom Total Impressions */}
                      <td className="p-4 text-sm font-bold text-gray-800 text-right tabular-nums">
                        {impValue === 0 ? (
                          <span className="text-gray-300 font-normal">0</span>
                        ) : (
                          impValue.toLocaleString("id-ID")
                        )}
                      </td>

                      {/* Kolom Total Impressions Original */}
                      <td className="p-4 text-sm font-bold text-rose-600 text-right tabular-nums bg-rose-50/10 group-hover:bg-rose-50/30 transition-colors">
                        {oriImpValue === 0 ? (
                          <span className="text-gray-300 font-normal">0</span>
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
