(function(root){
  'use strict';
  const C=root.Coach=root.Coach||{};
  const colors={white:'#fffdf1',red:'#c64640',yellow:'#e9ca51',green:'#5a9470',brown:'#956841',blue:'#6094c5',pink:'#d79aab',black:'#242a28'};
  class TableRenderer {
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.state={};this.resize();this.observer=new ResizeObserver(()=>{this.resize();this.draw(this.state);});this.observer.observe(canvas);}
    resize(){const b=this.canvas.getBoundingClientRect();this.w=b.width||900;this.h=this.w/1.83;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);this.ctx.setTransform(d,0,0,d,0,0);this.pad=this.w*.061;this.scale=(this.w-this.pad*2)/3.569;this.oy=(this.h-1.778*this.scale)/2;}
    project(p){return{x:this.pad+p.x*this.scale,y:this.oy+p.y*this.scale};}
    unproject(e){const b=this.canvas.getBoundingClientRect();return{x:((e.clientX-b.left)*this.w/b.width-this.pad)/this.scale,y:((e.clientY-b.top)*this.h/b.height-this.oy)/this.scale};}
    path(points,color,width=1.5,dash=[]){if(!points||points.length<2)return;const c=this.ctx;c.save();c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.beginPath();points.forEach((p,i)=>{const q=this.project(p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);});c.stroke();c.restore();}
    circle(p,r,color,fill=false,line=1){const q=this.project(p),c=this.ctx;c.beginPath();c.arc(q.x,q.y,r*this.scale,0,Math.PI*2);c.lineWidth=line;fill?(c.fillStyle=color,c.fill()):(c.strokeStyle=color,c.stroke());}
    label(p,text,color='#d8e1ce'){const q=this.project(p),c=this.ctx;c.fillStyle=color;c.font=`${Math.max(8,this.w*.011)}px 'Segoe UI',sans-serif`;c.textAlign='center';c.fillText(text,q.x,q.y);}
    draw(s={}){this.state=s;const c=this.ctx,w=this.w,h=this.h,P=C.physics,T=P?.TABLE||{width:3.569,height:1.778,radius:.02625},sc=this.scale;
      c.clearRect(0,0,w,h);const outer=c.createLinearGradient(0,0,w,h);outer.addColorStop(0,'#254a3e');outer.addColorStop(1,'#102f29');c.fillStyle=outer;c.fillRect(0,0,w,h);
      const x=this.pad,y=this.oy,tw=T.width*sc,th=T.height*sc,rim=w*.021;
      c.fillStyle='#102e25';c.fillRect(x-rim,y-rim,tw+2*rim,th+2*rim);c.strokeStyle='#6b795244';c.lineWidth=1;c.strokeRect(x-rim-4,y-rim-4,tw+2*rim+8,th+2*rim+8);
      const cloth=c.createRadialGradient(x+tw*.44,y+th*.45,0,x+tw*.5,y+th*.5,tw*.75);cloth.addColorStop(0,'#2b6954');cloth.addColorStop(1,'#1d4f41');c.fillStyle=cloth;c.fillRect(x,y,tw,th);
      c.save();c.globalAlpha=.025;c.fillStyle='#e1f0d6';for(let i=0;i<tw;i+=4)for(let j=0;j<th;j+=4)c.fillRect(x+i,y+j,1,.6);c.restore();
      const baulk=.737*sc,dr=.292*sc;c.strokeStyle='#b6c3a841';c.lineWidth=.9;c.beginPath();c.moveTo(x+baulk,y);c.lineTo(x+baulk,y+th);c.stroke();c.beginPath();c.arc(x+baulk,y+th/2,dr,Math.PI/2,Math.PI*1.5);c.stroke();
      [[.737,.889],[1.7845,.889],[2.67675,.889],[3.245,.889],[.737,.597],[.737,1.181]].forEach(([px,py])=>this.circle({x:px,y:py},.004,'#c7d1b760',true));
      c.fillStyle='#0b211d';[[0,0],[T.width/2,0],[T.width,0],[0,T.height],[T.width/2,T.height],[T.width,T.height]].forEach(([px,py],i)=>{const q=this.project({x:px,y:py});c.beginPath();c.arc(q.x,q.y,(i%3===1?.051:.0445)*sc,0,Math.PI*2);c.fill();c.strokeStyle='#9c8d5b66';c.lineWidth=2;c.stroke();});
      for(let i=1;i<8;i++){if(i===4)continue;const dx=x+tw*i/8;c.fillStyle='#9dba8c66';c.beginPath();c.arc(dx,y-rim*.55,1.2,0,7);c.fill();c.beginPath();c.arc(dx,y+th+rim*.55,1.2,0,7);c.fill();}for(let j=1;j<4;j++){c.fillStyle='#9dba8c66';[x-rim*.55,x+tw+rim*.55].forEach(dx=>{c.beginPath();c.arc(dx,y+th*j/4,1.2,0,7);c.fill();});}
      c.save();c.beginPath();c.rect(x,y,tw,th);c.clip();
      if(s.zone){const z=s.zone;this.circle(z,z.radius||.22,'#d6c17c22',true);c.setLineDash([4,4]);this.circle(z,z.radius||.22,'#d5c38370');c.setLineDash([]);if(z.label)this.label({x:z.x,y:z.y+.07},z.label,'#dccb8b');}
      if(s.reference){this.path(s.reference,'#d2aa6419',.0525*sc);this.path(s.reference,'#d7b776',1.7,[5,4]);}
      if(s.prediction)this.path(s.prediction,'#d6dbba88',1,[4,5]);
      if(s.tracks)Object.entries(s.tracks).forEach(([id,pts])=>this.path(pts,id==='cue'?'#cddbc48a':'#bc7e6680',1));
      if(s.student)this.path(s.student,'#91d4e3',2);
      if(s.endpoint&&s.reference?.length){const end=s.reference.at(-1);this.path([end,s.endpoint],'#d6c58a88',1,[3,3]);this.circle(end,Math.hypot(end.x-s.endpoint.x,end.y-s.endpoint.y),'#d6c58a55');}
      if(s.aim&&s.balls){const cue=s.balls.find(b=>b.id==='cue'&&!b.potted);if(cue){const a=s.aim.angle*Math.PI/180;let d=1;let hit=null;for(const b of s.balls){if(b===cue||b.potted)continue;const dx=b.x-cue.x,dy=b.y-cue.y,proj=dx*Math.cos(a)+dy*Math.sin(a),disc=(2*T.radius)**2-(dx*dx+dy*dy-proj*proj);if(disc>=0){const v=proj-Math.sqrt(disc);if(v>0&&v<d){d=v;hit=b;}}}const end={x:cue.x+d*Math.cos(a),y:cue.y+d*Math.sin(a)};this.path([cue,end],'#dbe5ce88',1,[4,5]);if(hit)this.circle(end,T.radius,'#e7edda99');}}
      c.restore();
      (s.balls||[]).filter(b=>!b.potted).forEach(b=>{const q=this.project(b),r=T.radius*sc;c.save();c.shadowColor='#071c27aa';c.shadowBlur=r*.8;c.shadowOffsetY=r*.35;const g=c.createRadialGradient(q.x-r*.3,q.y-r*.3,0,q.x,q.y,r);const color=colors[b.color]||b.color||colors.red;g.addColorStop(0,b.color==='white'?'#ffffff':color);g.addColorStop(.65,color);g.addColorStop(1,b.color==='white'?'#c6d1ba':'#12291d');c.fillStyle=g;c.beginPath();c.arc(q.x,q.y,Math.max(r,2.8),0,7);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.fillStyle='#ffffff88';c.beginPath();c.arc(q.x-r*.27,q.y-r*.3,r*.17,0,7);c.fill();c.restore();if(s.selected===b.id)this.circle(b,T.radius*1.65,'#d5c58c',false,1.5);if(s.targetId===b.id){c.save();c.setLineDash([2,3]);this.circle(b,T.radius*1.65,'#deb98999');c.restore();}});
      if(s.handles)s.handles.forEach((p,i)=>{this.circle(p,.022,'#153b32',true);this.circle(p,.022,i===s.activeHandle?'#e9cc84':'#a9deeb');if(i>0)this.label({x:p.x,y:p.y-.05},String(i),'#b7e5ec');});
      if(s.errors)s.errors.forEach(e=>this.label({x:e.x,y:e.y+(e.y<T.height/2?.11:-.09)},e.text,'#e2c788'));
      c.fillStyle='#8bab9560';c.font=`${w*.009}px 'Segoe UI',sans-serif`;c.textAlign='center';c.fillText('SAFETY  COACH',w/2,y+th*.8);
    }
  }
  C.renderer={TableRenderer,colors};
})(globalThis);
