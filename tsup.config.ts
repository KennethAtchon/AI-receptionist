import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    // Mark pg as external since it's dynamically imported and optional
    'pg',
    '@types/pg',
    // Mark drizzle-orm as external since users might provide their own instance
    'drizzle-orm',
    'drizzle-orm/node-postgres',
    'drizzle-orm/postgres-js',
  ],
});

