# Seguridad en APIs

## SQL Injection

La inyección SQL ocurre cuando la entrada del usuario se concatena directamente en una consulta. Un atacante puede manipular la consulta para acceder o destruir datos.

### Ejemplo vulnerable

```typescript
// NUNCA hagas esto
const title = req.body.title;
// Si title = "'; DROP TABLE notes;--"
// la consulta se convierte en:
// SELECT * FROM notes WHERE title = ''; DROP TABLE notes;--'
const sql = "SELECT * FROM notes WHERE title = '" + title + "'";
```

El atacante termina el string con `'`, inyecta `DROP TABLE notes` como un segundo comando y comenta el resto con `--`.

### Solución: consultas parametrizadas

Las consultas parametrizadas envían la estructura SQL y los valores por separado. La base de datos precompila el SQL y trata los parámetros estrictamente como datos, nunca como código.

```typescript
// Seguro: el valor nunca se interpreta como SQL
const sql = "SELECT * FROM notes WHERE title = $1";
await db.query(sql, [req.body.title]);
```

En este proyecto, **todas las consultas usan parámetros** (`$1`, `$2`, etc.) a través de `lib/db.ts`. Nunca se concatena input del usuario en el texto SQL.

---

## Variables de entorno

Las variables de entorno almacenan configuración sensible fuera del código fuente. Esto es crítico para:

- **Connection strings de base de datos** (`DATABASE_URL`): contienen credenciales de acceso completo a la DB.
- **Secretos JWT** (`JWT_SECRET`): si se filtra, cualquiera puede generar tokens válidos.
- **API keys**: credenciales de servicios externos.

### Reglas

1. **Nunca en el código**: el connection string nunca debe aparecer en ningún archivo `.ts`, `.js` o `.json`.
2. **Nunca en git**: `.env.local` está en `.gitignore`. Solo se commitea `.env.example` con las claves vacías.
3. **Diferentes por entorno**: desarrollo, staging y producción deben tener credenciales distintas.
4. **En Vercel**: se configuran en el panel de Environment Variables, nunca en el repositorio.

### Por qué es importante

Si el `DATABASE_URL` se filtra en un commit público en GitHub, cualquier persona en internet tiene acceso completo a la base de datos. Esto ha causado brechas de datos masivas en empresas reales.

Herramientas como [GitGuardian](https://gitguardian.com) escanean repositorios públicos en busca de secrets expuestos en tiempo real.

---

## Autenticación JWT

Los tokens JWT (JSON Web Tokens) permiten autenticar peticiones sin sesiones en el servidor.

### Flujo

```
1. Cliente: POST /api/auth/login { email, password }
2. Servidor: verifica credenciales → firma JWT con JWT_SECRET
3. Servidor: devuelve { token: "eyJ..." }
4. Cliente: guarda el token en expo-secure-store (cifrado en el keychain del dispositivo)
5. Cliente: envía en cada petición: Authorization: Bearer eyJ...
6. Servidor: verifica la firma del token → extrae userId → procesa la petición
```

### Por qué expo-secure-store y no AsyncStorage

`AsyncStorage` almacena datos en texto plano. Un atacante con acceso físico al dispositivo o con malware puede leerlos. `expo-secure-store` cifra los datos usando el keychain (iOS) o Keystore (Android) del sistema operativo, que requiere autenticación biométrica o PIN para acceder.

---

## Principio de mínimo privilegio

Cada endpoint verifica que el recurso pertenece al usuario autenticado:

```typescript
// No basta con estar autenticado: la nota debe ser del usuario
WHERE id = $1 AND user_id = $2
```

Esto previene que un usuario autenticado pueda leer, modificar o eliminar notas de otro usuario simplemente conociendo su UUID.
