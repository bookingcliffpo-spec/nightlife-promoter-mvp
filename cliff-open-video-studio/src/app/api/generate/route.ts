import { NextResponse } from "next/server";
import { credentials } from "@/lib/credentials";
import { submit } from "@/lib/higgsfield";
import { parseGenerationInput } from "@/lib/validation";

export async function POST(req:Request){
  const key=await credentials();
  if(!key)return NextResponse.json({ok:false,code:"missing_credentials",error:"Add your Higgsfield API key first."},{status:401});
  let input; try{input=parseGenerationInput(await req.json())}catch(e){return NextResponse.json({ok:false,code:"invalid_input",error:e instanceof Error?e.message:"Invalid request."},{status:400})}
  const r=await submit(key,input);
  return r.ok?NextResponse.json({ok:true,...r.data}):NextResponse.json(r,{status:r.status});
}
