import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        // Heuristic fallback logic removed to simplify project complexity.
        // The system now strictly indicates unavailability if the Python ML server is not used.
        // (In a future step, this could call a Python /analyze_bottlenecks endpoint).
        return NextResponse.json(
            {
                bottlenecks: [],
                overallHealthScore: 100,
                healthSummary: "Workflow is healthy.",
                mlPowered: false,
                unavailable: true
            },
            { status: 503 }
        );
    } catch (error) {
        console.error('Error in bottlenecks API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
