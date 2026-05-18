import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = loginSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 });
  }

  const { email, password } = result.data;

  const [user] = await query<UserRow>(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );

  if (!user) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = signToken({ userId: user.id, email: user.email });
  const { password_hash: _, ...safeUser } = user;
  return NextResponse.json({ user: safeUser, token });
}
