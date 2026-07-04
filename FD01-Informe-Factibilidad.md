# Informe de Factibilidad

## Proyecto

**Drop Nexus - Replicador de Datos entre Bases de Datos** es una aplicacion web para importar, configurar, replicar y descargar datos entre motores de base de datos heterogeneos.

## Objetivo

Desarrollar una herramienta que reduzca el trabajo manual de migracion de datos, permita seleccionar tablas y columnas, ejecute replicas por lotes y entregue una base modificada descargable.

## Factibilidad tecnica

- Backend en Node.js 20, TypeScript y Fastify.
- Frontend en React, Vite y Tailwind.
- Persistencia de usuarios, jobs y catalogos en Supabase/PostgreSQL.
- Despliegue compatible con Render mediante `web/render.yaml`.
- Soporte de PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, MongoDB y Excel/CSV por archivo.

## Factibilidad economica

El proyecto es viable para el entorno academico porque usa herramientas libres y servicios con planes gratuitos. Los costos variables aparecen solo al usar infraestructura externa, por ejemplo SQL Server para restaurar `.bak`.

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| Formatos incompatibles | Validaciones de extension, cabecera SQLite, tamano, archivo vacio/binario. |
| `.bak` sin infraestructura | Variables `SQLSERVER_RESTORE_*` obligatorias y errores claros. |
| Credenciales sensibles | Cifrado AES-256-GCM y exclusion de `.env`. |
| Diferencias entre motores | Mapeo de tipos y adaptadores por motor. |

## Conclusion

La solucion es factible tecnica, economica y operativamente. Cumple con el objetivo central de replicar datos y permitir descargar la base ya modificada.
