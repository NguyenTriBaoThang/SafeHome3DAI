import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

async function GETHandler() {
  return NextResponse.json(CURATED_KNOWLEDGE_SOURCES);
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
