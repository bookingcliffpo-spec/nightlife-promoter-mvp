"use client";
import { useEffect,useState } from "react";

type Run={id:string;prompt:string;status:string;videoUrl?:string;error?:string;requestId?:string};

export function Studio(){
  const [prompt,setPrompt]=useState("");
  const [ratio,setRatio]=useState("9:16");
  const [duration,setDuration]=useState(5);
  const [resolution,setResolution]=useState("720p");
  const [format,setFormat]=useState("mp4");
  const [audio,setAudio]=useState(true);
  const [imageUrl,setImageUrl]=useState("");
  const [endImageUrl,setEndImageUrl]=useState("");
  const [runs,setRuns]=useState<Run[]>([]);
  const [keyOpen,setKeyOpen]=useState(false);
  const [apiKey,setApiKey]=useState("");
  const [keyReady,setKeyReady]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function refreshKey(){
    try{const r=await fetch("/api/key",{cache:"no-store"});const j=await r.json();setKeyReady(Boolean(j.configured))}catch{setKeyReady(false)}
  }
  useEffect(()=>{void refreshKey();const raw=localStorage.getItem("cliff-video-runs");if(raw)try{setRuns(JSON.parse(raw))}catch{}},[]);
  useEffect(()=>{localStorage.setItem("cliff-video-runs",JSON.stringify(runs.slice(0,50)))},[runs]);

  function patch(id:string,p:Partial<Run>){setRuns(v=>v.map(x=>x.id===id?{...x,...p}:x))}
  async function poll(id:string,requestId:string){
    for(let i=0;i<150;i++){
      await new Promise(r=>setTimeout(r,4000));
      const res=await fetch("/api/status/"+encodeURIComponent(requestId),{cache:"no-store"});
      const j=await res.json();
      if(!res.ok||!j.ok){patch(id,{status:"failed",error:j.error||"Status check failed."});return}
      if(j.status==="completed"&&j.videoUrl){patch(id,{status:"completed",videoUrl:j.videoUrl});return}
      if(["failed","nsfw","canceled"].includes(j.status)){patch(id,{status:"failed",error:j.error||("Generation ended: "+j.status)});return}
      patch(id,{status:"running"});
    }
    patch(id,{status:"failed",error:"Generation timed out."});
  }
  async function generate(){
    setError("");
    if(!prompt.trim())return setError("Enter a prompt.");
    if(!keyReady){setKeyOpen(true);return setError("Add your Higgsfield API key first.");}
    setBusy(true);
    const id=crypto.randomUUID();
    setRuns(v=>[{id,prompt:prompt.trim(),status:"queued"},...v]);
    try{
      const res=await fetch("/api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,duration,resolution,aspectRatio:ratio,outputFormat:format,generateAudio:audio,imageUrl:imageUrl||undefined,endImageUrl:endImageUrl||undefined})});
      const j=await res.json();
      if(!res.ok||!j.ok){patch(id,{status:"failed",error:j.error||"Generation failed."});setError(j.error||"Generation failed.");if(res.status===401)setKeyOpen(true);return}
      patch(id,{status:"running",requestId:j.requestId});void poll(id,j.requestId);
    }catch{patch(id,{status:"failed",error:"Could not reach the studio API."});setError("Could not reach the studio API.");}
    finally{setBusy(false)}
  }
  async function saveKey(){
    setError("");
    const res=await fetch("/api/key",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key:apiKey})});
    const j=await res.json();
    if(!res.ok||!j.ok)return setError(j.error||"Could not save key.");
    setApiKey("");setKeyOpen(false);await refreshKey();
  }

  return <main>
    <header>
      <div><b>CLIFF OPEN VIDEO STUDIO</b><small>FREE + OPEN SOURCE APP</small></div>
      <button className={keyReady?"key ready":"key"} onClick={()=>setKeyOpen(true)}>{keyReady?"API KEY READY":"ADD API KEY"}</button>
    </header>

    <section className="gallery">
      {runs.length===0?<div className="empty"><h1>Your video runs land here</h1><p>Seedance 2.5 text-to-video and image-to-video.</p></div>:
      <div className="grid">{runs.map(r=><article key={r.id}>
        <div className="media">{r.videoUrl?<video src={r.videoUrl} controls playsInline/>:<span>{r.status}</span>}</div>
        <p>{r.prompt}</p>
        {r.error&&<div className="err">{r.error}</div>}
        {r.videoUrl&&<a href={r.videoUrl} target="_blank" rel="noreferrer">OPEN / DOWNLOAD</a>}
      </article>)}</div>}
    </section>

    <section className="dock">
      {error&&<div className="banner">{error}<button onClick={()=>setError("")}>×</button></div>}
      <div className="composer">
        <div className="settings">
          <b>Seedance 2.5</b>
          <select value={ratio} onChange={e=>setRatio(e.target.value)}>{["9:16","16:9","1:1","3:4","4:3","21:9"].map(x=><option key={x}>{x}</option>)}</select>
          <select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[4,5,6,8,10,15,20,30].map(x=><option key={x} value={x}>{x}s</option>)}</select>
          <select value={resolution} onChange={e=>setResolution(e.target.value)}><option>720p</option><option>480p</option></select>
          <select value={format} onChange={e=>setFormat(e.target.value)}><option>mp4</option><option>mov</option></select>
          <label><input type="checkbox" checked={audio} onChange={e=>setAudio(e.target.checked)}/> Audio</label>
        </div>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe camera movement, subject motion, lighting, atmosphere and end frame..." onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter")void generate()}}/>
        <div className="urls">
          <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Optional public start-image URL"/>
          {imageUrl&&<input value={endImageUrl} onChange={e=>setEndImageUrl(e.target.value)} placeholder="Optional public end-image URL"/>}
        </div>
        <div className="foot"><span>APP CODE IS FREE. HIGGSFIELD API GENERATION MAY REQUIRE CREDITS.</span><button className="generate" disabled={busy} onClick={()=>void generate()}>{busy?"SUBMITTING…":"GENERATE"}</button></div>
      </div>
    </section>

    {keyOpen&&<div className="modalbg" onMouseDown={e=>{if(e.currentTarget===e.target)setKeyOpen(false)}}><div className="modal">
      <button className="x" onClick={()=>setKeyOpen(false)}>×</button>
      <h2>Higgsfield API key</h2><p>Stored in an httpOnly cookie and sent only by the server. Never committed to GitHub.</p>
      <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="KEY_ID:KEY_SECRET"/>
      <button className="save" onClick={()=>void saveKey()}>SAVE KEY</button>
      <small>Rotate any key that has already been pasted into a chat or public location.</small>
    </div></div>}
  </main>
}
