import { IndiePitcher } from 'indiepitcher';

const indiePitcher = new IndiePitcher(process.env.INDIEPITCHER_API_KEY || 'sc_7712638fe25f9ed83061da2632e6f42441a084c1de1df080b3dbf608c64b3d50');

/**
 * Sends an OTP email for user deletion verification using IndiePitcher.
 */
export async function sendOTPEmail(to: string, otp: string) {
    try {
        console.log(`[Email] Sending OTP ${otp} to ${to} via IndiePitcher...`);

        await indiePitcher.sendEmail({
            to: to,
            subject: 'User Deletion Verification Code',
            body: `
### Verify User Deletion

You have requested to delete a user from TaskFlow. Please use the following One-Time Password (OTP) to verify this action:

## **${otp}**

This code will expire in 5 minutes. If you did not request this deletion, please ignore this email.

---
&copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
            `,
            bodyFormat: 'markdown',
        });

        console.log('[Email Success] OTP sent via IndiePitcher');
        return { success: true };
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
}
