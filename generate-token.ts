import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const privateKey = fs.readFileSync(
  path.join(__dirname, 'src/keys/private.key'),
  'utf8',
);

// Token for tenant-001
const token1 = jwt.sign(
  {
    user_id: 'user-001',
    tenant_id: 'tenant-001',
    role: 'admin',
  },
  privateKey,
  {
    algorithm: 'RS256',
    expiresIn: '24h',
  },
);

// Token for tenant-002 (for testing tenant isolation)
const token2 = jwt.sign(
  {
    user_id: 'user-002',
    tenant_id: 'tenant-002',
    role: 'admin',
  },
  privateKey,
  {
    algorithm: 'RS256',
    expiresIn: '24h',
  },
);

console.log('\nToken for tenant-001 (user-001):');
console.log(token1);
console.log('\nToken for tenant-002 (user-002):');
console.log(token2);