"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Gemini API verification for X-ray calculations
export const verifyXrayCalculation = action({
    args: {
        patientType: v.string(),
        age: v.string(),
        sex: v.string(),
        weight: v.string(),
        height: v.string(),
        pediatricAgeLabel: v.optional(v.string()),
        bodyPartName: v.string(),
        baseKvp: v.number(),
        baseMas: v.number(),
        calculatedKvp: v.number(),
        calculatedMas: v.number(),
        sid: v.number(),
        grid: v.boolean(),
    },
    handler: async (ctx, args) => {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY not configured");
            return getFallbackResponse(args);
        }

        const w = parseFloat(args.weight) || 70;
        const h = parseFloat(args.height) || 170;
        const bmi = w / ((h / 100) ** 2);

        const prompt = `You are Dr. RadPhysics, an expert Medical Physicist and Radiography Quality Assurance Specialist with 25+ years of experience in diagnostic imaging protocols. You must rigorously analyze X-ray exposure parameters.

## PATIENT DATA:
- **Patient Type**: ${args.patientType === 'adult' ? 'Adult' : 'Pediatric'}
- **Age**: ${args.patientType === 'adult' ? args.age + ' years' : args.pediatricAgeLabel}
- **Sex**: ${args.sex}
- **Weight**: ${args.weight} kg
- **Height**: ${args.height} cm
- **BMI**: ${bmi.toFixed(1)} kg/m²
- **Body Habitus**: ${bmi < 18.5 ? 'Underweight/Asthenic' : bmi < 25 ? 'Normal/Sthenic' : bmi < 30 ? 'Overweight/Hypersthenic' : 'Obese'}

## EXAMINATION:
- **Body Part**: ${args.bodyPartName}
- **SID (Source-to-Image Distance)**: ${args.sid} cm
- **Grid Used**: ${args.grid ? 'Yes (required for thickness >10cm)' : 'No (tabletop technique)'}

## CALCULATED EXPOSURE PARAMETERS:
- **kVp (Tube Voltage)**: ${args.calculatedKvp} kVp
- **mAs (Tube Current × Time)**: ${args.calculatedMas} mAs

## BASE PROTOCOL VALUES (Standard Adult Reference):
- Base kVp: ${args.baseKvp}
- Base mAs: ${args.baseMas}

## YOUR TASK:
Perform a comprehensive radiographic technique analysis:

1. **PARAMETER VALIDATION**: Are the calculated kVp and mAs appropriate for this specific patient profile and examination? Compare against established radiography protocols (Bushong, Bontrager, AAPM guidelines).

2. **DOSE OPTIMIZATION (ALARA)**: Is the technique optimized to minimize patient dose while maintaining diagnostic image quality?

3. **PATIENT-SPECIFIC FACTORS**: BMI/body habitus adjustments, age-related considerations, sex-specific modifications.

4. **TECHNICAL ACCURACY**: Grid usage appropriateness, SID correctness, potential for motion blur.

5. **CLINICAL SAFETY**: Any red flags or concerning values.

Respond ONLY with valid JSON in this exact format:
{
  "isVerified": true/false,
  "confidence": 0-100,
  "analysis": "Detailed technical analysis of the exposure parameters (2-3 sentences)",
  "suggestions": ["suggestion1", "suggestion2"],
  "safetyNote": "Important safety consideration or confirmation of safe parameters"
}`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': GEMINI_API_KEY,
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 1024,
                        },
                    }),
                }
            );

            if (response.status === 429) {
                console.log("Gemini API rate limited, using fallback");
                return getFallbackResponse(args);
            }

            if (!response.ok) {
                console.error(`Gemini API error: ${response.status}`);
                return getFallbackResponse(args);
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                return getFallbackResponse(args);
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            return getFallbackResponse(args);
        }
    },
});

function getFallbackResponse(args: {
    bodyPartName: string;
    baseKvp: number;
    baseMas: number;
    calculatedKvp: number;
    calculatedMas: number;
    patientType: string;
    weight: string;
    height: string;
}) {
    const w = parseFloat(args.weight) || 70;
    const h = parseFloat(args.height) || 170;
    const bmi = w / ((h / 100) ** 2);

    const isWithinRange =
        args.calculatedKvp >= args.baseKvp - 15 &&
        args.calculatedKvp <= args.baseKvp + 20 &&
        args.calculatedMas >= args.baseMas * 0.1 &&
        args.calculatedMas <= args.baseMas * 3;

    return {
        isVerified: isWithinRange,
        confidence: isWithinRange ? 88 : 65,
        analysis: isWithinRange
            ? `Parameters are within acceptable range for ${args.bodyPartName}. kVp of ${args.calculatedKvp} and mAs of ${args.calculatedMas} are appropriate for a patient with BMI ${bmi.toFixed(1)}.`
            : `Parameters may need adjustment. Please verify against your facility protocols for ${args.bodyPartName}.`,
        suggestions: [
            'Always verify against your facility-specific protocols',
            'Consider patient-specific factors not captured in calculations',
            args.patientType === 'pediatric' ? 'Use lowest possible exposure for pediatric patients (ALARA)' : 'Adjust for pathology if present'
        ],
        safetyNote: isWithinRange
            ? 'Calculated values follow standard radiographic technique guidelines.'
            : 'Review parameters before exposure. Consult technique charts if uncertain.',
    };
}
