# Database Nexus Replicator para VS Code

Extension local para trabajar con la skill, plugin y chatbox del proyecto Database Nexus.

## Comandos

- `Database Nexus: Abrir skill del asistente`
- `Database Nexus: Abrir plugin del asistente`
- `Database Nexus: Abrir chatbox integrado`
- `Database Nexus: Insertar consulta sugerida`
- `Database Nexus: Validar skill, plugin y chatbox`
- `Database Nexus: Abrir app local`
- `Database Nexus: Crear flujo de replicacion`
- `Database Nexus: Analizar archivo de datos`

## Analizar archivos de datos

Haz clic derecho sobre un archivo `.sqlite`, `.sqlite3`, `.db`, `.csv`, `.xlsx`, `.json`, `.ndjson` o `.sql` y ejecuta:

```text
Database Nexus: Analizar archivo de datos
```

La extension genera un reporte Markdown con:

- formato detectado,
- tablas u hojas detectadas,
- columnas,
- tipos probables,
- advertencias,
- recomendacion para usar el archivo en Database Nexus.

La carpeta `samples/` incluye archivos de prueba para validar este flujo.

## Crear flujos de replicacion

Ejecuta:

```text
Database Nexus: Crear flujo de replicacion
```

La extension pedira origen, destino, tabla, modo de escritura y mapeos. Luego creara un archivo:

```text
nexus-flows/<nombre>.nexus-flow.json
```

Ese archivo sirve como evidencia tecnica del flujo de replica o como base para una futura importacion desde la app.

## Instalacion

Descarga `database-nexus-vscode-0.2.0.vsix` desde la release del repositorio e instalala desde VS Code:

```bash
code --install-extension database-nexus-vscode-0.2.0.vsix
```

Tambien puedes abrir VS Code y usar **Extensions > Install from VSIX...**.

## Proposito

La extension deja visible en VS Code la integracion pedida para el proyecto:

- una skill `.md` adaptada al replicador de datos,
- un plugin del proyecto que consume esa skill,
- un chatbox integrado en el dashboard,
- consultas sugeridas para replicacion entre bases de datos.
- analisis local de archivos de datos antes de importarlos,
- generacion de flujos `.nexus-flow.json` como evidencia tecnica.

## Desarrollo

Desde VS Code, abre este repositorio y ejecuta la configuracion de depuracion `VS Code Extension`. Se abrira una nueva ventana de VS Code con la extension cargada.
