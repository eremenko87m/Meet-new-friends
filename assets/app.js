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
function cardState(state,id){
  if(!state[id]) state[id] = { students:[], complete:false };
  if(!Array.isArray(state[id].students)) state[id].students=[];
  return state[id];
}
function toast(message){
  let el=document.querySelector('.toast');
  if(!el){ el=document.createElement('div'); el.className='toast'; document.body.appendChild(el); }
  el.textContent=message; el.classList.add('show');
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.remove('show'),1800);
}
function el(tag, cls, text){
  const node=document.createElement(tag); if(cls) node.className=cls; if(text!==undefined) node.textContent=text; return node;
}

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
  input.type='text';
  input.className='chip-edit-input';
  input.value=currentName;
  input.maxLength=45;
  label.replaceWith(input);
  input.focus();
  input.select();

  const finish=(commit)=>{
    const next=(input.value || '').trim();
    input.removeEventListener('blur', onBlur);
    input.removeEventListener('keydown', onKey);
    if(commit) onSave(next || currentName);
    else onSave(currentName);
  };
  const onBlur=()=>finish(true);
  const onKey=(e)=>{
    if(e.key==='Enter'){ e.preventDefault(); finish(true); }
    if(e.key==='Escape'){ e.preventDefault(); finish(false); }
  };
  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKey);
}

function renderStudentPanel(card, state, doneBtn){
  const panel=el('div','students-panel');
  const head=el('div','students-head');
  head.append(el('div','students-title','Done list'));
  head.append(el('div','students-tip','Click a name to edit it'));

  const form=el('div','student-form');
  const input=document.createElement('input');
  input.placeholder='Type student name';
  input.maxLength=45;
  const add=el('button','small-btn','Add'); add.type='button';
  const list=el('div','student-list');
  form.append(input,add);
  panel.append(head,form,list);

  const redraw=()=>{
    const s=cardState(state,card.id);
    list.replaceChildren();
    if(!s.students.length) list.append(el('span','empty-students','No names yet'));
    s.students.forEach((name,index)=>{
      const chip=el('span','student-chip');
      const label=el('button','student-name',name);
      label.type='button';
      label.title='Edit name';
      const remove=el('button','student-remove','×');
      remove.type='button';
      remove.title='Remove';

      label.addEventListener('click',()=>{
        startInlineEdit(label, name, (updatedName)=>{
          const normalized=updatedName.trim();
          if(!normalized){
            s.students.splice(index,1);
          }else if(!s.students.some((n,i)=>i!==index && n.toLowerCase()===normalized.toLowerCase())){
            s.students[index]=normalized;
          }
          saveState(state);
          redraw();
          doneBtn.textContent=`Done${s.students.length?` · ${s.students.length}`:''}`;
        });
      });

      remove.addEventListener('click',()=>{
        s.students.splice(index,1);
        saveState(state);
        redraw();
        doneBtn.textContent=`Done${s.students.length?` · ${s.students.length}`:''}`;
      });

      chip.append(label,remove);
      list.append(chip);
    });
  };

  const addName=()=>{
    const name=input.value.trim();
    if(!name) return;
    const s=cardState(state,card.id);
    if(!s.students.some(n=>n.toLowerCase()===name.toLowerCase())) s.students.push(name);
    input.value='';
    saveState(state);
    redraw();
    doneBtn.textContent=`Done · ${s.students.length}`;
    toast(`${name} marked done`);
    input.focus();
  };

  add.addEventListener('click',addName);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addName(); } });
  redraw();
  return { panel, input };
}

