import { NextRequest, NextResponse } from "next/server";
import { sampleSizeBinary, sampleSizeContinuous } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "binary";
  const baseline = Number(searchParams.get("baseline") ?? 0.7);
  const mde = Number(searchParams.get("mde") ?? 0.03);
  const confidence = Number(searchParams.get("confidence") ?? 0.95);
  const power = Number(searchParams.get("power") ?? 0.8);
  const std = Number(searchParams.get("std") ?? 1);

  const n =
    type === "binary"
      ? sampleSizeBinary({ baselineRate: baseline, mde, confidenceLevel: confidence, power })
      : sampleSizeContinuous({ baselineStd: std, mde, confidenceLevel: confidence, power });

  return NextResponse.json({
    type,
    baseline,
    mde,
    confidence,
    power,
    sampleSizePerVariant: n,
    totalSampleSize: n * 2,
  });
}
