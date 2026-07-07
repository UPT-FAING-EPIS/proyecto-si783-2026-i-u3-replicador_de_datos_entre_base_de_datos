const vscode = require("vscode");
const path = require("path");
const { analyzeDatabaseFile, formatAnalysisMarkdown } = require("./fileAnalysis");
const { buildReplicationFlow, slug } = require("./flowTemplate");

const PROJECT_FILES = {
  skill: "frontend/src/skills/database-nexus-assistant.md",
  plugin: "frontend/src/plugins/databaseNexusAssistantPlugin.ts",
  chatbox: "frontend/src/components/NexusChatbox.tsx",
  dashboard: "frontend/src/pages/Dashboard.tsx",
  assistantRoute: "backend/src/routes/assistant.ts"
};

const PROMPTS = [
  {
    label: "Planear flujo de replicacion",
    detail: "Origen, destino, tablas, mapeo, validacion y ejecucion",
    text: "Como preparo un flujo de replicacion entre dos bases de datos?"
  },
  {
    label: "Elegir modo de escritura",
    detail: "Insertar, upsert, reemplazar o vaciar y recargar",
    text: "Que modo de escritura debo usar para esta replicacion y por que?"
  },
  {
    label: "Resolver fallo de replica",
    detail: "Errores de tipos, timeouts, duplicados o tablas faltantes",
    text: "Que hago si una replicacion falla durante el mapeo o la ejecucion?"
  },
  {
    label: "Importar base",
    detail: "SQLite, SQL Server, PostgreSQL, MySQL, MariaDB, Oracle o MongoDB",
    text: "Como importo una base y la preparo como origen o destino?"
  }
];

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("databaseNexus.openSkill", () => openProjectFile(PROJECT_FILES.skill)),
    vscode.commands.registerCommand("databaseNexus.openPlugin", () => openProjectFile(PROJECT_FILES.plugin)),
    vscode.commands.registerCommand("databaseNexus.openChatbox", () => openProjectFile(PROJECT_FILES.chatbox)),
    vscode.commands.registerCommand("databaseNexus.insertPrompt", insertSuggestedPrompt),
    vscode.commands.registerCommand("databaseNexus.validateAssistant", validateAssistantIntegration),
    vscode.commands.registerCommand("databaseNexus.openLocalApp", openLocalApp),
    vscode.commands.registerCommand("databaseNexus.createFlow", createReplicationFlow),
    vscode.commands.registerCommand("databaseNexus.analyzeDatabaseFile", analyzeSelectedDatabaseFile)
  );
}

function deactivate() {}

async function openProjectFile(relativePath) {
  const root = await webRoot();
  if (!root) return;

  const uri = vscode.Uri.joinPath(root, ...relativePath.split("/"));
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  } catch {
    vscode.window.showErrorMessage(`No se encontro ${relativePath}`);
  }
}

async function insertSuggestedPrompt() {
  const selected = await vscode.window.showQuickPick(PROMPTS, {
    placeHolder: "Elige una consulta para el asistente de Database Nexus"
  });
  if (!selected) return;

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    await editor.edit((edit) => edit.insert(editor.selection.active, selected.text));
    return;
  }

  const document = await vscode.workspace.openTextDocument({
    language: "markdown",
    content: selected.text
  });
  await vscode.window.showTextDocument(document);
}

async function validateAssistantIntegration() {
  const root = await webRoot();
  if (!root) return;

  const checks = [
    fileCheck("Skill .md", PROJECT_FILES.skill, "## Consultas sugeridas"),
    fileCheck("Plugin del proyecto", PROJECT_FILES.plugin, "databaseNexusAssistantPlugin"),
    fileCheck("Chatbox integrado", PROJECT_FILES.chatbox, "Skill local .md + plugin del proyecto"),
    fileCheck("Dashboard monta chatbox", PROJECT_FILES.dashboard, "<NexusChatbox"),
    fileCheck("Ruta backend del asistente", PROJECT_FILES.assistantRoute, "section: z.enum")
  ];

  const results = await Promise.all(checks.map((check) => runCheck(root, check)));
  const failed = results.filter((result) => !result.ok);
  const report = results.map((result) => `${result.ok ? "OK" : "FALTA"} - ${result.name}: ${result.message}`).join("\n");

  const document = await vscode.workspace.openTextDocument({
    language: "plaintext",
    content: `Database Nexus Assistant Check\n\n${report}\n`
  });
  await vscode.window.showTextDocument(document);

  if (failed.length) {
    vscode.window.showWarningMessage(`Database Nexus: ${failed.length} verificacion(es) requieren revision.`);
  } else {
    vscode.window.showInformationMessage("Database Nexus: skill, plugin y chatbox estan integrados.");
  }
}

async function openLocalApp() {
  await vscode.env.openExternal(vscode.Uri.parse("http://localhost:5173"));
  vscode.window.showInformationMessage("Database Nexus: si la app no abre, ejecuta npm run dev:frontend en la carpeta web.");
}

