"use client";
import {ChangeEvent,useEffect,useRef,useState} from "react";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";

type Pic={id:string,file:File,url:string};
type State="idle"|"uploading"|"queued"|"processing"|"completed"|"failed";

const SAMPLE=`Use the uploaded flyer as the exact first frame/reference. Create a cinematic luxury nightlife promo video for Instagram Reels, 9:16 vertical, 8–10 seconds, with smooth controlled motion.

Keep the person's exact face, facial structure, skin tone, hairline, eyes, nose, lips, beard, clothing, jewelry, hands, pose, and recognizable identity unchanged. Keep every flyer word spelled exactly as shown and preserve the original typography, hierarchy, logos, date, venue information, and layout.

Animate the scene with a slow cinematic camera push-in. Add subtle parallax depth between the subject, foreground elements, typography, and background. Let lights softly pulse and glow, distant lights shimmer naturally, and atmospheric haze move behind the subject without covering the face or important text.

STRICTLY AVOID face morphing, body changes, lip movement, extra fingers, extra limbs, warped hands, duplicate people, changing jewelry, changing clothing, changing text, misspelled words, moving text out of position, disappearing logos, excessive camera shake, cartoon animation, HDR, AI sharpening, plastic skin, sparks, dust, graffiti, grunge, lens flares, or covering important text.

END FRAME: settle into a clean readable composition with the subject sharp and all important flyer text readable.`;

