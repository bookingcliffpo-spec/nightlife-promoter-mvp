import { cookies } from "next/headers";
import { validCredential } from "./validation";

export const KEY_COOKIE="cliff_hf_key";
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:60*60*24*30};

export async function credentials(): Promise<string|null> {
  const env=process.env.HF_CREDENTIALS?.trim();
  if (validCredential(env)) return env;
  const value=(await cookies()).get(KEY_COOKIE)?.value;
  return validCredential(value)?value:null;
}
