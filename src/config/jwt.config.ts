import path from 'path';
import fs from 'fs';
import { HTTP_STATUS } from '../shared/constants';
import { AppError } from '../shared/errors/app.error';

const privateKeyPath = path.join(__dirname, "../keys/private.key");
const publicKeyPath = path.join(__dirname, "../keys/public.key");

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  throw new AppError("JWT keys not found. Please generate the keys and place them in the src/keys directory.", HTTP_STATUS.INTERNAL_SERVER_ERROR);  
}

export const jwtConfig = {

  privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
  publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  algorithm: 'RS256' as const,
};
