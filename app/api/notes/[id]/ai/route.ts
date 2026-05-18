import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import type { Note } from '@/lib/types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const bodySchema = z.object({
  action: z.enum(['improve', 'summarize', 'expand']),
});

const prompts = {
  improve: (content: string) =>
    `Mejora la redacción del siguiente texto para que sea más claro y profesional. Devuelve solo el texto mejorado, sin explicaciones:\n\n${content}`,
  summarize: (content: string) =>
    `Resume el siguiente texto en 2-3 frases cortas. Devuelve solo el resumen, sin explicaciones:\n\n${content}`,
  expand: (content: string) =>
    `Amplía el siguiente texto con más detalle y contexto. Devuelve solo el texto ampliado, sin explicaciones:\n\n${content}`,
};

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const result = bodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 });
  }

  const [note] = await query<Note>(
    'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
    [id, user.userId]
  );
  if (!note) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
  if (!note.content) return NextResponse.json({ error: 'La nota no tiene contenido' }, { status: 400 });

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompts[result.data.action](note.content) }],
      model: 'llama-3.3-70b-versatile',
    });
    const text = completion.choices[0]?.message?.content ?? '';
    return NextResponse.json({ result: text });
  } catch {
    return NextResponse.json({ error: 'Error al procesar la IA' }, { status: 500 });
  }
}
