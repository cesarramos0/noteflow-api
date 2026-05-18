# Backend: Teoría y Arquitectura

## Patrón cliente-servidor

La app móvil (cliente) nunca se conecta directamente a la base de datos. Si el connection string de PostgreSQL estuviese en el binario de la app, cualquiera que la descompile tendría acceso completo a la base de datos.

El patrón es de tres capas:

```
App móvil  →  API REST (Next.js)  →  PostgreSQL (Neon)
 cliente          servidor            base de datos
```

Cada capa tiene una responsabilidad única. La API actúa como guardián: valida los datos que llegan y verifica que el cliente tiene permiso para hacer lo que pide.

---

## Qué es una API REST

REST (Representational State Transfer) es un estilo de arquitectura donde los recursos se identifican con URLs y las operaciones se expresan con métodos HTTP.

### Métodos HTTP

| Método | Uso |
|--------|-----|
| GET | Leer datos |
| POST | Crear datos |
| PATCH | Modificar datos parcialmente |
| PUT | Reemplazar datos completos |
| DELETE | Eliminar datos |

### Códigos de estado más importantes

| Código | Significado |
|--------|-------------|
| 200 OK | Operación exitosa |
| 201 Created | Recurso creado |
| 204 No Content | Éxito sin cuerpo (DELETE) |
| 400 Bad Request | Datos de entrada inválidos |
| 401 Unauthorized | No autenticado |
| 403 Forbidden | Autenticado pero sin permiso |
| 404 Not Found | Recurso no existe |
| 500 Internal Server Error | Error del servidor |

Nunca devuelvas el error real de la base de datos al cliente: es información interna que un atacante podría usar para entender la estructura del sistema.

---

## Bases de datos relacionales y ACID

Las bases de datos relacionales organizan los datos en tablas con filas y columnas. Las propiedades **ACID** garantizan que las transacciones son fiables:

- **Atomicidad**: una transacción completa o no ocurre. Sin esto, podrías crear una nota sin sus checklist items, dejando la base en estado inconsistente.
- **Consistencia**: los datos siempre cumplen las reglas definidas (constraints, foreign keys).
- **Aislamiento**: transacciones concurrentes no se interfieren.
- **Durabilidad**: los cambios confirmados sobreviven a fallos del sistema.

---

## Claves primarias y foráneas

**Primary Key (UUID):** identificador único e irrepetible. Se usa UUID (no enteros autoincrementales) porque el cliente móvil puede generar el ID antes de conectarse a la red. Esto permite crear notas offline y sincronizarlas después.

**Foreign Key:** columna que referencia la primary key de otra tabla.
```sql
note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE
```
`ON DELETE CASCADE` significa que al borrar una nota, sus checklist items y tags se borran automáticamente.

---

## Diagrama entidad-relación

```
users
├── id (PK)
├── email
└── password_hash

notes
├── id (PK)
├── user_id (FK → users.id)
├── title
├── content
├── type
├── color
├── created_at
└── updated_at

checklist_items
├── id (PK)
├── note_id (FK → notes.id)  ← ON DELETE CASCADE
├── text
└── is_completed

note_tags
├── id (PK)
├── note_id (FK → notes.id)  ← ON DELETE CASCADE
└── tag
```

**Relaciones:**
- Un `user` tiene muchas `notes` (1:N)
- Una `note` tiene muchos `checklist_items` (1:N)
- Una `note` tiene muchos `note_tags` (1:N)

---

## DDL vs DML

**DDL (Data Definition Language):** define la estructura de la base de datos.
```sql
CREATE TABLE notes (...);
ALTER TABLE notes ADD COLUMN color VARCHAR(7);
DROP TABLE notes;
```

**DML (Data Manipulation Language):** manipula los datos.
```sql
SELECT * FROM notes WHERE user_id = $1;
INSERT INTO notes (title) VALUES ($1) RETURNING *;
UPDATE notes SET title = $1 WHERE id = $2;
DELETE FROM notes WHERE id = $1;
```

---

## JOINs

Los JOINs combinan filas de dos o más tablas basándose en una condición.

### INNER JOIN

Devuelve solo las filas que tienen coincidencia en ambas tablas. Úsalo cuando necesitas que ambas partes existan.

```sql
-- Solo notas que tienen al menos un item
SELECT n.*, ci.text
FROM notes n
INNER JOIN checklist_items ci ON n.id = ci.note_id;
```

### LEFT JOIN

Devuelve todas las filas de la tabla izquierda y las coincidentes de la derecha. Si no hay coincidencia, devuelve NULL. Úsalo cuando la relación es opcional.

```sql
-- Todas las notas, aunque no tengan items
SELECT n.*, ci.text
FROM notes n
LEFT JOIN checklist_items ci ON n.id = ci.note_id;
```

**Regla:** para notas con sus items usa LEFT JOIN porque una nota puede no tener items. Si usas INNER JOIN, las notas sin items desaparecerían del resultado.

### Agregación con json_agg

Para obtener una nota con todos sus items en una sola consulta (en lugar de N+1 queries):

```sql
SELECT
  n.*,
  json_agg(
    json_build_object('id', ci.id, 'text', ci.text, 'is_completed', ci.is_completed)
  ) FILTER (WHERE ci.id IS NOT NULL) AS items
FROM notes n
LEFT JOIN checklist_items ci ON n.id = ci.note_id
WHERE n.user_id = $1
GROUP BY n.id;
```

El `FILTER (WHERE ci.id IS NOT NULL)` evita que `json_agg` devuelva `[null]` para notas sin items.
