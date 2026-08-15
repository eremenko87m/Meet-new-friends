const STORAGE_KEY = 'exerciseLibraryStateV2';
const SECTION_ORDER = [
  ['listening','Listening','listening.html'],
  ['reading-1','Reading 1','reading-1.html'],
  ['reading-2','Reading 2','reading-2.html'],
  ['writing','Writing','writing.html'],
  ['speaking-1','Speaking 1','speaking-1.html'],
  ['speaking-2','Speaking 2','speaking-2.html'],
  ['speaking-3','Speaking 3','speaking-3.html']
];

const ACTIVE_TIMER_HANDLES = new Map();

function installEnhancementStyles(){
  if(document.querySelector('#exerciseLibraryEnhancementStyles')) return;
  const style=document.createElement('style');
  style.id='exerciseLibraryEnhancementStyles';
  style.textContent=`
    .card-media{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--accent-soft),#fff)}
    .card-image-preview{position:absolute;inset:0;width:100%;height:100%;border:0;padding:0;background:#fff;cursor:zoom-in;overflow:hidden;z-index:0}
    .card-image-preview img{width:100%;height:100%;object-fit:contain;object-position:center;display:block;background:#fff;transition:transform .22s ease,filter .22s ease}
    .card-image-preview:hover img{transform:scale(1.025);filter:brightness(.97)}
    .view-image-badge{position:absolute;right:12px;bottom:12px;z-index:3;display:inline-flex;align-items:center;padding:8px 11px;border-radius:999px;background:rgba(25,26,48,.82);backdrop-filter:blur(10px);color:#fff;font-size:11px;font-weight:900;box-shadow:0 8px 18px rgba(20,21,45,.18)}
    .view-image-badge::before{content:"↗";margin-right:5px}
    .card-media.has-two-images{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:#eef0f8}
    .card-media.has-two-images .card-image-preview{position:relative;inset:auto;width:100%;height:100%;min-width:0}
    .card-media.has-two-images .card-image-preview+.card-image-preview{border-left:2px solid rgba(255,255,255,.95)}
    .card-media.has-two-images .view-image-badge{right:8px;bottom:8px;padding:6px 8px;font-size:10px}
    .card-media.has-two-images .view-image-badge::before{display:none}
    body.viewer-open{overflow:hidden}
    .image-viewer{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;opacity:0;visibility:hidden;transition:opacity .18s ease,visibility .18s ease}
    .image-viewer.open{opacity:1;visibility:visible}
    .image-viewer-backdrop{position:absolute;inset:0;border:0;background:rgba(24,25,47,.72);backdrop-filter:blur(13px);cursor:zoom-out}
    .image-viewer-shell{position:relative;z-index:2;width:min(1180px,96vw);height:min(900px,92vh);display:flex;flex-direction:column;overflow:hidden;border-radius:28px;background:#f7f8fc;border:1px solid rgba(255,255,255,.72);box-shadow:0 35px 90px rgba(8,9,28,.34);transform:translateY(12px) scale(.985);transition:transform .2s ease}
    .image-viewer.open .image-viewer-shell{transform:translateY(0) scale(1)}
    .image-viewer-toolbar{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 12px 10px 20px;background:rgba(255,255,255,.94);border-bottom:1px solid rgba(35,36,59,.08)}
    .image-viewer-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:900;letter-spacing:-.02em}
    .image-viewer-tools{display:flex;align-items:center;gap:7px;flex-shrink:0}
    .viewer-tool{min-width:42px;height:42px;border:0;border-radius:13px;background:#f0f1f7;color:var(--ink);cursor:pointer;font-weight:900;font-size:20px;transition:.16s ease}
    .viewer-tool:hover{transform:translateY(-1px);background:var(--accent-soft);color:var(--accent)}
    .viewer-reset{min-width:64px;padding:0 10px;font-size:12px}.viewer-close{background:#25263d;color:#fff;font-size:24px}.viewer-close:hover{background:#171829;color:#fff}
    .image-viewer-viewport{flex:1;min-height:0;overflow:auto;display:grid;place-items:center;padding:24px;background:#edf0f6}
    .image-viewer-img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;transform-origin:center center;transition:transform .18s ease;background:#fff;box-shadow:0 18px 40px rgba(23,24,47,.16)}
    .card-timer{display:grid;grid-template-columns:auto minmax(72px,86px) 1fr auto;align-items:center;gap:7px;margin:0 0 14px;padding:9px;border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 7%,#fff),#f7f8fc);border:1px solid color-mix(in srgb,var(--accent) 12%,#e6e8f2);box-shadow:inset 0 1px 0 rgba(255,255,255,.95);transition:.2s ease}
    .timer-label{padding-left:2px;color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
    .timer-input{width:100%;min-width:0;padding:9px 8px;border:1px solid #dfe2ed;border-radius:11px;background:#fff;color:var(--ink);outline:none;text-align:center;font-variant-numeric:tabular-nums;font-size:14px;font-weight:900;letter-spacing:.03em}
    .timer-input:focus{border-color:color-mix(in srgb,var(--accent) 45%,white);box-shadow:0 0 0 3px var(--accent-soft)}
    .timer-input[readonly]{color:var(--accent);background:rgba(255,255,255,.82)}
    .timer-start-btn,.timer-reset-btn{min-height:36px;border:0;border-radius:11px;cursor:pointer;font-weight:900;transition:.16s ease}
    .timer-start-btn{padding:8px 11px;background:var(--accent);color:#fff;box-shadow:0 7px 16px color-mix(in srgb,var(--accent) 20%,transparent)}
    .timer-start-btn:hover{transform:translateY(-1px);filter:brightness(.98)}
    .timer-reset-btn{padding:8px 9px;background:#fff;color:var(--muted);border:1px solid #e3e5ef}.timer-reset-btn:hover{color:var(--accent);background:var(--accent-soft)}
    .card-timer.is-running{border-color:color-mix(in srgb,var(--accent) 32%,white);box-shadow:0 8px 20px color-mix(in srgb,var(--accent) 10%,transparent)}.card-timer.is-running .timer-label{color:var(--accent)}
    .card-timer.is-finished{background:#fff0f1;border-color:#ffc9cf}.card-timer.is-finished .timer-input,.card-timer.is-finished .timer-label{color:#ca4050}
    .exercise-card.timer-flash{animation:timerFlash .55s ease 3}@keyframes timerFlash{0%,100%{box-shadow:0 14px 34px rgba(50,52,91,.10)}50%{box-shadow:0 0 0 5px rgba(234,82,99,.16),0 24px 55px rgba(234,82,99,.24)}}
    @media(max-width:700px){.image-viewer{padding:8px}.image-viewer-shell{width:100%;height:96vh;border-radius:20px}.image-viewer-toolbar{padding-left:14px}.image-viewer-title{font-size:13px}.image-viewer-viewport{padding:12px}.viewer-tool{min-width:38px;height:38px}.viewer-reset{min-width:56px}}
    @media(max-width:590px){.card-timer{grid-template-columns:auto minmax(72px,1fr) 1fr}.timer-reset-btn{grid-column:1/-1}}
  `;
  document.head.appendChild(style);
}

