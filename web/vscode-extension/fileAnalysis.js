const path = require("path");
const zlib = require("zlib");

const TEXT_EXTENSIONS = new Set([".csv", ".json", ".ndjson", ".sql"]);
const SQLITE_EXTENSIONS = new Set([".sqlite", ".sqlite3", ".db"]);

function analyzeDatabaseFile(filePath, bytes) {
  const extension = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, extension);
  const warnings = [];
  let result;

  if (extension === ".csv") {
    result = analyzeCsv(baseName, decodeText(bytes), warnings);
  } else if (extension === ".json" || extension === ".ndjson") {
    result = analyzeJson(baseName, decodeText(bytes), extension === ".ndjson", warnings);
  } else if (extension === ".sql") {
    result = analyzeSql(decodeText(bytes), warnings);
  } else if (SQLITE_EXTENSIONS.has(extension)) {
    result = analyzeSqlite(bytes, warnings);
  } else if (extension === ".xlsx") {
    result = analyzeXlsx(baseName, bytes, warnings);
  } else {
    warnings.push(`Extension no soportada: ${extension || "sin extension"}.`);
    result = { format: "Desconocido", tables: [] };
  }

  return {
    fileName: path.basename(filePath),
    filePath,
    sizeBytes: bytes.length,
    warnings,
    ...result
  };
}

function formatAnalysisMarkdown(analysis) {
  const lines = [];
  lines.push(`# Database Nexus - Analisis de archivo`);
  lines.push("");
  lines.push(`- Archivo: \`${analysis.fileName}\``);
  lines.push(`- Formato detectado: **${analysis.format}**`);
  lines.push(`- Tamano: **${formatBytes(analysis.sizeBytes)}**`);
  lines.push(`- Tablas/colecciones detectadas: **${analysis.tables.length}**`);
  lines.push("");

  if (analysis.tables.length) {
    lines.push("## Tablas detectadas");
    lines.push("");
    for (const table of analysis.tables) {
      lines.push(`### ${table.name}`);
      if (table.rowCount !== undefined) {
        lines.push(`- Filas de muestra: ${table.rowCount}`);
      }
      if (table.source) {
        lines.push(`- Origen interno: \`${table.source}\``);
      }
      lines.push("");
      lines.push("| Columna | Tipo probable | Observacion |");
      lines.push("|---|---|---|");
      for (const column of table.columns) {
        lines.push(`| ${escapePipe(column.name)} | ${escapePipe(column.type || "desconocido")} | ${escapePipe(column.warning || "")} |`);
      }
      lines.push("");
    }
  } else {
    lines.push("No se detectaron tablas o columnas suficientes para previsualizar.");
    lines.push("");
  }

  lines.push("## Recomendacion para Database Nexus");
  lines.push("");
  lines.push("- Usa este analisis como evidencia tecnica antes de importar el archivo.");
  lines.push("- Verifica columnas clave antes de usar modo `upsert`.");
  lines.push("- Si hay tipos `mixed` o columnas vacias, valida el mapeo antes de ejecutar la replica.");
  lines.push("- Para recargas completas, considera `truncate-reload`; para datos existentes con clave estable, considera `upsert`.");
  lines.push("");

  if (analysis.warnings.length) {
    lines.push("## Advertencias");
    lines.push("");
    for (const warning of analysis.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function analyzeCsv(baseName, text, warnings) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0).slice(0, 200);
  if (!lines.length) {
    warnings.push("El CSV esta vacio.");
    return { format: "CSV", tables: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const headers = sanitizeHeaders(rows[0]);
  const samples = rows.slice(1, 51);

  if (!samples.length) {
    warnings.push("El CSV solo contiene encabezados o una unica fila.");
  }

  return {
    format: `CSV (${delimiter === "\t" ? "tab" : delimiter})`,
    tables: [
      {
        name: toIdentifier(baseName),
        rowCount: samples.length,
        columns: headers.map((header, index) => ({
          name: header,
          type: inferType(samples.map((row) => row[index])),
          warning: duplicateWarning(headers, header, index)
        }))
      }
    ]
  };
}

function analyzeJson(baseName, text, isNdjson, warnings) {
  try {
    if (isNdjson) {
      const rows = text.split(/\r?\n/).filter(Boolean).slice(0, 100).map((line) => JSON.parse(line));
      return tablesFromRows(baseName, rows, "JSON/NDJSON", warnings);
    }

    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return tablesFromRows(baseName, parsed.slice(0, 100), "JSON", warnings);
    }

    if (parsed && typeof parsed === "object") {
      const tables = [];
      for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) {
          tables.push(...tablesFromRows(key, value.slice(0, 100), "JSON", warnings).tables);
        }
      }
      if (tables.length) {
        return { format: "JSON", tables };
      }
      return tablesFromRows(baseName, [parsed], "JSON", warnings);
    }
  } catch (error) {
    warnings.push(`No se pudo parsear JSON: ${error.message}`);
  }

  return { format: isNdjson ? "JSON/NDJSON" : "JSON", tables: [] };
}

