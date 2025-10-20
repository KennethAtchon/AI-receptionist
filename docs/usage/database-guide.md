import { AIReceptionist, DatabaseStorage } from '@loctelli/ai-receptionist';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const receptionist = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },
    memory: {
      longTermEnabled: true,
      longTermStorage: new DatabaseStorage({ db, autoMigrate: true })
    }
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  }
});

await receptionist.initialize();