const safeUrl = (value) => {
  if (!value) return '';
  try {
    const u = new URL(value, window.location.href);
    return ['http:','https:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
};

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveState(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function defaultTimer(){
  return { duration:300, remaining:300, running:false, endAt:null };
}

function cardState(state,id){
  if(!state[id]) state[id] = { students:[], complete:false, timer:defaultTimer() };
  if(!Array.isArray(state[id].students)) state[id].students=[];
  if(!state[id].timer || typeof state[id].timer !== 'object') state[id].timer=defaultTimer();

  const t=state[id].timer;
  t.duration=Number.isFinite(Number(t.duration)) ? Math.max(1,Math.round(Number(t.duration))) : 300;
  t.remaining=Number.isFinite(Number(t.remaining)) ? Math.max(0,Math.round(Number(t.remaining))) : t.duration;
  t.running=Boolean(t.running);
  t.endAt=t.endAt ? Number(t.endAt) : null;

  if(t.running && t.endAt){
    const left=Math.ceil((t.endAt-Date.now())/1000);
    if(left<=0){ t.remaining=0; t.running=false; t.endAt=null; }
    else t.remaining=left;
  }
  return state[id];
}

function toast(message){
  let node=document.querySelector('.toast');
  if(!node){ node=document.createElement('div'); node.className='toast'; document.body.appendChild(node); }
  node.textContent=message; node.classList.add('show');
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>node.classList.remove('show'),1800);
}

function el(tag, cls, text){
  const node=document.createElement(tag);
  if(cls) node.className=cls;
  if(text!==undefined) node.textContent=text;
  return node;
}

function ensureImageViewer(){
  let modal=document.querySelector('#imageViewer');
  if(modal) return modal;

  modal=el('div','image-viewer');
  modal.id='imageViewer';
  modal.setAttribute('aria-hidden','true');

  const backdrop=el('button','image-viewer-backdrop');
  backdrop.type='button';
  backdrop.setAttribute('aria-label','Close image');

  const shell=el('div','image-viewer-shell');
  const toolbar=el('div','image-viewer-toolbar');
  const title=el('div','image-viewer-title','Image');
  const tools=el('div','image-viewer-tools');
  const minus=el('button','viewer-tool','−'); minus.type='button'; minus.title='Zoom out';
  const reset=el('button','viewer-tool viewer-reset','100%'); reset.type='button'; reset.title='Reset zoom';
  const plus=el('button','viewer-tool','+'); plus.type='button'; plus.title='Zoom in';
  const close=el('button','viewer-tool viewer-close','×'); close.type='button'; close.title='Close';
  tools.append(minus,reset,plus,close);
  toolbar.append(title,tools);

  const viewport=el('div','image-viewer-viewport');
  const img=document.createElement('img');
  img.className='image-viewer-img';
  img.alt='Exercise image';
  viewport.append(img);
  shell.append(toolbar,viewport);
  modal.append(backdrop,shell);
  document.body.append(modal);

  let zoom=1;
  const applyZoom=()=>{
    img.style.transform=`scale(${zoom})`;
    reset.textContent=`${Math.round(zoom*100)}%`;
  };
  const closeViewer=()=>{
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('viewer-open');
    setTimeout(()=>{ if(!modal.classList.contains('open')) img.src=''; },180);
  };

  backdrop.addEventListener('click',closeViewer);
  close.addEventListener('click',closeViewer);
  minus.addEventListener('click',()=>{ zoom=Math.max(.5,zoom-.25); applyZoom(); });
  plus.addEventListener('click',()=>{ zoom=Math.min(3,zoom+.25); applyZoom(); });
  reset.addEventListener('click',()=>{ zoom=1; applyZoom(); });
  document.addEventListener('keydown',e=>{
    if(!modal.classList.contains('open')) return;
    if(e.key==='Escape') closeViewer();
    if(e.key==='+' || e.key==='='){ zoom=Math.min(3,zoom+.25); applyZoom(); }
    if(e.key==='-'){ zoom=Math.max(.5,zoom-.25); applyZoom(); }
  });

  modal.openImage=(src,caption)=>{
    zoom=1;
    img.src=src;
    img.alt=caption || 'Exercise image';
    title.textContent=caption || 'Exercise image';
    applyZoom();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('viewer-open');
  };
  return modal;
}

function openImageViewer(src, caption){ ensureImageViewer().openImage(src,caption); }

async function fetchData(){
  const r=await fetch(`data/exercises.json?v=${Date.now()}`, {cache:'no-store'});
  if(!r.ok) throw new Error('Could not load exercises.json');
  return r.json();
}

function updateProgress(cards,state){
  const finished=cards.filter(c=>cardState(state,c.id).complete).length;
  const total=cards.length || 40;
  const big=document.querySelector('.progress-big');
  const fill=document.querySelector('.progress-fill');
  if(big) big.textContent=`${finished} / ${total}`;
  if(fill) fill.style.width=`${Math.round((finished/total)*100)}%`;
}

function startInlineEdit(label, currentName, onSave){
  const input=document.createElement('input');
  input.type='text'; input.className='chip-edit-input'; input.value=currentName; input.maxLength=45;
  label.replaceWith(input); input.focus(); input.select();

  let finished=false;
  const finish=(commit)=>{
    if(finished) return;
    finished=true;
    const next=(input.value || '').trim();
    if(commit) onSave(next || currentName); else onSave(currentName);
  };
  input.addEventListener('blur',()=>finish(true));
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){ e.preventDefault(); finish(true); }
    if(e.key==='Escape'){ e.preventDefault(); finish(false); }
  });
}

