# Drop Nexus - Replicador de Datos entre Bases de Datos

Repositorio local de entrega para el proyecto **Replicador de Datos entre Bases de Datos**.

## Contenido

- `FD01-EPIS-Informe de Factibilidad.docx`: factibilidad tecnica, economica, operativa, legal, social y ambiental.
- `FD02-EPIS-Informe Vision.docx`: vision del producto, usuarios, capacidades y restricciones.
- `FD03-EPIS-Informe Especificacion Requerimientos.docx`: requerimientos funcionales/no funcionales y casos de uso.
- `FD04-EPIS-Informe Arquitectura de Software.docx`: arquitectura frontend/backend, servicios, seguridad y despliegue.
- `FD05-EPIS-Informe ProyectoFinal.docx`: resumen de funcionalidades, pruebas, resultados y conclusiones.
- `FD06-EPIS-PropuestaProyecto.docx`: propuesta, objetivos, alcance, cronograma y criterios de exito.
- `DICCIONARIO-DE-DATOS.md`: diccionario fisico, logico y de contratos API del proyecto.
- `web/`: aplicacion web completa Drop Nexus.

## Descargas

Release: [Database Nexus Toolkit v0.2.0](https://github.com/UPT-FAING-EPIS/proyecto-si783-2026-i-u3-replicador_de_datos_entre_base_de_datos/releases/tag/v0.2.0)

- [Extension VS Code `.vsix`](https://github.com/UPT-FAING-EPIS/proyecto-si783-2026-i-u3-replicador_de_datos_entre_base_de_datos/releases/download/v0.2.0/database-nexus-vscode-0.2.0.vsix)
- [Skill empaquetada `.zip`](https://github.com/UPT-FAING-EPIS/proyecto-si783-2026-i-u3-replicador_de_datos_entre_base_de_datos/releases/download/v0.2.0/database-nexus-assistant-skill-0.1.0.zip)
- [Skill Markdown `.md`](https://github.com/UPT-FAING-EPIS/proyecto-si783-2026-i-u3-replicador_de_datos_entre_base_de_datos/releases/download/v0.2.0/database-nexus-assistant.md)

Instala la extension desde VS Code con **Extensions > Install from VSIX...** o con:

```bash
code --install-extension database-nexus-vscode-0.2.0.vsix
```

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
