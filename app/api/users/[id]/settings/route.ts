import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updatedUser = await db.updateUserSettings(id, {
            phone: body.phone,
            officeAddress: body.officeAddress,
            quietHoursStart: body.quietHoursStart,
            quietHoursEnd: body.quietHoursEnd,
            quietHoursWeekends: body.quietHoursWeekends,
            twoFactorEnabled: body.twoFactorEnabled,
            maxWorkload: body.maxWorkload,
            burnoutSensitivity: body.burnoutSensitivity,
            autoAssign: body.autoAssign,
            skillMatchPriority: body.skillMatchPriority,
            aiDeadlines: body.aiDeadlines,
            dob: body.dob,
        });

        if (!updatedUser) {
            return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
        }

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Error updating user settings:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update settings' },
            { status: 500 }
        );
    }
}