function renderStudentPanel(card, state, doneBtn, counterEl){
  const panel=el('div','students-panel');
  const head=el('div','students-head');
  head.append(el('div','students-title','Done list'));
  head.append(el('div','students-tip','Click a name to edit it'));

  const form=el('div','student-form');
  const input=document.createElement('input');
  input.placeholder='Type student name'; input.maxLength=45;
  const add=el('button','small-btn','Add'); add.type='button';
  const list=el('div','student-list');
  form.append(input,add); panel.append(head,form,list);

  const syncCount=(n)=>{
    doneBtn.textContent=`Done${n?` · ${n}`:''}`;
    if(counterEl) counterEl.textContent=`${n} student${n===1?'':'s'}`;
  };

  const redraw=()=>{
    const s=cardState(state,card.id); list.replaceChildren();
    if(!s.students.length) list.append(el('span','empty-students','No names yet'));
    s.students.forEach((name,index)=>{
      const chip=el('span','student-chip');
      const label=el('button','student-name',name); label.type='button'; label.title='Edit name';
      const remove=el('button','student-remove','×'); remove.type='button'; remove.title='Remove';

      label.addEventListener('click',()=>{
        startInlineEdit(label,name,(updatedName)=>{
          const normalized=updatedName.trim();
          if(!normalized) s.students.splice(index,1);
          else if(!s.students.some((n,i)=>i!==index && n.toLowerCase()===normalized.toLowerCase())) s.students[index]=normalized;
          saveState(state); redraw(); syncCount(s.students.length);
        });
      });
      remove.addEventListener('click',()=>{
        s.students.splice(index,1); saveState(state); redraw(); syncCount(s.students.length);
      });
      chip.append(label,remove); list.append(chip);
    });
    syncCount(s.students.length);
  };

  const addName=()=>{
    const name=input.value.trim(); if(!name) return;
    const s=cardState(state,card.id);
    if(!s.students.some(n=>n.toLowerCase()===name.toLowerCase())) s.students.push(name);
    input.value=''; saveState(state); redraw(); toast(`${name} marked done`); input.focus();
  };

  add.addEventListener('click',addName);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addName(); } });
  redraw();
  return {panel,input};
}

