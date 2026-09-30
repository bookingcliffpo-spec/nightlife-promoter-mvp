import { NextResponse } from "next/server";
import { validCredential } from "@/lib/validation";
export async function GET(){
  return NextResponse.json({
    providerConfigured:validCredential(process.env.HF_CREDENTIALS?.trim()),
    uploadStorageConfigured:Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
  });
}
