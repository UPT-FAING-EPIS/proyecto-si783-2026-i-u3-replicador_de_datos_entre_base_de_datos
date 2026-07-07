# Muestras para Database Nexus Replicator

Usa estos archivos para probar el comando `Database Nexus: Analizar archivo de datos` desde VS Code.

## Archivos

- `clientes.csv`: CSV con columnas simples y tipos inferibles.
- `ventas.json`: coleccion JSON con objetos de venta.
- `schema.sql`: script SQL con tablas `clientes` y `ventas`.
- `sample.nexus-flow.json`: flujo de replicacion de ejemplo.
- `clientes.sqlite`: base SQLite generada para pruebas.
- `clientes.xlsx`: hoja Excel generada para pruebas.

## Prueba rapida

1. Abre esta carpeta en VS Code.
2. Haz clic derecho sobre un archivo `.csv`, `.json`, `.sql`, `.sqlite` o `.xlsx`.
3. Ejecuta `Database Nexus: Analizar archivo de datos`.
4. Revisa el reporte Markdown generado.
5. Ejecuta `Database Nexus: Crear flujo de replicacion` para generar un nuevo archivo `.nexus-flow.json`.
