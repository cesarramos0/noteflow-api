# NoteFlow API

API REST para la app móvil NoteFlow. Construida con Next.js App Router, PostgreSQL (Neon) y autenticación JWT.

## Setup

```bash
npm install
cp .env.example .env.local
# Editar .env.local con tus credenciales
npm run dev
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de PostgreSQL (Neon) |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mínimo 32 caracteres) |

## Base de datos

Ejecuta el script en la consola SQL de Neon:

```bash
# Pega el contenido de sql/schema.sql en la consola de Neon
```

## Endpoints

### Auth

#### `POST /api/auth/register`

Registra un nuevo usuario.

**Body:**
```json
{ "email": "user@example.com", "password": "minimo8chars" }
```

**Respuesta 201:**
```json
{ "user": { "id": "uuid", "email": "...", "created_at": "..." }, "token": "eyJ..." }
```

---

#### `POST /api/auth/login`

Autentica un usuario y devuelve un token JWT.

**Body:**
```json
{ "email": "user@example.com", "password": "minimo8chars" }
```

**Respuesta 200:**
```json
{ "user": { "id": "uuid", "email": "..." }, "token": "eyJ..." }
```

---

### Notas

Todos los endpoints de notas requieren el header:
```
Authorization: Bearer <token>
```

---

#### `GET /api/notes`

Devuelve todas las notas del usuario autenticado con sus items y tags.

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "title": "Mi nota",
    "content": "...",
    "type": "note",
    "color": "#ffffff",
    "created_at": "...",
    "updated_at": "...",
    "items": null,
    "tags": ["trabajo", "personal"]
  }
]
```

---

#### `POST /api/notes`

Crea una nueva nota.

**Body:**
```json
{
  "title": "Mi nota",
  "type": "note",
  "content": "Contenido opcional",
  "color": "#ffffff"
}
```

**Validación:**
- `title`: mínimo 3 caracteres
- `type`: debe ser `note`, `checklist` o `idea`

**Respuesta 201:** la nota creada.

---

#### `GET /api/notes/:id`

Devuelve una nota por ID con sus items y tags.

**Respuesta 200:** la nota. **404** si no existe o no pertenece al usuario.

---

#### `PATCH /api/notes/:id`

Actualiza campos de una nota. Solo se actualizan los campos enviados.

**Body (todos opcionales):**
```json
{
  "title": "Nuevo título",
  "content": "Nuevo contenido",
  "type": "idea",
  "color": "#ff0000"
}
```

**Respuesta 200:** la nota actualizada.

---

#### `DELETE /api/notes/:id`

Elimina una nota y en cascada sus checklist items y tags.

**Respuesta 204:** sin body.

---

### Checklist Items

#### `GET /api/notes/:id/checklist-items`

Devuelve los items de una nota de tipo checklist.

**Respuesta 200:**
```json
[{ "id": "uuid", "note_id": "uuid", "text": "Tarea", "is_completed": false }]
```

---

#### `POST /api/notes/:id/checklist-items`

Agrega un item a una nota.

**Body:**
```json
{ "text": "Nueva tarea" }
```

**Respuesta 201:** el item creado.

---

#### `PATCH /api/checklist-items/:itemId`

Actualiza un item (marcar/desmarcar, editar texto).

**Body (opcionales):**
```json
{ "is_completed": true, "text": "Texto actualizado" }
```

**Respuesta 200:** el item actualizado.

---

#### `DELETE /api/checklist-items/:itemId`

Elimina un item.

**Respuesta 204:** sin body.

---

## Despliegue en Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. En Settings → Environment Variables, agrega:
   - `DATABASE_URL` → tu connection string de Neon
   - `JWT_SECRET` → un string aleatorio seguro (ej: `openssl rand -base64 32`)
3. Deploy automático en cada push a `main`

## Tecnologías

- **Next.js 15** — App Router, Route Handlers
- **@neondatabase/serverless** — Cliente PostgreSQL optimizado para edge/serverless
- **Zod** — Validación de esquemas
- **bcryptjs** — Hash de contraseñas
- **jsonwebtoken** — Tokens JWT
