import { Hono } from 'hono';

const app = new Hono();

app.get('/v1/health', (c) => c.json({ ok: true }));

export default app;