function analyzeSql(text, warnings) {
  const createStatements = extractCreateTableStatements(text);
  const tables = createStatements.map((statement) => tableFromCreateStatement(statement)).filter(Boolean);
  const insertCount = (text.match(/\bINSERT\s+INTO\b/gi) || []).length;

  if (!tables.length && insertCount) {
    warnings.push(`No se encontraron CREATE TABLE, pero si ${insertCount} INSERT INTO.`);
  }
  if (!tables.length && !insertCount) {
    warnings.push("No se detectaron sentencias CREATE TABLE ni INSERT INTO.");
  }

  return { format: "SQL", tables };
}

function analyzeSqlite(bytes, warnings) {
  const header = bytes.subarray(0, 16).toString("utf8");
  if (!header.startsWith("SQLite format 3")) {
    warnings.push("El archivo no tiene cabecera SQLite valida.");
  }

  const text = bytes.toString("utf8").replace(/\u0000/g, " ");
  const result = analyzeSql(text, warnings);
  result.format = "SQLite";
  if (!result.tables.length) {
    warnings.push("No se pudo leer sqlite_schema. Si el archivo esta cifrado o comprimido, abrelo desde la app.");
  }
  return result;
}

function analyzeXlsx(baseName, bytes, warnings) {
  try {
    const zip = readZipEntries(bytes);
    const sharedStrings = readSharedStrings(zip);
    const sheets = readWorkbookSheets(zip);
    const tables = [];

    for (const sheet of sheets.slice(0, 5)) {
      const xml = zip.get(sheet.path);
      if (!xml) {
        warnings.push(`No se encontro la hoja ${sheet.name} en ${sheet.path}.`);
        continue;
      }
      const rows = readWorksheetRows(xml.toString("utf8"), sharedStrings).slice(0, 51);
      if (!rows.length) {
        warnings.push(`La hoja ${sheet.name} no contiene filas legibles.`);
        continue;
      }
      const headers = sanitizeHeaders(rows[0]);
      const samples = rows.slice(1);
      tables.push({
        name: toIdentifier(sheet.name || baseName),
        source: sheet.path,
        rowCount: samples.length,
        columns: headers.map((header, index) => ({
          name: header,
          type: inferType(samples.map((row) => row[index])),
          warning: duplicateWarning(headers, header, index)
        }))
      });
    }

    if (!tables.length) {
      warnings.push("No se detectaron hojas con encabezados.");
    }
    return { format: "XLSX", tables };
  } catch (error) {
    warnings.push(`No se pudo analizar XLSX: ${error.message}`);
    return { format: "XLSX", tables: [] };
  }
}