function formatTime(totalSeconds){
  const s=Math.max(0,Math.round(totalSeconds));
  const min=Math.floor(s/60);
  const sec=s%60;
  return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function parseTime(value){
  const text=String(value||'').trim();
  if(/^\d+$/.test(text)) return Math.max(1,Number(text)*60);
  const match=text.match(/^(\d{1,3}):([0-5]?\d)$/);
  if(!match) return null;
  return Math.max(1,Number(match[1])*60+Number(match[2]));
}

function clearTimerHandle(id){
  const handle=ACTIVE_TIMER_HANDLES.get(id);
  if(handle){ clearInterval(handle); ACTIVE_TIMER_HANDLES.delete(id); }
}
function clearAllTimerHandles(){
  ACTIVE_TIMER_HANDLES.forEach(handle=>clearInterval(handle));
  ACTIVE_TIMER_HANDLES.clear();
}

function softBeep(){
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx) return;
    const ctx=new AudioCtx();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.frequency.value=720;
    gain.gain.setValueAtTime(.0001,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.45);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+.48);
  }catch{}
}

function renderTimer(card,state,wrap){
  const s=cardState(state,card.id);
  const timer=s.timer;
  const panel=el('div','card-timer');
  const label=el('span','timer-label','Timer');
  const input=document.createElement('input');
  input.className='timer-input'; input.type='text'; input.inputMode='numeric'; input.maxLength=6;
  const toggle=el('button','timer-start-btn',timer.running?'Pause':'Start'); toggle.type='button';
  const reset=el('button','timer-reset-btn','Reset'); reset.type='button';
  panel.append(label,input,toggle,reset);

  const calculateRemaining=()=>{
    if(timer.running && timer.endAt) return Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
    return Math.max(0,timer.remaining);
  };

  const paint=()=>{
    const remaining=calculateRemaining();
    timer.remaining=remaining;
    if(document.activeElement!==input) input.value=formatTime(remaining);
    input.readOnly=timer.running;
    toggle.textContent=timer.running?'Pause':'Start';
    panel.classList.toggle('is-running',timer.running);
    panel.classList.toggle('is-finished',!timer.running && remaining===0);

    if(timer.running && remaining<=0){
      timer.running=false; timer.endAt=null; timer.remaining=0;
      saveState(state); clearTimerHandle(card.id);
      wrap.classList.add('timer-flash');
      setTimeout(()=>wrap.classList.remove('timer-flash'),1800);
      toast(`${card.title || `Exercise ${card.no}`}: time is up`);
      softBeep();
      input.value='00:00'; toggle.textContent='Start';
      panel.classList.remove('is-running'); panel.classList.add('is-finished');
    }
  };

  const startInterval=()=>{
    clearTimerHandle(card.id);
    paint();
    if(timer.running){
      const handle=setInterval(paint,250);
      ACTIVE_TIMER_HANDLES.set(card.id,handle);
    }
  };

  const commitInput=()=>{
    if(timer.running) return;
    const parsed=parseTime(input.value);
    if(parsed===null){ input.value=formatTime(timer.remaining); toast('Use MM:SS, for example 05:00'); return; }
    timer.duration=parsed; timer.remaining=parsed; timer.endAt=null;
    saveState(state); paint();
  };

  input.addEventListener('change',commitInput);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); input.blur(); } });

  toggle.addEventListener('click',()=>{
    if(timer.running){
      timer.remaining=calculateRemaining(); timer.running=false; timer.endAt=null;
      saveState(state); clearTimerHandle(card.id); paint();
      return;
    }
    if(timer.remaining<=0) timer.remaining=timer.duration;
    timer.endAt=Date.now()+timer.remaining*1000;
    timer.running=true; saveState(state); startInterval();
  });

  reset.addEventListener('click',()=>{
    clearTimerHandle(card.id);
    timer.running=false; timer.endAt=null; timer.remaining=timer.duration;
    saveState(state); paint();
  });

  startInterval();
  return panel;
}

