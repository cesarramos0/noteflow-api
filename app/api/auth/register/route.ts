import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import type { User } from '@/lib/types';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = registerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 });
  }

  const { email, password } = result.data;

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.length > 0) {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const [user] = await query<User>(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, password_hash]
  );

  const token = signToken({ userId: user.id, email: user.email });
  return NextResponse.json({ user, token }, { status: 201 });
}
