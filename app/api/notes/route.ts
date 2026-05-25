import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import type { Note } from '@/lib/types';

const noteSchema = z.object({
  title: z.string().min(3),
  type: z.enum(['note', 'checklist', 'idea']),
  content: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const notes = await query<Note>(
      `SELECT
        n.*,
        json_agg(
          json_build_object('id', ci.id, 'text', ci.text, 'is_completed', ci.is_completed)
        ) FILTER (WHERE ci.id IS NOT NULL) AS items,
        json_agg(nt.tag) FILTER (WHERE nt.id IS NOT NULL) AS tags
      FROM notes n
      LEFT JOIN checklist_items ci ON n.id = ci.note_id
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      WHERE n.user_id = $1
      GROUP BY n.id
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3`,
      [user.userId, limit, offset]
    );

    const [{ count }] = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM notes WHERE user_id = $1',
      [user.userId]
    );

    return NextResponse.json({
      notes,
      total: parseInt(count),
      hasMore: offset + limit < parseInt(count),
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const result = noteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 });
  }

  try {
    const { title, type, content, color } = result.data;
    const [note] = await query<Note>(
      'INSERT INTO notes (user_id, title, type, content, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user.userId, title, type, content ?? null, color ?? null]
    );
    return NextResponse.json({ ...note, items: null, tags: null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
