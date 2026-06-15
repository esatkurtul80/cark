import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tugba-kuruyemis-secret-key-super-secure-2026'
);

/**
 * Sign a payload into a JWT token
 */
export async function signJWT(payload, expires = '30d') {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token and return its payload
 */
export async function verifyJWT(token) {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}
