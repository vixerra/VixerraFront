"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { csvFilename, downloadCsv, toCsv, type CsvColumn } from "@/lib/csv";

/**
 * The Export button behind every admin list: load every matching row (see
 * fetchAllRows), write the CSV, and say how it went — including when the
 * export hit its cap and the file is not the whole result.
 */
export function useCsvExport() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const run = useCallback(
    async <T>(
      name: string,
      load: () => Promise<{ rows: T[]; truncated: boolean }>,
      columns: readonly CsvColumn<T>[],
    ) => {
      setExporting(true);
      try {
        const { rows, truncated } = await load();
        downloadCsv(csvFilename(name), toCsv(rows, columns));
        toast({
          title: `Exported ${rows.length.toLocaleString()} rows`,
          description: truncated
            ? "The export stops at 5,000 rows — narrow the filters to get the rest."
            : undefined,
          variant: "success",
        });
      } catch (err) {
        toast({ title: "Export failed", description: (err as Error).message, variant: "error" });
      } finally {
        setExporting(false);
      }
    },
    [toast],
  );

  return { exporting, run };
}