async function createReplicationFlow() {
  const root = await webRoot();
  if (!root) return;

  const name = await vscode.window.showInputBox({
    title: "Nombre del flujo",
    prompt: "Ejemplo: Clientes SQLite a PostgreSQL",
    value: "Clientes demo a destino"
  });
  if (name === undefined) return;

  const sourceName = await vscode.window.showInputBox({
    title: "Origen",
    prompt: "Nombre de la base o archivo origen",
    value: "clientes_origen"
  });
  if (sourceName === undefined) return;

  const destinationName = await vscode.window.showInputBox({
    title: "Destino",
    prompt: "Nombre de la base o archivo destino",
    value: "clientes_destino"
  });
  if (destinationName === undefined) return;

  const sourceTable = await vscode.window.showInputBox({
    title: "Tabla origen",
    prompt: "Nombre de la tabla origen",
    value: "clientes"
  });
  if (sourceTable === undefined) return;

  const destinationTable = await vscode.window.showInputBox({
    title: "Tabla destino",
    prompt: "Nombre de la tabla destino",
    value: sourceTable || "clientes"
  });
  if (destinationTable === undefined) return;

  const writeModePick = await vscode.window.showQuickPick([
    { label: "upsert", description: "Actualiza o inserta usando columnas clave" },
    { label: "insert", description: "Inserta filas nuevas en destino vacio" },
    { label: "replace", description: "Sobrescribe filas seleccionadas" },
    { label: "truncate-reload", description: "Vacia y recarga la tabla completa" }
  ], {
    title: "Modo de escritura",
    placeHolder: "Selecciona el modo de escritura"
  });
  if (!writeModePick) return;

  const mappings = await vscode.window.showInputBox({
    title: "Mapeo de columnas",
    prompt: "Formato: origen:destino:tipo,origen2:destino2:tipo2",
    value: "id:id:integer,nombre:nombre:text,email:email:text"
  });
  if (mappings === undefined) return;

  const flow = buildReplicationFlow({
    name,
    sourceName,
    destinationName,
    sourceTable,
    destinationTable,
    writeMode: writeModePick.label,
    mappings
  });

  const folder = vscode.Uri.joinPath(root, "nexus-flows");
  await vscode.workspace.fs.createDirectory(folder);
  const fileName = `${slug(name || "replication-flow")}.nexus-flow.json`;
  const uri = vscode.Uri.joinPath(folder, fileName);
  const content = Buffer.from(`${JSON.stringify(flow, null, 2)}\n`, "utf8");
  await vscode.workspace.fs.writeFile(uri, content);

  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  vscode.window.showInformationMessage(`Database Nexus: flujo creado en nexus-flows/${fileName}`);
}

async function analyzeSelectedDatabaseFile(uri) {
  const selectedUri = uri || vscode.window.activeTextEditor?.document.uri || await pickDatabaseFile();
  if (!selectedUri) return;

  const extension = path.extname(selectedUri.fsPath).toLowerCase();
  const supported = new Set([".sqlite", ".sqlite3", ".db", ".csv", ".xlsx", ".json", ".ndjson", ".sql"]);
  if (!supported.has(extension)) {
    vscode.window.showWarningMessage(`Database Nexus: ${extension || "archivo"} no es un formato soportado para analisis.`);
    return;
  }

  try {
    const bytes = Buffer.from(await vscode.workspace.fs.readFile(selectedUri));
    const analysis = analyzeDatabaseFile(selectedUri.fsPath, bytes);
    const document = await vscode.workspace.openTextDocument({
      language: "markdown",
      content: formatAnalysisMarkdown(analysis)
    });
    await vscode.window.showTextDocument(document, { preview: false });
  } catch (error) {
    vscode.window.showErrorMessage(`Database Nexus: no se pudo analizar el archivo. ${error.message}`);
  }
}

async function pickDatabaseFile() {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: {
      "Archivos de datos": ["sqlite", "sqlite3", "db", "csv", "xlsx", "json", "ndjson", "sql"]
    },
    title: "Selecciona un archivo para analizar"
  });
  return picked?.[0];
}

function fileCheck(name, relativePath, expectedText) {
  return { name, relativePath, expectedText };
}

async function runCheck(root, check) {
  const uri = vscode.Uri.joinPath(root, ...check.relativePath.split("/"));
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(bytes).toString("utf8");
    const ok = content.includes(check.expectedText);
    return {
      name: check.name,
      ok,
      message: ok ? check.relativePath : `No se encontro el texto esperado en ${check.relativePath}`
    };
  } catch {
    return {
      name: check.name,
      ok: false,
      message: `No existe ${check.relativePath}`
    };
  }
}

async function workspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    vscode.window.showErrorMessage("Abre la carpeta Drop_Nexus para usar Database Nexus Replicator.");
    return undefined;
  }
  return folders[0].uri;
}

async function webRoot() {
  const root = await workspaceRoot();
  if (!root) return undefined;

  if (await exists(vscode.Uri.joinPath(root, "frontend", "src")) && await exists(vscode.Uri.joinPath(root, "backend", "src"))) {
    return root;
  }

  const nested = vscode.Uri.joinPath(root, "web");
  if (await exists(vscode.Uri.joinPath(nested, "frontend", "src")) && await exists(vscode.Uri.joinPath(nested, "backend", "src"))) {
    return nested;
  }

  vscode.window.showErrorMessage("No se encontro la carpeta web/frontend y web/backend. Abre la raiz del repositorio o la carpeta web.");
  return undefined;
}

async function exists(uri) {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

module.exports = { activate, deactivate };
