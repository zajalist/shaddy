import time, base64
new_tab("http://localhost:4173/")
wait_for_load()
time.sleep(2)
import json
hh = json.loads(js("JSON.stringify([...document.querySelectorAll('[title^=\"Open in editor\"]')].map(a=>a.getAttribute('href')))"))
new_tab("http://localhost:4173"+hh[0])  # terrain
wait_for_load()
time.sleep(5)
data = js("""
(() => {
  const cs=[...document.querySelectorAll('canvas')];
  let best=null,ba=0;
  for(const c of cs){const r=c.getBoundingClientRect(); const a=r.width*r.height; if(r.left>window.innerWidth*0.5 && a>ba){ba=a;best=c;}}
  if(!best) return '';
  const o=document.createElement('canvas'); o.width=560; o.height=Math.round(560*best.height/best.width);
  o.getContext('2d').drawImage(best,0,0,o.width,o.height);
  return o.toDataURL('image/png');
})()
""")
open(r"D:\Hackathons\shaddy\.tmp_ter.png","wb").write(base64.b64decode(data.split(",")[1]))
print("saved", len(data))
