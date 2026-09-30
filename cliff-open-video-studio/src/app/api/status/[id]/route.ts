import { NextResponse } from "next/server";
import { credentials } from "@/lib/credentials";
import { status } from "@/lib/higgsfield";

export async function GET(_req:Request,ctx:{params:Promise<{id:string}>}){
  const key=await credentials();
  if(!key)return NextResponse.json({ok:false,code:"missing_credentials",error:"Add your Higgsfield API key first."},{status:401});
  const {id}=await ctx.params;
  if(!id||id.length>200)return NextResponse.json({ok:false,error:"Invalid request ID."},{status:400});
  const r=await status(key,id);
  return r.ok?NextResponse.json({ok:true,...r.data}):NextResponse.json(r,{status:r.status});
}
