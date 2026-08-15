const SECTIONS=[
  ['01','LS','Listening','listening.html','Audio, video and listening practice','#5b67ed'],
  ['02','R1','Reading 1','reading-1.html','Reading set one','#28966e'],
  ['03','R2','Reading 2','reading-2.html','Reading set two','#795ec8'],
  ['04','WR','Writing','writing.html','Writing tasks and prompts','#db774f'],
  ['05','S1','Speaking 1','speaking-1.html','Speaking set one','#cc5f8c'],
  ['06','S2','Speaking 2','speaking-2.html','Speaking set two','#308c9e'],
  ['07','S3','Speaking 3','speaking-3.html','Speaking set three','#ad7a32']
];

const grid=document.querySelector('#sectionCards');
SECTIONS.forEach(([n,code,title,href,sub,color])=>{
  const a=document.createElement('a');
  a.className='section-tile';
  a.href=href;
  a.style.setProperty('--tile-accent', color);

  const meta=document.createElement('div');
  meta.className='tile-meta';
  const idx=document.createElement('div');
  idx.className='tile-index';
  idx.textContent=`SECTION ${n}`;
  const tag=document.createElement('span');
  tag.className='tile-tag';
  tag.textContent='40 cards';
  meta.append(idx, tag);

  const icon=document.createElement('div');
  icon.className='tile-icon';
  icon.textContent=code;

  const kicker=document.createElement('div');
  kicker.className='section-kicker';
  kicker.textContent='Exercise block';

  const h=document.createElement('h2');
  h.textContent=title;

  const bottom=document.createElement('div');
  bottom.className='tile-bottom';
  const s=document.createElement('span');
  s.textContent=sub;
  const arrow=document.createElement('span');
  arrow.className='tile-arrow';
  arrow.textContent='→';
  bottom.append(s,arrow);

  a.append(meta, icon, kicker, h, bottom);
  grid.append(a);
});
