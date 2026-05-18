import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import type { ChecklistItem } from '@/lib/types';

const patchSchema = z.object({
  is_completed: z.boolean().optional(),
  text: z.string().min(1).optional(),
});

type Params = { params: Promise<{ itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { itemId } = await params;
  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 });
  }

  try {
    // Verify item belongs to a note owned by the user
    const [existing] = await query<ChecklistItem>(
      `SELECT ci.* FROM checklist_items ci
       JOIN notes n ON ci.note_id = n.id
       WHERE ci.id = $1 AND n.user_id = $2`,
      [itemId, user.userId]
    );
    if (!existing) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });

    const fields = result.data;
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (fields.is_completed !== undefined) { sets.push(`is_completed = $${idx++}`); values.push(fields.is_completed); }
    if (fields.text !== undefined) { sets.push(`text = $${idx++}`); values.push(fields.text); }

    if (sets.length === 0) return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });

    values.push(itemId);
    const [updated] = await query<ChecklistItem>(
      `UPDATE checklist_items SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { itemId } = await params;

  try {
    const result = await query(
      `DELETE FROM checklist_items ci
       USING notes n
       WHERE ci.note_id = n.id AND ci.id = $1 AND n.user_id = $2
       RETURNING ci.id`,
      [itemId, user.userId]
    );
    if (result.length === 0) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
