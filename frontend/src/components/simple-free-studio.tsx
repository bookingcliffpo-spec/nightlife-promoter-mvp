"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type Asset = {
  id: string;
  file: File;
  url: string;
  img: HTMLImageElement;
};

type Motion = "push" | "pull" | "pan-left" | "pan-right" | "rise" | "float";

const RATIOS: Record<string,{w:number;h:number}> = {
  "9:16": {w:720,h:1280},
  "16:9": {w:1280,h:720},
  "1:1": {w:900,h:900},
  "3:4": {w:720,h:960},
  "4:3": {w:960,h:720}
};

function pickMotion(prompt:string):Motion {
  const p=prompt.toLowerCase();
  if(/zoom out|pull out|reveal/.test(p)) return "pull";
  if(/pan left|move left/.test(p)) return "pan-left";
  if(/pan right|move right/.test(p)) return "pan-right";
  if(/rise|crane up|tilt up|move up/.test(p)) return "rise";
  if(/float|dream|gentle|soft/.test(p)) return "float";
  return "push";
}

function supportedMime(){
  if(typeof MediaRecorder==="undefined") return "";
  const types=[
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  return types.find(t=>MediaRecorder.isTypeSupported(t))||"";
}

function ease(t:number){ return t*t*(3-2*t); }

export function SimpleFreeStudio(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [assets,setAssets]=useState<Asset[]>([]);
  const [prompt,setPrompt]=useState("");
  const [ratio,setRatio]=useState("9:16");
  const [duration,setDuration]=useState(8);
  const [strength,setStrength]=useState(55);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState("");
  const [resultType,setResultType]=useState("");
  const [error,setError]=useState("");

  const motion=useMemo(()=>pickMotion(prompt),[prompt]);

  async function onFiles(e:ChangeEvent<HTMLInputElement>){
    const files=Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/")).slice(0,8);
    if(!files.length) return;
    const loaded=await Promise.all(files.map(file=>new Promise<Asset>((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>resolve({id:crypto.randomUUID(),file,url,img});
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not open "+file.name));};
      img.src=url;
    })));
    setAssets(current=>[...current,...loaded].slice(0,8));
    setError("");
    e.target.value="";
  }

  function remove(id:string){
    setAssets(current=>{
      const target=current.find(a=>a.id===id);
      if(target) URL.revokeObjectURL(target.url);
      return current.filter(a=>a.id!==id);
    });
  }

  function clearAll(){
    assets.forEach(a=>URL.revokeObjectURL(a.url));
    setAssets([]);
  }

  function drawImage(ctx:CanvasRenderingContext2D, asset:Asset, localT:number, index:number){
    const canvas=ctx.canvas;
    const img=asset.img;
    const t=ease(Math.max(0,Math.min(1,localT)));
    const s=strength/100;
    const m=index%2===0?motion:(motion==="pan-left"?"pan-right":motion==="pan-right"?"pan-left":motion);

    let scale=1.04;
    let tx=0,ty=0;
    if(m==="push") scale=1.03+t*(0.08+0.10*s);
    if(m==="pull") scale=1.18+0.06*s-t*(0.11+0.08*s);
    if(m==="pan-left"){scale=1.13+0.05*s;tx=(0.05+0.05*s)*canvas.width*(0.5-t);}
    if(m==="pan-right"){scale=1.13+0.05*s;tx=(0.05+0.05*s)*canvas.width*(t-0.5);}
    if(m==="rise"){scale=1.11+0.04*s;ty=(0.05+0.05*s)*canvas.height*(0.5-t);}
    if(m==="float"){
      scale=1.04+t*(0.03+0.04*s);
      tx=Math.sin(t*Math.PI*2)*canvas.width*0.008*s;
      ty=Math.sin(t*Math.PI)*-canvas.height*0.012*s;
    }

    const base=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
    const dw=img.naturalWidth*base*scale;
    const dh=img.naturalHeight*base*scale;
    ctx.drawImage(img,canvas.width/2-dw/2+tx,canvas.height/2-dh/2+ty,dw,dh);
  }

  function drawFrame(ctx:CanvasRenderingContext2D,t:number){
    const canvas=ctx.canvas;
    ctx.fillStyle="#000";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if(!assets.length) return;
    const count=assets.length;
    const segment=1/count;
    const index=Math.min(count-1,Math.floor(t/segment));
    const local=(t-index*segment)/segment;
    const fade=0.16;

    ctx.save();
    ctx.globalAlpha=1;
    drawImage(ctx,assets[index],local,index);
    ctx.restore();

    if(count>1 && local>1-fade && index<count-1){
      const alpha=(local-(1-fade))/fade;
      ctx.save();
      ctx.globalAlpha=alpha;
      drawImage(ctx,assets[index+1],0,index+1);
      ctx.restore();
    }

    const p=prompt.toLowerCase();
    if(/cinematic|movie|film/.test(p)){
      const g=ctx.createLinearGradient(0,0,0,canvas.height);
      g.addColorStop(0,"rgba(0,0,0,.08)");
      g.addColorStop(.7,"rgba(0,0,0,0)");
      g.addColorStop(1,"rgba(0,0,0,.12)");
      ctx.fillStyle=g;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  }

  async function generate(){
    if(!assets.length){setError("Upload at least one image.");return;}
    const canvas=canvasRef.current;
    if(!canvas||typeof MediaRecorder==="undefined"||!("captureStream" in canvas)){
      setError("This browser cannot export video here. Try current Safari, Chrome, or Edge.");
      return;
    }
    const mime=supportedMime();
    if(!mime){setError("This browser does not expose a supported video format.");return;}

    if(result) URL.revokeObjectURL(result);
    setResult("");
    setError("");
    setBusy(true);
    setProgress(0);

    const size=RATIOS[ratio]||RATIOS["9:16"];
    canvas.width=size.w;canvas.height=size.h;
    const ctx=canvas.getContext("2d",{alpha:false});
    if(!ctx){setBusy(false);setError("Canvas is unavailable.");return;}

    const stream=canvas.captureStream(30);
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:size.w*size.h>900000?8_000_000:5_000_000});
    const chunks:BlobPart[]=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const finished=new Promise<Blob>((resolve,reject)=>{
      recorder.onerror=()=>reject(new Error("Recorder failed."));
      recorder.onstop=()=>resolve(new Blob(chunks,{type:mime.split(";")[0]}));
    });

    recorder.start(250);
    const start=performance.now();
    const total=duration*1000;

    await new Promise<void>(resolve=>{
      const frame=(now:number)=>{
        const t=Math.min(1,(now-start)/total);
        drawFrame(ctx,t);
        setProgress(Math.round(t*100));
        if(t<1) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });

    await new Promise(r=>setTimeout(r,120));
    recorder.stop();

    try{
      const blob=await finished;
      setResult(URL.createObjectURL(blob));
      setResultType(blob.type);
      setProgress(100);
    }catch{
      setError("The browser could not finish the video file.");
    }finally{
      stream.getTracks().forEach(t=>t.stop());
      setBusy(false);
    }
  }

  const ext=resultType.includes("mp4")?"mp4":"webm";

  return <main className="simple-page">
    <header className="simple-header">
      <b>CLIFF VIDEO</b>
      <span>FREE • NO ACCOUNT • NO CREDITS</span>
    </header>

    <section className="simple-wrap">
      <div className="simple-title">
        <h1>Upload. Prompt. Generate.</h1>
        <p>Choose your photos, describe the video you want, then press Generate.</p>
      </div>

      <section className="simple-card">
        <div className="simple-step">
          <label className="step-number">1</label>
          <div className="step-body">
            <div className="step-head"><b>UPLOAD IMAGES</b><span>{assets.length}/8</span></div>
            <label className="simple-upload">
              <input type="file" accept="image/*" multiple onChange={onFiles}/>
              <span>+</span>
              <strong>ADD PHOTOS</strong>
              <small>FROM PHONE OR COMPUTER</small>
            </label>
            {assets.length>0&&<div className="asset-strip">
              {assets.map(a=><div className="asset-thumb" key={a.id}>
                <img src={a.url} alt="Uploaded"/>
                <button onClick={()=>remove(a.id)}>×</button>
              </div>)}
              <button className="clear-assets" onClick={clearAll}>CLEAR</button>
            </div>}
          </div>
        </div>

        <div className="simple-step">
          <label className="step-number">2</label>
          <div className="step-body">
            <div className="step-head"><b>PROMPT</b><span>{motion.replace("-"," ")}</span></div>
            <textarea
              value={prompt}
              onChange={e=>setPrompt(e.target.value)}
              placeholder="Example: Slow cinematic push-in, smooth luxury camera movement, nightclub atmosphere, realistic lighting..."
            />
          </div>
        </div>

        <div className="simple-step">
          <label className="step-number">3</label>
          <div className="step-body">
            <div className="simple-settings">
              <div><label>FORMAT</label><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.keys(RATIOS).map(r=><option key={r}>{r}</option>)}</select></div>
              <div><label>LENGTH</label><select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[5,8,10,15].map(d=><option key={d} value={d}>{d}s</option>)}</select></div>
              <div><label>MOTION</label><select value={strength} onChange={e=>setStrength(Number(e.target.value))}><option value={30}>Subtle</option><option value={55}>Medium</option><option value={80}>Strong</option></select></div>
            </div>
            <button className="simple-generate" disabled={busy||!assets.length} onClick={()=>void generate()}>
              {busy?"GENERATING "+progress+"%":"GENERATE VIDEO"}
            </button>
            {busy&&<div className="simple-progress"><div style={{width:progress+"%"}}/></div>}
            {error&&<div className="simple-error">{error}</div>}
          </div>
        </div>
      </section>

      <canvas ref={canvasRef} className="hidden-canvas"/>

      {result&&<section className="simple-result">
        <div><b>YOUR VIDEO IS READY</b><span>Preview it and save it to your device.</span></div>
        <video src={result} controls playsInline/>
        <a href={result} download={"cliff-video."+ext}>DOWNLOAD VIDEO</a>
      </section>}

      <p className="simple-note">This free version creates cinematic motion from your uploaded images directly in your browser. No API key, login, or generation credits are used.</p>
    </section>
  </main>
}
