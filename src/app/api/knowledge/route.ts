import { NextResponse } from "next/server";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

export async function GET() {
  return NextResponse.json(CURATED_KNOWLEDGE_SOURCES);
}

