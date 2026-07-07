function buildReplicationFlow(options) {
  const now = new Date().toISOString();
  const sourceTable = toIdentifier(options.sourceTable || "clientes");
  const destinationTable = toIdentifier(options.destinationTable || sourceTable);
  const writeMode = options.writeMode || "upsert";
  const mappings = parseMappings(options.mappings || "id:id:integer,nombre:nombre:text,email:email:text");

  return {
    version: "1.0",
    kind: "database-nexus-flow",
    name: options.name || `Replicacion ${sourceTable} a ${destinationTable}`,
    description: "Flujo generado desde la extension Database Nexus Replicator para documentar o importar una configuracion de replica.",
    createdAt: now,
    source: {
      type: options.sourceType || "imported-file",
      name: options.sourceName || "origen_demo",
      databaseId: options.sourceDatabaseId || "TODO_SOURCE_DATABASE_ID"
    },
    destination: {
      type: options.destinationType || "imported-file",
      name: options.destinationName || "destino_demo",
      databaseId: options.destinationDatabaseId || "TODO_DESTINATION_DATABASE_ID"
    },
    tables: [
      {
        sourceTable,
        destinationTable,
        writeMode,
        keyColumns: writeMode === "upsert" ? [mappings[0]?.destinationColumn || "id"] : [],
        batchSize: 5000,
        mappings
      }
    ],
    validation: {
      requirePreviewBeforeRun: true,
      requireKeyColumnsForUpsert: writeMode === "upsert",
      stopOnRejectedBatch: true
    },
    evidence: {
      generatedBy: "Database Nexus Replicator VS Code Extension",
      intendedUse: "Documento tecnico, evidencia de configuracion o insumo para una importacion futura."
    },
    notes: [
      "Reemplaza los databaseId TODO por los identificadores reales de Database Nexus.",
      "Valida tipos y columnas antes de ejecutar una replica real.",
      "Usa upsert solo cuando existan columnas clave estables."
    ]
  };
}

function parseMappings(input) {
  return String(input || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [sourceColumn, destinationColumn, type = "text", transform = "none"] = item.split(":").map((part) => part.trim());
      return {
        sourceColumn: toIdentifier(sourceColumn || "column"),
        destinationColumn: toIdentifier(destinationColumn || sourceColumn || "column"),
        type,
        transform: transform === "none" ? null : transform,
        required: false
      };
    });
}

function toIdentifier(value) {
  return String(value || "table")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "_$1")
    .toLowerCase() || "table";
}

function slug(value) {
  return toIdentifier(value).replace(/_+/g, "-");
}

module.exports = {
  buildReplicationFlow,
  slug
};