function createCard(card,state,allCards){
  const s=cardState(state,card.id);
  const wrap=el('article','exercise-card');
  if(s.complete) wrap.classList.add('is-complete');
  if(!card.title && !card.link && !card.audio && !card.image) wrap.classList.add('is-empty');

  const media=el('div','card-media');
  const image=safeUrl(card.image);
  if(image){
    const img=document.createElement('img');
    img.src=image;
    img.alt=card.title||`Exercise ${card.no}`;
    img.loading='lazy';
    img.addEventListener('error',()=>{img.replaceWith(el('div','media-placeholder'));});
    media.append(img);
  } else {
    media.append(el('div','media-placeholder'));
  }
  media.append(el('span','card-number',String(card.no).padStart(2,'0')));
  if(card.level) media.append(el('span','level-badge',card.level));

  const body=el('div','card-body');
  const topMeta=el('div','card-topline');
  topMeta.append(el('span','tiny-pill', card.active===false ? 'Hidden' : 'Active'));
  topMeta.append(el('span','student-counter', `${s.students.length} student${s.students.length===1?'':'s'}`));
  body.append(topMeta);
  body.append(el('div','card-accent-line'));

  body.append(el('h3','card-title',card.title || `Exercise ${String(card.no).padStart(2,'0')}`));
  body.append(el('p','card-note',card.notes || (card.active===false ? 'This slot is hidden in the table.' : 'Ready for a new exercise.')));

  const audio=safeUrl(card.audio);
  if(audio){
    const audioWrap=el('div','audio-wrap');
    const player=document.createElement('audio');
    player.controls=true;
    player.preload='none';
    player.src=audio;
    audioWrap.append(player);
    body.append(audioWrap);
  }

  const actions=el('div','card-actions');
  const open=document.createElement('a');
  open.className='primary-btn';
  open.textContent='Open task';
  open.target='_blank';
  open.rel='noopener noreferrer';
  const link=safeUrl(card.link);
  if(link) open.href=link; else { open.classList.add('disabled'); open.href='#'; }

  const done=el('button','done-btn',`Done${s.students.length?` · ${s.students.length}`:''}`);
  done.type='button';
  const all=el('button',`all-btn${s.complete?' active':''}`,s.complete?'Completed by all':'All done');
  all.type='button';
  actions.append(open,done,all);
  body.append(actions);

  const { panel: students, input } = renderStudentPanel(card,state,done);
  if(s.students.length) students.classList.add('open');
  body.append(students);

  done.addEventListener('click',()=>{
    students.classList.toggle('open');
    if(students.classList.contains('open')) setTimeout(()=>input.focus(), 30);
  });

  all.addEventListener('click',()=>{
    s.complete=!s.complete;
    saveState(state);
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
      return { no, id:`${section}-${no}`, title:src.title||'', link:src.link||'', image:src.image||'', audio:src.audio||'', level:src.level||'', notes:src.notes||'', active:src.active!==false };
    });
    const render=(list)=>{ grid.replaceChildren(...list.map(c=>createCard(c,state,cards))); };
    render(cards); updateProgress(cards,state);
    const stamp=document.querySelector('#syncStamp'); if(stamp) stamp.textContent=data.generatedAt ? `Data synced: ${new Date(data.generatedAt).toLocaleString()}` : 'Waiting for first Yandex sync';

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
  const prev=SECTION_ORDER[(idx-1+SECTION_ORDER.length)%SECTION_ORDER.length]; const next=SECTION_ORDER[(idx+1)%SECTION_ORDER.length];
  document.querySelectorAll('[data-prev]').forEach(a=>{a.href=prev[2]; a.title=prev[1];});
  document.querySelectorAll('[data-next]').forEach(a=>{a.href=next[2]; a.title=next[1];});
  const pill=document.querySelector('.nav-pill'); if(pill) pill.textContent=SECTION_ORDER[idx][1];
}

document.addEventListener('DOMContentLoaded',()=>{
  setupNav(); initSection();
  document.querySelector('#refreshBtn')?.addEventListener('click',()=>location.reload());
  document.querySelector('#resetBtn')?.addEventListener('click',()=>{
    const section=document.body.dataset.section;
    if(!section || !confirm('Reset student names and All done status for this page?')) return;
    const st=loadState();
    Object.keys(st).filter(k=>k.startsWith(section+'-')).forEach(k=>delete st[k]);
    saveState(st);
    location.reload();
  });
});
