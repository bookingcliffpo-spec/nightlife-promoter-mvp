"use client";

import { useMemo, useState } from "react";

type Tool = {
  id: string;
  name: string;
  group: "CREATE" | "EDIT" | "GENJUTSU" | "REFERENCE";
  model: string;
  description: string;
  requires?: string;
};

const TOOLS: Tool[] = [
  { id:"text-video", name:"Text → Video", group:"CREATE", model:"ltx2_25_22B_distilled", description:"Generate synchronized cinematic video and sound from a text prompt." },
  { id:"image-video", name:"Image → Video", group:"CREATE", model:"minimax_h3_fl2va_pruned", description:"Animate a start image while preserving its subject and composition.", requires:"Start image" },
  { id:"start-end", name:"Start + End Frame", group:"CREATE", model:"minimax_h3_fl2va_pruned", description:"Guide a shot from an opening frame to a chosen ending frame.", requires:"Start + end image" },
  { id:"reference-video", name:"Reference → Video", group:"REFERENCE", model:"minimax_h3_ref2va_pruned", description:"Use image, video, or audio references to guide identity, style, motion, and sound.", requires:"Reference media" },
  { id:"multi-subject", name:"Multi-Subject Reference", group:"REFERENCE", model:"ltx2_25_22B_msr", description:"Keep several people, products, or objects consistent in one generation.", requires:"1–5 references" },
  { id:"extend", name:"Video Extend", group:"CREATE", model:"ltx2_25_22B_distilled", description:"Continue a generated clip forward with a matching cinematic prompt.", requires:"Source video" },
  { id:"video-edit", name:"Video Edit", group:"EDIT", model:"ltx2_22B_distilled_1_1_edit_anything", description:"Edit an existing clip using a source video plus a reference image.", requires:"Source video + reference" },
  { id:"regional-edit", name:"Regional Edit / Inpaint", group:"EDIT", model:"minimax_h3_control_pruned", description:"Change one masked region while keeping the surrounding shot stable.", requires:"Video + mask" },
  { id:"motion-transfer", name:"Motion Transfer", group:"GENJUTSU", model:"minimax_h3_control_pruned", description:"Follow motion, pose, depth, edges, or shape from a control video.", requires:"Control video" },
  { id:"character-swap", name:"Character Swap", group:"GENJUTSU", model:"ltx2_22B_distilled_1_1_edit_anything", description:"Replace the subject while preserving scene timing and camera motion.", requires:"Source video + character reference" },
  { id:"object-swap", name:"Object / Product Swap", group:"GENJUTSU", model:"ltx2_22B_distilled_1_1_edit_anything", description:"Replace an object or product while maintaining the original shot.", requires:"Source video + product reference" },
  { id:"wardrobe-swap", name:"Wardrobe Swap", group:"GENJUTSU", model:"ltx2_22B_distilled_1_1_edit_anything", description:"Change clothing while preserving identity, body motion, and scene timing.", requires:"Source video + clothing reference" },
  { id:"location-swap", name:"Location Swap", group:"GENJUTSU", model:"ltx2_22B_distilled_1_1_edit_anything", description:"Move the action into a new environment while retaining performance and camera.", requires:"Source video + location reference" },
  { id:"style-transfer", name:"Style Transfer", group:"GENJUTSU", model:"minimax_h3_control_pruned", description:"Keep motion structure while changing the visual treatment and atmosphere.", requires:"Source/control video" }
];

const ratios: Record<string,string> = {
  "16:9":"1280x704",
  "9:16":"704x1280",
  "1:1":"960x960",
  "3:4":"832x1104",
  "4:3":"1104x832"
};

const presets = {
  genre:["General","Action","Epic","Drama","Comedy","Horror","Noir","Music Video","Nightlife"],
  era:["2020s","2010s","2000s","1990s","1980s","1970s","1960s"],
  camera:["Cinema Camera","35mm Film","8mm Film","DV Camcorder","Handheld Documentary","Robot Arm","Drone / Helicopter"],
  lens:["24mm Wide","35mm","50mm Natural","85mm Portrait","100mm Macro","Anamorphic"],
  move:["Static","Slow Push-In","Slow Pull-Out","Pan Left","Pan Right","Orbit","Tracking Shot","Crane Up","Crane Down","Dolly Zoom","POV"],
  lighting:["Natural","Soft Beauty","Neon Night","High Contrast","Golden Hour","Moonlight","Club Lighting","Practical Lights","Silhouette"],
  tempo:["Slow","Measured","Medium","Fast","Chaotic"]
};

