import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import type { ChecklistItem } from '@/lib/types';

const itemSchema = z.object({
  text: z.string().min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    // Verify note belongs to user before returning items
    const [note] = await query('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [id, user.userId]);
    if (!note) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });

    const items = await query<ChecklistItem>(
      'SELECT * FROM checklist_items WHERE note_id = $1 ORDER BY id',
      [id]
    );
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const result = itemSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 });
  }

  try {
    const [note] = await query('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [id, user.userId]);
    if (!note) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });

    const [item] = await query<ChecklistItem>(
      'INSERT INTO checklist_items (note_id, text) VALUES ($1, $2) RETURNING *',
      [id, result.data.text]
    );
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
