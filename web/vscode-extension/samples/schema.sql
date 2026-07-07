CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE,
  fecha_registro DATE,
  activo BOOLEAN DEFAULT TRUE,
  total_compras DECIMAL(10, 2)
);

CREATE TABLE ventas (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  producto VARCHAR(160) NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  fecha DATE NOT NULL,
  estado VARCHAR(30),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

INSERT INTO clientes (id, nombre, email, fecha_registro, activo, total_compras)
VALUES (1, 'Ana Torres', 'ana.torres@example.com', '2026-07-01', TRUE, 120.50);
