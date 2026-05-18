-- Obtener todas las notas de un usuario con sus items y tags en una sola consulta.
-- LEFT JOIN: devuelve todas las notas aunque no tengan items/tags (NULL si no hay match).
-- INNER JOIN devolvería solo notas que tienen al menos un item/tag.
-- json_agg + FILTER: agrega filas en un array JSON, ignorando NULLs.
-- GROUP BY n.id: necesario porque usamos funciones de agregación.
SELECT
  n.*,
  json_agg(
    json_build_object(
      'id', ci.id,
      'text', ci.text,
      'is_completed', ci.is_completed
    )
  ) FILTER (WHERE ci.id IS NOT NULL) AS items,
  json_agg(nt.tag) FILTER (WHERE nt.id IS NOT NULL) AS tags
FROM notes n
LEFT JOIN checklist_items ci ON n.id = ci.note_id
LEFT JOIN note_tags nt ON n.id = nt.note_id
WHERE n.user_id = $1
GROUP BY n.id
ORDER BY n.created_at DESC;

-- Obtener una nota por ID con sus relaciones
SELECT
  n.*,
  json_agg(
    json_build_object(
      'id', ci.id,
      'text', ci.text,
      'is_completed', ci.is_completed
    )
  ) FILTER (WHERE ci.id IS NOT NULL) AS items,
  json_agg(nt.tag) FILTER (WHERE nt.id IS NOT NULL) AS tags
FROM notes n
LEFT JOIN checklist_items ci ON n.id = ci.note_id
LEFT JOIN note_tags nt ON n.id = nt.note_id
WHERE n.id = $1 AND n.user_id = $2
GROUP BY n.id;
