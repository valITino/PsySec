/**
 * Fallakten («Maschen, die gerade kursieren»).
 * Neue Fallakte = neue Markdown-Datei in src/content/maschen, kein Code nötig.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const maschen = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/maschen' }),
  schema: z.object({
    /** Name der Masche */
    titel: z.string().min(3),
    /** Typischer Satz der Betrüger (fiktiv, ohne echte Marken) */
    zitat: z.string().min(3),
    /** Psychologische Hebel, z. B. Zeitdruck, Autorität */
    hebel: z.array(z.string().min(2)).min(1),
    warnsignal: z.string().min(3),
    hilft: z.string().min(3),
    /** Nur Quellen aus Abschnitt 5.17 des Auftrags; neue Links erst nach Prüfung */
    quelle: z.object({ name: z.string().min(2), url: z.url() }),
    /** Stand der Fallakte (zuletzt geprüft) */
    datum: z.coerce.date(),
    /** Genau eine Fallakte ist hervorgehoben */
    featured: z.boolean().default(false),
  }),
});

export const collections = { maschen };
