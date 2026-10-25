'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('shipped interface and generated lesson text contain no Chinese characters',()=>{
  const files=['index.html','data/puzzles.json','data/puzzles.js',...fs.readdirSync(path.join(root,'src')).filter(n=>n.endsWith('.js')).map(n=>'src/'+n)];
  for(const file of files)assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/\p{Script=Han}/u,file);
  assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/<html lang="en">/);
});
test('English lesson generator preserves reference outcomes and uses sourced English metadata',()=>{
  const {specs}=require('../scripts/generate-puzzles.js'),lessons=require('../data/puzzles.json');
  for(const lesson of specs()){
    const stored=lessons.find(p=>p.id===lesson.id);
    for(const field of ['title','category','difficulty','task','goal','explanation','hint','source']){
      assert.equal(stored[field],lesson[field]);assert.doesNotMatch(lesson[field],/\p{Script=Han}/u);
    }
  }
});
