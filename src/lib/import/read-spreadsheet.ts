import { parseCsvRows } from "./csv";

/* The browser-only half of the spreadsheet import: bytes in, a grid of cells out.
   No business logic lives here — `names.ts` owns all of that, and is what the
   unit tests point at.

   `read-excel-file` is pulled in with a dynamic `import()` from inside the call,
   so the parser lands in its own chunk and `/quick-play` pays nothing for it
   until somebody actually picks an `.xlsx`.

   Note for later: the library's browser build spawns its worker from a runtime
   blob URL. There is no CSP on this app today, but if one is ever added it will
   need `worker-src blob:`. */

/** Big enough for any hand-kept roster, small enough to bound a zip bomb. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type ReadResult =
  | { ok: true; rows: readonly (readonly unknown[])[] }
  | { ok: false; message: string };

const UNREADABLE = "That file isn't a readable spreadsheet. Try an .xlsx or .csv file.";

export async function readSpreadsheet(file: File): Promise<ReadResult> {
  // Checked before a single byte is read, so an oversized file never reaches the
  // parser and the parser chunk is never fetched.
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: "That file is too big — keep it under 2 MB." };
  }

  // The extension, not the MIME type: browsers report `.csv` as anything from
  // `text/csv` to `application/vnd.ms-excel` to the empty string.
  const name = file.name.toLowerCase();

  // Everything below is inside this try: a malformed file must produce a message,
  // never an uncaught error or an unhandled rejection in the console.
  try {
    if (name.endsWith(".csv")) {
      return { ok: true, rows: parseCsvRows(await file.text()) };
    }

    if (name.endsWith(".xlsx")) {
      const {
        readSheet,
        InvalidInputError,
        InvalidSpreadsheetError,
        SheetNotFoundError,
      } = await import("read-excel-file/browser");

      try {
        // First sheet, no `schema` and no `parseNumber` — cells come back raw and
        // `cellToText` decides what counts as a name.
        const rows: readonly (readonly unknown[])[] = await readSheet(file, 1);
        return { ok: true, rows };
      } catch (error) {
        // Nested so the library's error classes are in scope; the outer catch
        // still covers a failed chunk load.
        if (error instanceof InvalidInputError) {
          if (error.code === "XLS_FILE_NOT_SUPPORTED") {
            return {
              ok: false,
              message:
                "That looks like an old .xls file or a protected workbook. Re-save it as .xlsx or .csv and try again.",
            };
          }
          return { ok: false, message: UNREADABLE };
        }
        if (error instanceof InvalidSpreadsheetError) {
          return { ok: false, message: "That spreadsheet is damaged and can't be read." };
        }
        if (error instanceof SheetNotFoundError) {
          return { ok: false, message: "That workbook has no sheets." };
        }
        throw error;
      }
    }

    return { ok: false, message: "Choose an .xlsx or .csv file." };
  } catch {
    return {
      ok: false,
      message: "That file couldn't be read. Try an .xlsx or .csv file.",
    };
  }
}