function createImagePreview(src,label,caption){
  const preview=el('button','card-image-preview');
  preview.type='button'; preview.title=`Open ${label}`;
  preview.setAttribute('aria-label',`Open ${label} for ${caption}`);

  const img=document.createElement('img');
  img.src=src; img.alt=`${caption} — ${label}`; img.loading='lazy';
  const badge=el('span','view-image-badge',label);
  preview.append(img,badge);
  preview.addEventListener('click',()=>openImageViewer(src,`${caption} · ${label}`));
  return preview;
}

function createCard(card,state,allCards){
  const s=cardState(state,card.id);
  const wrap=el('article','exercise-card');
  if(s.complete) wrap.classList.add('is-complete');

  const image1=safeUrl(card.image1 || card.image);
  const image2=safeUrl(card.image2);
  const images=[];
  if(image1) images.push({src:image1,label:'Image 1'});
  if(image2 && image2!==image1) images.push({src:image2,label:'Image 2'});

  if(!card.title && !card.link && !card.audio && !images.length) wrap.classList.add('is-empty');

  const media=el('div',`card-media${images.length===2?' has-two-images':''}`);
  const caption=card.title||`Exercise ${card.no}`;
  if(images.length){
    images.forEach(({src,label})=>{
      const preview=createImagePreview(src,label,caption);
      preview.querySelector('img').addEventListener('error',()=>preview.replaceWith(el('div','media-placeholder')));
      media.append(preview);
    });
  }else{
    media.append(el('div','media-placeholder'));
  }
  media.append(el('span','card-number',String(card.no).padStart(2,'0')));
  if(card.level) media.append(el('span','level-badge',card.level));

  const body=el('div','card-body');
  const topMeta=el('div','card-topline');
  const status=el('span','tiny-pill',card.active===false?'Hidden':'Active');
  const studentCounter=el('span','student-counter',`${s.students.length} student${s.students.length===1?'':'s'}`);
  topMeta.append(status,studentCounter); body.append(topMeta);
  body.append(el('div','card-accent-line'));
  body.append(el('h3','card-title',caption));
  body.append(el('p','card-note',card.notes || (card.active===false ? 'This slot is hidden in the table.' : 'Ready for a new exercise.')));

  const audio=safeUrl(card.audio);
  if(audio){
    const audioWrap=el('div','audio-wrap');
    const player=document.createElement('audio'); player.controls=true; player.preload='none'; player.src=audio;
    audioWrap.append(player); body.append(audioWrap);
  }

  body.append(renderTimer(card,state,wrap));

  const actions=el('div','card-actions');
  const open=document.createElement('a');
  open.className='primary-btn'; open.textContent='Open task'; open.target='_blank'; open.rel='noopener noreferrer';
  const link=safeUrl(card.link);
  if(link) open.href=link; else {open.classList.add('disabled'); open.href='#';}
  const done=el('button','done-btn',`Done${s.students.length?` · ${s.students.length}`:''}`); done.type='button';
  const all=el('button',`all-btn${s.complete?' active':''}`,s.complete?'Completed by all':'All done'); all.type='button';
  actions.append(open,done,all); body.append(actions);

  const {panel:students,input:studentInput}=renderStudentPanel(card,state,done,studentCounter);
  if(s.students.length) students.classList.add('open');
  body.append(students);

  done.addEventListener('click',()=>{
    students.classList.toggle('open');
    if(students.classList.contains('open')) setTimeout(()=>studentInput.focus(),30);
  });
  all.addEventListener('click',()=>{
    s.complete=!s.complete; saveState(state);
    wrap.classList.toggle('is-complete',s.complete);
    all.classList.toggle('active',s.complete);
    all.textContent=s.complete?'Completed by all':'All done';
    updateProgress(allCards,state);
    toast(s.complete?'Card completed':'Card returned to active');
  });

  wrap.append(media,body);
  return wrap;
}