export function FreeCinematicSuite(){
  const [toolId,setToolId]=useState("text-video");
  const [prompt,setPrompt]=useState("A premium cinematic nightlife scene with realistic people, natural skin texture, confident movement, rich practical lighting, and polished commercial camera work.");
  const [genre,setGenre]=useState("Nightlife");
  const [era,setEra]=useState("2020s");
  const [camera,setCamera]=useState("Cinema Camera");
  const [lens,setLens]=useState("50mm Natural");
  const [move,setMove]=useState("Slow Push-In");
  const [lighting,setLighting]=useState("Club Lighting");
  const [tempo,setTempo]=useState("Measured");
  const [ratio,setRatio]=useState("9:16");
  const [duration,setDuration]=useState(5);
  const [audio,setAudio]=useState(true);
  const [copied,setCopied]=useState("");
  const tool=TOOLS.find(t=>t.id===toolId)!;

  const cinematicPrompt=useMemo(()=>{
    const sound=audio
      ? "Synchronized natural ambience, realistic foley, and cinematic sound design matched precisely to the visible action."
      : "No generated soundtrack; prioritize clean visual continuity.";
    return [
      prompt.trim(),
      "Genre: " + genre + ". Era: " + era + ".",
      "Camera: " + camera + ", " + lens + ", " + move + ". Editing tempo: " + tempo + ".",
      "Lighting: " + lighting + ". Preserve physically believable motion, stable anatomy, coherent hands and faces, natural skin texture, consistent identity, accurate reflections, and realistic depth of field.",
      "Composition: " + ratio + ", cinematic blocking, clear subject separation, controlled highlights, no random objects, no warped text, no duplicate subjects, no sudden camera jumps.",
      sound
    ].filter(Boolean).join("\n");
  },[prompt,genre,era,camera,lens,move,tempo,lighting,ratio,audio]);

  async function copy(label:string,value:string){
    try{await navigator.clipboard.writeText(value);setCopied(label);setTimeout(()=>setCopied(""),1600)}catch{}
  }

  function exportJob(){
    const job={
      model_type:tool.model,
      prompt:cinematicPrompt,
      resolution:ratios[ratio],
      video_length:String(duration)+"s",
      cliff_tool:tool.id,
      cliff_tool_name:tool.name,
      required_media:tool.requires||null,
      generate_audio:audio,
      notes:"Import this settings JSON into the local WanGP workflow. Complex edit/reference tools require the media listed in required_media."
    };
    const blob=new Blob([JSON.stringify(job,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="cliff-"+tool.id+"-job.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  return <main className="cinema-page">
    <header className="cinema-topbar">
      <div><b>CLIFF FREE CINEMATIC STUDIO</b><small>WANGP LOCAL ENGINE • NO API CREDITS</small></div>
      <div className="top-actions"><a href="/motion">MOTION TOOL</a><span>FREE LOCAL AI</span></div>
    </header>

    <section className="cinema-shell">
      <section className="cinema-hero">
        <p className="eyebrow">OPEN GENERATION SUITE</p>
        <h1>Higgsfield-style creative tools without a credit meter.</h1>
        <p>Build prompts here, then render with the included WanGP models on your own GPU. The public site is the creative front end; the heavy AI generation stays local so there is no per-video API charge.</p>
        <div className="hero-buttons">
          <a className="primary-action" href="http://127.0.0.1:7860" target="_blank" rel="noreferrer">OPEN LOCAL GENERATOR</a>
          <button className="secondary-button" onClick={()=>void copy("prompt",cinematicPrompt)}>{copied==="prompt"?"PROMPT COPIED":"COPY CINEMATIC PROMPT"}</button>
        </div>
      </section>

      <section className="cinema-workspace">
        <div className="tool-sidebar">
          <div className="sidebar-title"><b>TOOLS</b><span>{TOOLS.length} local workflows</span></div>
          {(["CREATE","REFERENCE","EDIT","GENJUTSU"] as const).map(group=><div className="tool-group" key={group}>
            <label>{group}</label>
            {TOOLS.filter(t=>t.group===group).map(t=><button key={t.id} className={toolId===t.id?"selected":""} onClick={()=>setToolId(t.id)}>
              <span>{t.name}</span><small>{t.model.replaceAll("_"," ")}</small>
            </button>)}
          </div>)}
        </div>

        <div className="prompt-studio">
          <div className="selected-tool">
            <div><span>{tool.group}</span><h2>{tool.name}</h2><p>{tool.description}</p></div>
            <div className="model-chip"><small>LOCAL MODEL</small><b>{tool.model}</b>{tool.requires&&<em>Needs: {tool.requires}</em>}</div>
          </div>

          <div className="prompt-box">
            <div className="prompt-label"><b>PROMPT</b><span>Describe the scene, subject, action, emotion, environment and ending.</span></div>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={8} />
          </div>

          <div className="director-panel">
            <div className="director-head"><b>DIRECTOR PANEL</b><span>Cinematic controls are folded directly into your final prompt.</span></div>
            <div className="director-grid">
              <Select label="GENRE" value={genre} set={setGenre} options={presets.genre}/>
              <Select label="ERA" value={era} set={setEra} options={presets.era}/>
              <Select label="CAMERA" value={camera} set={setCamera} options={presets.camera}/>
              <Select label="LENS" value={lens} set={setLens} options={presets.lens}/>
              <Select label="CAMERA MOVE" value={move} set={setMove} options={presets.move}/>
              <Select label="LIGHTING" value={lighting} set={setLighting} options={presets.lighting}/>
              <Select label="TEMPO" value={tempo} set={setTempo} options={presets.tempo}/>
              <Select label="ASPECT" value={ratio} set={setRatio} options={Object.keys(ratios)}/>
              <div className="director-control"><label>DURATION</label><select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[4,5,6,8,10,15,20,30].map(v=><option key={v} value={v}>{v} seconds</option>)}</select></div>
              <div className="director-control audio-control"><label>AUDIO</label><button className={audio?"on":""} onClick={()=>setAudio(v=>!v)}>{audio?"GENERATE SYNC AUDIO":"VISUAL ONLY"}</button></div>
            </div>
          </div>

          <div className="compiled-prompt">
            <div><b>COMPILED CINEMATIC PROMPT</b><button onClick={()=>void copy("compiled",cinematicPrompt)}>{copied==="compiled"?"COPIED":"COPY"}</button></div>
            <pre>{cinematicPrompt}</pre>
          </div>

          <div className="generate-row">
            <button className="export-job" onClick={exportJob}>DOWNLOAD WANGP JOB JSON</button>
            <a className="open-local" href="http://127.0.0.1:7860" target="_blank" rel="noreferrer">OPEN LOCAL GENERATOR →</a>
          </div>
        </div>
      </section>

      <section className="capability-section">
        <div className="section-title"><p className="eyebrow">FULL TOOL MAP</p><h2>Create, reference, edit and transfer motion.</h2><p>Each module points to a real local WanGP model/workflow rather than a paid cloud endpoint.</p></div>
        <div className="capability-grid">{TOOLS.map(t=><article key={t.id}>
          <span>{t.group}</span><h3>{t.name}</h3><p>{t.description}</p><small>{t.requires?"INPUT: "+t.requires:"TEXT PROMPT"}</small>
          <button onClick={()=>{setToolId(t.id);window.scrollTo({top:430,behavior:"smooth"})}}>USE TOOL</button>
        </article>)}</div>
      </section>

      <section className="local-note">
        <div><b>WHY THIS IS ACTUALLY FREE</b><p>The site does not send generations to Higgsfield. WanGP downloads open model weights and runs them on your own computer. That removes the API-credit bill, but your GPU, storage, electricity and model-download bandwidth are still real resources.</p></div>
        <a href="https://github.com/bookingcliffpo-spec/nightlife-promoter-mvp" target="_blank" rel="noreferrer">VIEW SOURCE</a>
      </section>
    </section>
  </main>
}

function Select({label,value,set,options}:{label:string;value:string;set:(v:string)=>void;options:string[]}){
  return <div className="director-control"><label>{label}</label><select value={value} onChange={e=>set(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></div>
}
