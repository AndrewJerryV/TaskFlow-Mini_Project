import { NextResponse } from 'next/server';
import { createChallenge, randomInt } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        const hmacSecret = process.env.ALTCHA_HMAC_SECRET;
        const hmacKeySecret = process.env.ALTCHA_HMAC_KEY_SECRET;

        if (!hmacSecret) {
            return NextResponse.json(
                { error: 'ALTCHA_HMAC_SECRET is not configured.' },
                { status: 500 }
            );
        }

        const challenge = await createChallenge({
            algorithm: 'PBKDF2/SHA-256',
            cost: 2_000,
            counter: randomInt(200, 50),
            deriveKey,
            expiresAt: Math.floor(Date.now() / 1000) + 5 * 60,
            hmacSignatureSecret: hmacSecret,
            hmacKeySignatureSecret: hmacKeySecret,
        });

        return NextResponse.json(challenge, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('ALTCHA challenge error:', error);
        return NextResponse.json(
            { error: 'Failed to create ALTCHA challenge.' },
            { status: 500 }
        );
    }
}
