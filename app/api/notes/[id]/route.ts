import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import type { Note } from '@/lib/types';

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().optional(),
  type: z.enum(['note', 'checklist', 'idea']).optional(),
  color: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const [note] = await query<Note>(
      `SELECT
        n.*,
        json_agg(
          json_build_object('id', ci.id, 'text', ci.text, 'is_completed', ci.is_completed)
        ) FILTER (WHERE ci.id IS NOT NULL) AS items,
        json_agg(nt.tag) FILTER (WHERE nt.id IS NOT NULL) AS tags
      FROM notes n
      LEFT JOIN checklist_items ci ON n.id = ci.note_id
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      WHERE n.id = $1 AND n.user_id = $2
      GROUP BY n.id`,
      [id, user.userId]
    );
    if (!note) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    return NextResponse.json(note);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 });
  }

  try {
    const fields = result.data;
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (fields.title !== undefined) { sets.push(`title = $${idx++}`); values.push(fields.title); }
    if (fields.content !== undefined) { sets.push(`content = $${idx++}`); values.push(fields.content); }
    if (fields.type !== undefined) { sets.push(`type = $${idx++}`); values.push(fields.type); }
    if (fields.color !== undefined) { sets.push(`color = $${idx++}`); values.push(fields.color); }

    if (sets.length === 0) return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });

    sets.push(`updated_at = NOW()`);
    values.push(id, user.userId);

    const [note] = await query<Note>(
      `UPDATE notes SET ${sets.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    if (!note) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    return NextResponse.json(note);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const result = await query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.userId]
    );
    if (result.length === 0) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
