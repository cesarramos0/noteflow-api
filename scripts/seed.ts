import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TITLES = [
  'Reunión de equipo', 'Ideas para el proyecto', 'Lista de compras', 'Notas del libro',
  'Plan semanal', 'Pendientes del trabajo', 'Recordatorio importante', 'Brainstorming',
  'Resumen de la clase', 'Objetivos del mes', 'Aprendizajes del día', 'Ideas de negocio',
  'Cosas por hacer', 'Notas personales', 'Plan de estudio', 'Reflexiones',
  'Recursos útiles', 'Contactos importantes', 'Seguimiento de tareas', 'Diario',
];

const CONTENTS = [
  'Revisar los puntos clave antes de la próxima reunión y preparar la presentación.',
  'Explorar nuevas tecnologías para mejorar el rendimiento de la aplicación.',
  'Leche, huevos, pan, frutas, verduras, café y pasta.',
  'El autor explica que la consistencia es más importante que la intensidad.',
  'Lunes: gym. Martes: trabajo profundo. Miércoles: reuniones. Jueves: aprendizaje.',
  'Terminar el informe, responder emails pendientes, revisar el código del PR.',
  'Llamar al médico antes del viernes para confirmar la cita.',
  'App de meditación, plataforma de cursos, herramienta de productividad.',
  'Los conceptos principales son: abstracción, encapsulamiento, herencia y polimorfismo.',
  'Leer 20 páginas al día, hacer ejercicio 3 veces por semana, aprender algo nuevo.',
  'Hoy aprendí sobre los hooks de React y cómo manejar el estado de forma eficiente.',
  'Servicio de suscripción para desarrolladores independientes con recursos y mentoría.',
  'Revisar documentación, escribir tests, refactorizar el módulo de autenticación.',
  'Hoy fue un día productivo. Conseguí terminar todas las tareas pendientes.',
  'Repasar algoritmos de ordenamiento, practicar ejercicios de LeetCode cada día.',
  'Es importante mantener el equilibrio entre el trabajo y la vida personal.',
  'MDN Web Docs, DevDocs, The Odin Project, Frontend Masters.',
  'Juan: diseño. María: backend. Carlos: QA. Ana: producto.',
  'Sprint actual: autenticación, CRUD de notas, integración con la API de IA.',
  'Hoy me di cuenta de que debo mejorar mi gestión del tiempo y mis prioridades.',
];

const TAGS = ['trabajo', 'personal', 'urgente', 'ideas', 'estudio', 'proyecto', 'salud', 'finanzas', 'hobbies', 'familia'];

const CHECKLIST_ITEMS = [
  'Revisar el código', 'Escribir documentación', 'Hacer tests', 'Desplegar en producción',
  'Notificar al equipo', 'Actualizar el backlog', 'Revisar PRs pendientes', 'Sincronizar con el cliente',
  'Preparar demo', 'Cerrar tickets resueltos',
];

const TYPES = ['note', 'checklist', 'idea'] as const;
const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', null, null, null];

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log('Conectando a la base de datos...');
  const client = await pool.connect();

  try {
    // Crear usuario de prueba
    const email = 'seed@noteflow.dev';
    const password_hash = await bcrypt.hash('12345678', 10);

    await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
      [email, password_hash]
    );

    const { rows: [user] } = await client.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );

    console.log(`Usuario: ${email} / 12345678`);
    console.log('Insertando 1000 notas...');

    let inserted = 0;

    for (let i = 0; i < 1000; i++) {
      const type = random(TYPES);
      const title = `${random(TITLES)} ${i + 1}`;
      const content = type !== 'checklist' ? random(CONTENTS) : null;
      const color = random(COLORS);

      const { rows: [note] } = await client.query(
        `INSERT INTO notes (user_id, title, type, content, color)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, title, type, content, color]
      );

      // Agregar checklist items si es tipo checklist
      if (type === 'checklist') {
        const itemCount = randomInt(2, 6);
        for (let j = 0; j < itemCount; j++) {
          await client.query(
            `INSERT INTO checklist_items (note_id, text, is_completed) VALUES ($1, $2, $3)`,
            [note.id, random(CHECKLIST_ITEMS), Math.random() > 0.5]
          );
        }
      }

      // Agregar 1-2 tags aleatorios
      const tagCount = randomInt(1, 2);
      const usedTags = new Set<string>();
      for (let k = 0; k < tagCount; k++) {
        const tag = random(TAGS);
        if (!usedTags.has(tag)) {
          usedTags.add(tag);
          await client.query(
            `INSERT INTO note_tags (note_id, tag) VALUES ($1, $2)`,
            [note.id, tag]
          );
        }
      }

      inserted++;
      if (inserted % 100 === 0) console.log(`  ${inserted}/1000 notas insertadas...`);
    }

    console.log('✓ Seed completado: 1000 notas insertadas.');
    console.log(`  Login: ${email} / password123`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