async function initSection(){
  const section=document.body.dataset.section; if(!section) return;
  const grid=document.querySelector('#cardsGrid'); const state=loadState();

  try{
    const data=await fetchData();
    const raw=(data.sections && data.sections[section]) || [];
    const byNo=new Map(raw.map(c=>[Number(c.no),c]));
    const cards=Array.from({length:40},(_,i)=>{
      const no=i+1; const src=byNo.get(no)||{};
      return {
        no,
        id:`${section}-${no}`,
        title:src.title||'',
        link:src.link||'',
        image:src.image||'',
        image1:src.image1||src.image||'',
        image2:src.image2||'',
        audio:src.audio||'',
        level:src.level||'',
        notes:src.notes||'',
        active:src.active!==false
      };
    });

    const render=(list)=>{
      clearAllTimerHandles();
      grid.replaceChildren(...list.map(c=>createCard(c,state,cards)));
    };
    render(cards); updateProgress(cards,state); saveState(state);

    const stamp=document.querySelector('#syncStamp');
    if(stamp) stamp.textContent=data.generatedAt ? `Data synced: ${new Date(data.generatedAt).toLocaleString()}` : 'Waiting for first Yandex sync';

    const search=document.querySelector('#searchInput'); const level=document.querySelector('#levelFilter');
    const apply=()=>{
      const q=(search?.value||'').trim().toLowerCase(); const lv=level?.value||'';
      render(cards.filter(c=>(!q || `${c.title} ${c.notes}`.toLowerCase().includes(q)) && (!lv || c.level===lv)));
    };
    search?.addEventListener('input',apply); level?.addEventListener('change',apply);
  }catch(err){
    grid.innerHTML='<div style="grid-column:1/-1;padding:28px;border-radius:22px;background:#fff;border:1px solid #eee">Data file could not be loaded. Run the GitHub sync workflow or check data/exercises.json.</div>';
    console.error(err);
  }
}

function setupNav(){
  const section=document.body.dataset.section; const idx=SECTION_ORDER.findIndex(s=>s[0]===section); if(idx<0) return;
  const prev=SECTION_ORDER[(idx-1+SECTION_ORDER.length)%SECTION_ORDER.length];
  const next=SECTION_ORDER[(idx+1)%SECTION_ORDER.length];
  document.querySelectorAll('[data-prev]').forEach(a=>{a.href=prev[2]; a.title=prev[1];});
  document.querySelectorAll('[data-next]').forEach(a=>{a.href=next[2]; a.title=next[1];});
  const pill=document.querySelector('.nav-pill'); if(pill) pill.textContent=SECTION_ORDER[idx][1];
}

document.addEventListener('DOMContentLoaded',()=>{
  installEnhancementStyles();
  setupNav(); initSection();
  document.querySelector('#refreshBtn')?.addEventListener('click',()=>location.reload());
  document.querySelector('#resetBtn')?.addEventListener('click',()=>{
    const section=document.body.dataset.section;
    if(!section || !confirm('Reset student names, timers and All done status for this page?')) return;
    clearAllTimerHandles();
    const st=loadState();
    Object.keys(st).filter(k=>k.startsWith(section+'-')).forEach(k=>delete st[k]);
    saveState(st); location.reload();
  });
});
