'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
if(fs.existsSync(path.join(root,'data/puzzles.json'))){const data=JSON.parse(fs.readFileSync(path.join(root,'data/puzzles.json'),'utf8'));fs.writeFileSync(path.join(root,'data/puzzles.js'),'globalThis.Coach=globalThis.Coach||{};globalThis.Coach.puzzles='+JSON.stringify(data,null,2)+';\n');}
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+fs.readFileSync(path.join(root,'styles.css'),'utf8')+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script>\n'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
fs.writeFileSync(path.join(dist,'Snooker-Safety-Coach.html'),html);
fs.writeFileSync(path.join(dist,'index.html'),html);
for(const dir of ['data','docs'])if(fs.existsSync(path.join(root,dir)))fs.cpSync(path.join(root,dir),path.join(dist,dir),{recursive:true});
fs.copyFileSync(path.join(root,'README.md'),path.join(dist,'README.md'));
if(fs.existsSync(path.join(root,'DESIGN_BRIEF.md')))fs.copyFileSync(path.join(root,'DESIGN_BRIEF.md'),path.join(dist,'DESIGN_BRIEF.md'));
console.log('Offline build: '+path.join(dist,'Snooker-Safety-Coach.html'));
