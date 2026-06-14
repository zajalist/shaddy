import time, base64
new_tab("http://localhost:4173/")
wait_for_load()
time.sleep(3)
js("(() => { const a=document.querySelector('[title^=\"Open in editor\"]'); if(a) a.scrollIntoView({block:'center'}); })()")
time.sleep(2)
# hover ocean tile (index 3) to drive its raymarch, then sample
js("(() => { const t=[...document.querySelectorAll('[title^=\"Open in editor\"]')][3]; const r=t.getBoundingClientRect(); const o={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}; t.dispatchEvent(new MouseEvent('mouseover',o)); t.dispatchEvent(new MouseEvent('mouseenter',o)); })()")
time.sleep(1.2)
res = js("""
(() => {
  const tiles=[...document.querySelectorAll('[title^=\"Open in editor\"]')];
  const t0=tiles[0].getBoundingClientRect();
  const cx0=t0.left+t0.width/2, cy0=t0.top+t0.height/2;
  const c=[...document.querySelectorAll('canvas')].find(cv=>{const r=cv.getBoundingClientRect();return cx0>=r.left&&cx0<=r.right&&cy0>=r.top&&cy0<=r.bottom&&r.width>200;});
  if(!c) return 'NOCANVAS';
  const cr=c.getBoundingClientRect(); const sx=c.width/cr.width, sy=c.height/cr.height;
  const tmp=document.createElement('canvas'); tmp.width=c.width; tmp.height=c.height;
  const ctx=tmp.getContext('2d'); ctx.drawImage(c,0,0);
  const r=tiles[3].getBoundingClientRect();
  let s=[];
  for(let fy=0.25; fy<=0.8; fy+=0.27){ for(let fx=0.3; fx<=0.7; fx+=0.4){
    const px=Math.floor((r.left-cr.left+r.width*fx)*sx), py=Math.floor((r.top-cr.top+r.height*fy)*sy);
    const d=ctx.getImageData(px,py,1,1).data; s.push(d[0]+','+d[1]+','+d[2]);
  }}
  return 'ocean tile samples: '+s.join(' | ');
})()
""")
print(res)
errs = js("(window.__chkErr||'')")
print("err:", errs or "none")
