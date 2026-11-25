import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { getActiveRegistrySources } from "@/lib/rag/documentRegistry";

async function GETHandler() {
  const { activeSources } = getActiveRegistrySources({ approvalOnly: true });
  return NextResponse.json(activeSources);
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
