import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KEY_COOKIE,cookieOptions } from "@/lib/credentials";
import { validCredential } from "@/lib/validation";

export async function GET(){
  const env=validCredential(process.env.HF_CREDENTIALS?.trim());
  const jar=await cookies(), saved=validCredential(jar.get(KEY_COOKIE)?.value);
  return NextResponse.json({configured:env||saved,source:env?"server":saved?"browser":null});
}
export async function POST(req:Request){
  let b:unknown; try{b=await req.json()}catch{return NextResponse.json({ok:false,error:"Invalid JSON."},{status:400})}
  const key=b&&typeof b==="object"&&!Array.isArray(b)?(b as {key?:unknown}).key:undefined;
  if(!validCredential(key))return NextResponse.json({ok:false,error:"API key must be KEY_ID:KEY_SECRET."},{status:400});
  (await cookies()).set(KEY_COOKIE,key.trim(),cookieOptions);
  return NextResponse.json({ok:true});
}
export async function DELETE(){
  (await cookies()).set(KEY_COOKIE,"",{...cookieOptions,maxAge:0});
  return NextResponse.json({ok:true});
}
