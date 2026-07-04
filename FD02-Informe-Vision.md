# Documento de Vision

## Vision

**Drop Nexus - Replicador de Datos entre Bases de Datos** ofrece una web para replicar datos entre bases de datos sin depender de scripts manuales por cada motor.

## Usuarios

- Usuario tecnico o estudiante que necesita importar y replicar datos.
- Administrador que gestiona usuarios y configuraciones.
- Docente o evaluador que revisa la web, la arquitectura y los documentos.

## Capacidades

- Importar archivos `.sql`, `.db`, `.sqlite`, `.json`, `.ndjson`, `.xlsx`, `.xls`, `.csv` y `.bak` configurado.
- Configurar motores origen/destino.
- Seleccionar tablas, mapear columnas y ejecutar replicas.
- Consultar progreso, historial, errores y reintentos.
- Descargar la base modificada en JSON, Excel `.xlsx` o SQLite.
- Usar chatbox, skill `.md` y extension de Visual Studio Code como apoyo.

## Restricciones

- `.bak` requiere SQL Server externo y variables `SQLSERVER_RESTORE_*`.
- La replica incremental por offset no reemplaza CDC exact-once.
- Render no incluye SQL Server local, por lo que la restauracion depende de infraestructura externa.

## Conclusion

La vision se centra en una aplicacion de replicacion de datos con entrega verificable del resultado, organizada en la carpeta `web/` y documentada en los formatos FD01 a FD06.