function token(){const k="cliff-ai-client";let v=localStorage.getItem(k);if(!v){v=crypto.randomUUID();localStorage.setItem(k,v)}return v}
function safe(n:string){return n.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").slice(-100)}

export function AiFlyerStudio(){
 const [pics,setPics]=useState<Pic[]>([]);
 const [prompt,setPrompt]=useState("");
 const [ratio,setRatio]=useState("9:16");
 const [duration,setDuration]=useState(8);
 const [state,setState]=useState<State>("idle");
 const [progress,setProgress]=useState(0);
 const [message,setMessage]=useState("Upload a flyer to begin.");
 const [result,setResult]=useState("");
 const [error,setError]=useState("");
 const poll=useRef<number|null>(null);

 useEffect(()=>()=>{if(poll.current)clearInterval(poll.current)},[]);

 async function add(e:ChangeEvent<HTMLInputElement>){
  const files=Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/")).slice(0,4-pics.length);
  const next=files.map(file=>({id:crypto.randomUUID(),file,url:URL.createObjectURL(file)}));
  setPics(v=>[...v,...next].slice(0,4)); setMessage("Image ready. Add a prompt and generate."); e.target.value="";
 }
 function remove(id:string){setPics(v=>{const x=v.find(p=>p.id===id);if(x)URL.revokeObjectURL(x.url);return v.filter(p=>p.id!==id)})}

 async function readJob(id:string,client:string){
  const sb=createSupabaseBrowserClient();
  const {data,error:e}=await sb.rpc("get_ai_video_job",{p_job_id:id,p_client_token:client});
  if(e){setError(e.message);return}
  const row=Array.isArray(data)?data[0]:data;if(!row)return;
  const s=String(row.status||"queued") as State;setState(s);setProgress(Number(row.progress||0));
  if(s==="queued")setMessage("Queued for the AI engine…");
  if(s==="processing")setMessage(String(row.message||"Generating your cinematic video…"));
  if(s==="completed"){if(poll.current)clearInterval(poll.current);poll.current=null;setProgress(100);setResult(String(row.output_url||""));setMessage("Video ready.")}
  if(s==="failed"){if(poll.current)clearInterval(poll.current);poll.current=null;setError(String(row.error||"Generation failed."));setMessage("Generation failed.")}
 }

 async function generate(){
  if(!pics.length||!prompt.trim())return;
  setError("");setResult("");setState("uploading");setProgress(3);setMessage("Uploading your flyer…");
  try{
   const sb=createSupabaseBrowserClient(),client=token(),id=crypto.randomUUID(),urls:string[]=[];
   for(let i=0;i<pics.length;i++){
    const p=pics[i],path=`${client}/${id}/${i+1}-${safe(p.file.name)}`;
    const {error:e}=await sb.storage.from("ai-video-assets").upload(path,p.file,{contentType:p.file.type,upsert:false});
    if(e)throw e;
    urls.push(sb.storage.from("ai-video-assets").getPublicUrl(path).data.publicUrl);
   }
   setProgress(10);setMessage("Sending your prompt to the AI engine…");
   const {error:e}=await sb.rpc("create_ai_video_job",{p_job_id:id,p_client_token:client,p_prompt:prompt.trim(),p_mode:"flyer-image-to-video",p_settings:{ratio,duration,preserve_text:true,preserve_identity:true},p_inputs:urls});
   if(e)throw e;
   setState("queued");setProgress(12);setMessage("Queued for the AI engine…");
   await readJob(id,client);
   poll.current=window.setInterval(()=>void readJob(id,client),4000);
  }catch(c){setState("failed");setError(c instanceof Error?c.message:String(c));setMessage("Could not start generation.")}
 }

 const busy=["uploading","queued","processing"].includes(state);
 return <main className="ai-studio-page">
  <header className="ai-topbar"><div><b>CLIFF AI VIDEO</b><small>UPLOAD • PROMPT • GENERATE</small></div><span>FLYER → VIDEO</span></header>
  <section className="ai-shell">
   <div className="ai-heading"><p>AI FLYER-TO-VIDEO</p><h1>Upload. Prompt. Generate.</h1><span>Your flyer becomes a cinematic promo video.</span></div>
   <section className="ai-card">
    <div className="ai-section">
     <div className="ai-section-title"><b>1. UPLOAD</b><span>{pics.length}/4</span></div>
     <label className="ai-upload"><input type="file" accept="image/*" multiple onChange={add}/><div>+</div><strong>UPLOAD FLYER / REFERENCES</strong><small>Phone or computer</small></label>
     {pics.length>0&&<div className="ai-thumbs">{pics.map((p,i)=><div className="ai-thumb" key={p.id}><img src={p.url} alt="Reference"/><span>{i===0?"MAIN":`REF ${i+1}`}</span><button onClick={()=>remove(p.id)}>×</button></div>)}</div>}
    </div>
    <div className="ai-section">
     <div className="ai-section-title"><b>2. PROMPT</b><button className="ai-example" onClick={()=>setPrompt(SAMPLE)}>USE EXAMPLE</button></div>
     <textarea className="ai-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} rows={12} placeholder="Describe exactly how the flyer should move: camera movement, parallax, lights, haze, object motion, text locks, ending frame…"/>
    </div>
    <div className="ai-section">
     <div className="ai-controls">
      <div><label>FORMAT</label><select value={ratio} onChange={e=>setRatio(e.target.value)}><option>9:16</option><option>16:9</option><option>1:1</option><option>3:4</option></select></div>
      <div><label>LENGTH</label><select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={5}>5 sec</option><option value={8}>8 sec</option><option value={10}>10 sec</option></select></div>
      <div className="ai-lock"><label>LOCKS</label><span>FACE + TEXT + LAYOUT</span></div>
     </div>
     <button className="ai-generate" disabled={busy||!pics.length||!prompt.trim()} onClick={()=>void generate()}>{busy?"GENERATING…":"GENERATE VIDEO"}</button>
     {(busy||state==="completed")&&<><div className="ai-progress-label"><span>{message}</span><b>{progress}%</b></div><div className="ai-progress"><div style={{width:`${Math.max(progress,2)}%`}}/></div></>}
     {error&&<div className="ai-error">{error}</div>}
    </div>
   </section>
   {result&&<section className="ai-result"><div><p>FINISHED</p><h2>Your video is ready.</h2></div><video src={result} controls playsInline/><a href={result} target="_blank" rel="noreferrer" download>DOWNLOAD VIDEO</a></section>}
  </section>
 </main>
}
