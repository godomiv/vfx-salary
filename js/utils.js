// ══════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════
function median(arr){const s=[...arr].sort((a,b)=>a-b);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}
function avg(arr){return arr.reduce((a,b)=>a+b,0)/arr.length;}
function fmtSalary(n){return '$'+Math.round(n).toLocaleString('en-US');}
function expLabel(e){if(e<=1)return'0–2 л';if(e<=4)return'3–5 л';if(e<=7.5)return'6–9 л';if(e<=12)return'10–14 л';return'15+ л';}
function salaryColor(s){
  if(s<1000) return lerp3('#4a9eff','#00ffaa',s/1000);
  if(s<3000) return lerp3('#00ffaa','#ffa500',(s-1000)/2000);
  if(s<6000) return lerp3('#ffa500','#ff3366',(s-3000)/3000);
  return '#ff3366';
}
function lerp3(a,b,t){t=Math.max(0,Math.min(1,t));const c1=hexToRgb(a),c2=hexToRgb(b);return `rgb(${Math.round(c1.r+(c2.r-c1.r)*t)},${Math.round(c1.g+(c2.g-c1.g)*t)},${Math.round(c1.b+(c2.b-c1.b)*t)})`;}
function hexToRgb(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return{r,g,b};}
