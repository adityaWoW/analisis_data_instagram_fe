interface FileItem {
  id: string;
  name: string;
  mimeType?: string;
  type: "folder" | "sheet" | "file";
}

interface Props {
  files: FileItem[];
  selected: string;
  onChange: (value: string) => void;
}

export default function FileSelector({ files, selected, onChange }: Props) {
  if (files.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-400 font-medium">
        kosong... Tidak ada file atau folder di sini. 💨
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl max-h-64 overflow-y-auto divide-y divide-gray-100 customs-scrollbar">
      {files.map((file) => {
        const isSelected = selected === file.id;

        // Tentukan ikon & style warna berdasarkan tipe
        let icon = "📄";
        let iconColor = "text-gray-400";

        if (file.type === "folder") {
          icon = "📁";
          iconColor = "text-yellow-500";
        } else if (file.type === "sheet") {
          icon = "📊";
          iconColor = "text-emerald-500";
        }

        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onChange(file.id)}
            className={`w-full text-left px-4 py-3.5 text-sm flex items-center justify-between gap-3 transition-all duration-150 ${
              isSelected
                ? "bg-rose-50 text-rose-700 font-semibold"
                : "hover:bg-gray-50 text-gray-700 active:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-3 truncate flex-1">
              <span className={`text-lg flex-shrink-0 ${iconColor}`}>
                {icon}
              </span>
              <span className="truncate">{file.name}</span>
            </div>

            {/* Berikan label pembeda di ujung kanan */}
            {file.type === "folder" ? (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-200/60 flex-shrink-0">
                Buka ➜
              </span>
            ) : file.type === "sheet" ? (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border flex-shrink-0 ${
                  isSelected
                    ? "bg-rose-100 text-rose-600 border-rose-300"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200/60"
                }`}
              >
                {isSelected ? "Terpilih" : "Analisis"}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-gray-400 px-2 py-1 flex-shrink-0">
                File
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
