# Drop Nexus - Replicador de Datos entre Bases de Datos

Repositorio local de entrega para el proyecto **Replicador de Datos entre Bases de Datos**.

## Contenido

- `FD01-EPIS-Informe de Factibilidad.docx`: factibilidad tecnica, economica, operativa, legal, social y ambiental.
- `FD02-EPIS-Informe Vision.docx`: vision del producto, usuarios, capacidades y restricciones.
- `FD03-EPIS-Informe Especificacion Requerimientos.docx`: requerimientos funcionales/no funcionales y casos de uso.
- `FD04-EPIS-Informe Arquitectura de Software.docx`: arquitectura frontend/backend, servicios, seguridad y despliegue.
- `FD05-EPIS-Informe ProyectoFinal.docx`: resumen de funcionalidades, pruebas, resultados y conclusiones.
- `FD06-EPIS-PropuestaProyecto.docx`: propuesta, objetivos, alcance, cronograma y criterios de exito.
- `web/`: aplicacion web completa Drop Nexus.

## App web

La carpeta `web/` contiene:

- `frontend/`: React + Vite + Tailwind.
- `backend/`: Node.js + TypeScript + Fastify.
- `vscode-extension/`: extension local de Visual Studio Code.
- `render.yaml`: despliegue preparado para Render.

## Funcion principal

La aplicacion replica datos entre bases de datos y archivos compatibles. Permite importar SQLite, SQL, MongoDB JSON/NDJSON, Excel/CSV y respaldos SQL Server `.bak` cuando existe configuracion de restauracion. Despues de replicar, permite descargar la base modificada en JSON, Excel `.xlsx` o SQLite.

## Ejecucion local

```bash
cd web
npm run install:all
npm run dev:backend
npm run dev:frontend
```

Variables importantes: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_PASSWORD` y, para `.bak`, `SQLSERVER_RESTORE_*`.
