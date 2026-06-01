import { defineConfig } from 'prisma/config'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.DOTENV_PATH || '.env' })

export default defineConfig({
  migrations: {
    seed: 'ts-node src/database/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})