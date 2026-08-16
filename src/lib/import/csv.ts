/* An RFC4180-shaped CSV reader, kept deliberately small: it produces the same
   grid of cells `readSheet` hands back for an `.xlsx`, so `collectNames` cannot
   tell the two formats apart.

   `text.split(",")` would not do. A roster exported "surname first" is full of
   quoted `"Lee, Jordan"` cells, and splitting on the comma turns one player into
   two half-names. */

export function parseCsvRows(text: string): string[][] {
  // Excel writes a UTF-8 BOM, which would otherwise glue itself to the first cell.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      endField();
      i += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      endRow();
      i += char === "\r" && input[i + 1] === "\n" ? 2 : 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Flush a final row only if there is one — a trailing newline has already
  // closed the last row, and must not add a phantom empty one.
  if (field !== "" || quoted || row.length > 0) endRow();

  return rows;
}
