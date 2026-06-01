import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign(
  {
    user_id: 'user-001',
    tenant_id: 'tenant-001',
    role: 'admin',
  },
  process.env.JWT_SECRET!,
  { expiresIn: '24h' },
);

console.log('Bearer Token:');
console.log(token);