function tablesFromRows(baseName, rows, format, warnings) {
  const objects = rows.filter((row) => row && typeof row === "object" && !Array.isArray(row));
  if (!objects.length) {
    warnings.push("No se detectaron objetos con columnas.");
    return { format, tables: [] };
  }

  const headers = [...new Set(objects.flatMap((row) => Object.keys(row)))];
  return {
    format,
    tables: [
      {
        name: toIdentifier(baseName),
        rowCount: objects.length,
        columns: headers.map((header) => ({
          name: header,
          type: inferType(objects.map((row) => row[header])),
          warning: ""
        }))
      }
    ]
  };
}

function extractCreateTableStatements(text) {
  const statements = [];
  const regex = /\bCREATE\s+TABLE\b/gi;
  let match;
  while ((match = regex.exec(text))) {
    const start = match.index;
    let depth = 0;
    let seenParen = false;
    for (let i = start; i < text.length; i += 1) {
      const char = text[i];
      if (char === "(") {
        depth += 1;
        seenParen = true;
      } else if (char === ")") {
        depth -= 1;
      } else if (char === ";" && seenParen && depth <= 0) {
        statements.push(text.slice(start, i + 1));
        regex.lastIndex = i + 1;
        break;
      }
    }
  }
  return statements;
}

function tableFromCreateStatement(statement) {
  const nameMatch = statement.match(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`\[\]-]+)/i);
  if (!nameMatch) return undefined;

  const name = cleanIdentifier(nameMatch[1].split(".").pop());
  const open = statement.indexOf("(");
  const close = statement.lastIndexOf(")");
  if (open === -1 || close === -1 || close <= open) return undefined;

  const definitions = splitSqlList(statement.slice(open + 1, close));
  const columns = [];
  for (const definition of definitions) {
    const trimmed = definition.trim();
    if (!trimmed || /^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|KEY)\b/i.test(trimmed)) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    const columnName = cleanIdentifier(parts[0]);
    const type = normalizeSqlType(parts.slice(1).join(" "));
    columns.push({ name: columnName, type, warning: "" });
  }

  return { name: toIdentifier(name), columns };
}

function splitSqlList(text) {
  const items = [];
  let current = "";
  let depth = 0;
  let quote = "";

  for (const char of text) {
    if (quote) {
      current += char;
      if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) items.push(current);
  return items;
}

function readZipEntries(bytes) {
  const entries = new Map();
  const eocd = findEndOfCentralDirectory(bytes);
  const centralOffset = bytes.readUInt32LE(eocd + 16);
  const totalEntries = bytes.readUInt16LE(eocd + 10);
  let offset = centralOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Directorio central ZIP invalido.");
    }
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const data = readLocalZipData(bytes, localOffset, compressedSize, method);
    entries.set(name.replace(/\\/g, "/"), data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(bytes) {
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i -= 1) {
    if (bytes.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error("No se encontro estructura ZIP.");
}

function readLocalZipData(bytes, offset, compressedSize, method) {
  if (bytes.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error("Entrada ZIP local invalida.");
  }
  const nameLength = bytes.readUInt16LE(offset + 26);
  const extraLength = bytes.readUInt16LE(offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  const compressed = bytes.subarray(start, start + compressedSize);
  if (method === 0) return Buffer.from(compressed);
  if (method === 8) return zlib.inflateRawSync(compressed);
  throw new Error(`Metodo ZIP no soportado: ${method}.`);
}

function readSharedStrings(zip) {
  const file = zip.get("xl/sharedStrings.xml");
  if (!file) return [];
  const xml = file.toString("utf8");
  return [...xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map((match) => decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join("")));
}

function readWorkbookSheets(zip) {
  const workbook = zip.get("xl/workbook.xml");
  if (!workbook) return [{ name: "Sheet1", path: "xl/worksheets/sheet1.xml" }];

  const relsXml = zip.get("xl/_rels/workbook.xml.rels")?.toString("utf8") || "";
  const rels = new Map();
  for (const match of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    const target = match[2].startsWith("/") ? match[2].slice(1) : `xl/${match[2]}`;
    rels.set(match[1], target.replace(/\\/g, "/"));
  }

  const xml = workbook.toString("utf8");
  const sheets = [];
  for (const match of xml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*(?:r:id|id)="([^"]+)"/g)) {
    sheets.push({ name: decodeXml(match[1]), path: rels.get(match[2]) || `xl/worksheets/sheet${sheets.length + 1}.xml` });
  }
  return sheets.length ? sheets : [{ name: "Sheet1", path: "xl/worksheets/sheet1.xml" }];
}

function readWorksheetRows(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\sr="([A-Z]+)\d+"/)?.[1];
      const index = ref ? columnIndex(ref) : row.length;
      const type = attrs.match(/\st="([^"]+)"/)?.[1];
      let value = "";
      if (type === "inlineStr") {
        value = decodeXml(body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || "");
      } else {
        const raw = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] || "";
        value = type === "s" ? sharedStrings[Number(raw)] || "" : decodeXml(raw);
      }
      row[index] = value;
    }
    if (row.some((value) => String(value || "").trim())) rows.push(row);
  }
  return rows;
}

function inferType(values) {
  const nonEmpty = values.map((value) => value === undefined || value === null ? "" : String(value).trim()).filter(Boolean);
  if (!nonEmpty.length) return "empty";

  const checks = [
    ["integer", (value) => /^[-+]?\d+$/.test(value)],
    ["decimal", (value) => /^[-+]?\d+([.,]\d+)?$/.test(value)],
    ["boolean", (value) => /^(true|false|si|no|0|1)$/i.test(value)],
    ["date", (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)],
    ["datetime", (value) => !Number.isNaN(Date.parse(value)) && /[tT:]/.test(value)]
  ];

  for (const [type, check] of checks) {
    if (nonEmpty.every(check)) return type;
  }
  if (nonEmpty.some((value) => value.length > 255)) return "long_text";
  if (new Set(nonEmpty).size <= Math.max(3, Math.ceil(nonEmpty.length * 0.2))) return "category/text";
  return "text";
}

function normalizeSqlType(definition) {
  const upper = definition.toUpperCase();
  if (/INT|SERIAL/.test(upper)) return "integer";
  if (/DECIMAL|NUMERIC|REAL|DOUBLE|FLOAT|MONEY/.test(upper)) return "decimal";
  if (/BOOL|BIT/.test(upper)) return "boolean";
  if (/DATE\b/.test(upper) && !/TIME/.test(upper)) return "date";
  if (/TIME|TIMESTAMP|DATETIME/.test(upper)) return "datetime";
  if (/JSON/.test(upper)) return "json";
  if (/BLOB|BINARY|BYTEA/.test(upper)) return "binary";
  if (/TEXT|CHAR|CLOB|VARCHAR|NVARCHAR/.test(upper)) return "text";
  return definition.split(/\s+/)[0] || "desconocido";
}

function detectDelimiter(header) {
  const delimiters = [",", ";", "\t", "|"];
  return delimiters.map((delimiter) => ({
    delimiter,
    count: parseDelimitedLine(header, delimiter).length
  })).sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function sanitizeHeaders(headers) {
  const seen = new Map();
  return headers.map((header, index) => {
    const fallback = `column_${index + 1}`;
    const base = toIdentifier(header || fallback);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count ? `${base}_${count + 1}` : base;
  });
}

function duplicateWarning(headers, header, index) {
  return headers.findIndex((item) => item === header) !== index ? "Nombre duplicado normalizado." : "";
}

function toIdentifier(value) {
  return cleanIdentifier(String(value || "table").trim())
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "_$1")
    .toLowerCase() || "table";
}

function cleanIdentifier(value) {
  return String(value || "")
    .replace(/^[`"'\[]+/, "")
    .replace(/[`"'\]]+$/, "")
    .trim();
}

function columnIndex(label) {
  return label.split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function decodeText(bytes) {
  return bytes.toString("utf8").replace(/^\uFEFF/, "");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapePipe(value) {
  return String(value || "").replace(/\|/g, "\\|");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

module.exports = {
  analyzeDatabaseFile,
  formatAnalysisMarkdown,
  inferType
};
