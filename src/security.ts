import { NotImplementedError } from './errors';
import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return await bcrypt.hash(password, 10);
}

export function generateToken(data: TokenData): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const jwtSecretKey: Secret = process.env.JWT_SECRET as Secret;
  return jwt.sign(data, jwtSecretKey);
}

export function isValidToken(token: string): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const jwtSecretKey: Secret = process.env.JWT_SECRET as Secret;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return jwt.verify(token, jwtSecretKey);

}

// NOTE(roman): assuming that `isValidToken` will be called before
export function extraDataFromToken(token: string): TokenData {
  throw new NotImplementedError('TOKEN_EXTRACTION_NOT_IMPLEMENTED_YET');
}

export async function compareHash(s: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(s, hash);
}

export interface TokenData {
  id: number;
}