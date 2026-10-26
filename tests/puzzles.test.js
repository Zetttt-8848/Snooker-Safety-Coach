'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../src/physics.js');
const G = require('../src/geometry.js');
const S = require('../src/scoring.js');
const { verify } = require('../scripts/generate-puzzles.js');
const puzzles = require('../data/puzzles.json');
const stored = require('../data/references.json').references;
const json = value => JSON.parse(JSON.stringify(value));
const near = (a,b,tolerance=1e-9) => assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
const replays = new Map();
const replay = puzzle => {
  if(!replays.has(puzzle.id))replays.set(puzzle.id,P.simulate(puzzle.balls,puzzle.referenceShot,P.DEFAULTS,{recordFrames:false}));
  return replays.get(puzzle.id);
};

test('question set contains distinct, sourced English lessons covering every tactic', () => {
  assert.ok(puzzles.length>=23);assert.equal(new Set(puzzles.map(p=>p.id)).size,puzzles.length);
  for(const p of puzzles){
    for(const field of ['title','task','goal','explanation','source','hint'])assert.ok(typeof p[field]==='string'&&p[field].length>3,p.id+' missing '+field);
    assert.ok(p.source.includes('Paper'));assert.ok(p.objective.cueZone);
    assert.ok(p.balls.some(b=>b.id===p.targetId));assert.ok(p.legalTargetIds.includes(p.targetId));
    assert.ok(Math.hypot(p.referenceShot.top,p.referenceShot.side)<=.5);
    assert.ok(p.referenceShot.cueSpeed>0&&p.referenceShot.cueSpeed<=6);
    assert.equal(p.balls.filter(b=>b.id==='cue').length,1);
  }
  for(const id of ['rail-touch','thin-separation','hide-blue','hide-brown','hide-yellow','break-off','send-red-safe'])assert.ok(puzzles.some(p=>p.id===id));
  for(const count of [1,2,3])assert.ok(puzzles.some(p=>p.acceptance.preContactCushions===count));
});

test('the course climbs in five levels, each with several puzzles and a clear tactic, brief and learning objective', () => {
  const levels=new Map();let previous=0;
  for(const p of puzzles){
    assert.ok(Number.isInteger(p.level)&&p.level>=1&&p.level<=5,p.id+' level');
    assert.ok(p.level>=previous,p.id+' breaks the difficulty order');previous=p.level;
    levels.set(p.level,(levels.get(p.level)||0)+1);
    assert.ok(['control','hide','escape','object','break'].includes(p.tactic),p.id+' tactic');
    for(const field of ['brief','learn'])assert.ok(p[field].length>10&&p[field].length<=90,p.id+' '+field+' should be a short sentence');
    assert.ok(p.balls.some(b=>b.id===p.focus.id),p.id+' focus ball must be on the table');assert.ok(p.focus.label);
    assert.equal(p.difficulty,['Beginner','Foundation','Intermediate','Advanced','Challenge'][p.level-1]);
  }
  assert.equal(levels.size,5);for(const [level,count] of levels)assert.ok(count>=3,'level '+level+' has only '+count);
  for(const tactic of ['control','hide','escape','object','break'])assert.ok(puzzles.some(p=>p.tactic===tactic),tactic);
  assert.ok(puzzles.some(p=>p.tags.includes('spin')),'at least one lesson teaches spin');
});

for(const puzzle of puzzles) {
  test(`${puzzle.id}: fresh forward simulation legally achieves the declared task and reproduces the saved full trajectory`, () => {
    const result=replay(puzzle);
    assert.equal(result.completed,true);
    assert.equal(result.balls.some(b=>b.potted),false);
    const first=result.events.find(e=>e.type==='ball'&&e.ids.includes('cue'));
    assert.ok(first&&puzzle.legalTargetIds.includes(first.ids.find(id=>id!=='cue')));
    const verified=verify(puzzle,result);
    assert.deepEqual(json(verified),puzzle.proof);
    assert.equal(verified.cueZoneReached,true);assert.equal(verified.targetZoneReached,true);
    const saved=stored[puzzle.id];assert.ok(saved);
    for(const key of ['path','tracks','events','balls','shot','params','completed','duration'])
      assert.deepEqual(json(result[key]),saved[key],puzzle.id+' changed '+key+'; regenerate reference evidence');
    assert.deepEqual(saved.params,P.DEFAULTS);
    const cue0=puzzle.balls.find(b=>b.id==='cue');
    near(saved.path[0].x,cue0.x);near(saved.path[0].y,cue0.y);
    const cueEnd=result.balls.find(b=>b.id==='cue');
    near(saved.path.at(-1).x,cueEnd.x);near(saved.path.at(-1).y,cueEnd.y);
  });
}

test('every physically replayed reference route earns Excellent and exactly 100 in the actual scoring engine', () => {
  for(const puzzle of puzzles){
    const result=replay(puzzle),report=S.evaluate({puzzle,studentPath:result.path,reference:result,realized:result});
    assert.equal(report.grade,'Excellent',puzzle.id);
    for(const key of ['E','P','C','O'])near(report[key],1);
    near(report.total,100);
    assert.equal(report.outcome.actual.verified,true);
  }
});

test('escape lessons start fully screened and hit a legal red only after the advertised cushion count and order', () => {
  const expected={ 'one-rail-blue':['top'],'one-rail-short':['right'],'two-rail-corridor':['top','right'],
    'two-rail-return':['bottom','left'],'three-rail-escape':['top','right','bottom'] };
  for(const [id,order] of Object.entries(expected)){
    const puzzle=puzzles.find(p=>p.id===id), result=replay(puzzle);
    const cue=puzzle.balls.find(b=>b.id==='cue'),target=puzzle.balls.find(b=>b.id===puzzle.targetId);
    const blockers=puzzle.balls.filter(b=>b.id!=='cue'&&!puzzle.legalTargetIds.includes(b.id));
    const view=G.occlusion(cue,target,blockers);near(view.blockedFraction,1);
    const first=result.events.find(e=>e.type==='ball'&&e.ids.includes('cue'));
    assert.equal(first.ids.find(id=>id!=='cue'),puzzle.targetId);
    assert.deepEqual(result.events.filter(e=>e.type==='cushion'&&e.id==='cue'&&e.t<first.t-1e-9).map(e=>e.wall),order);
  }
});

test('blue, brown and yellow hiding lessons keep the colour on its official spot and fully block the final target', () => {
  const spots={blue:{x:1.7845,y:.889},brown:{x:.737,y:.889},yellow:{x:.737,y:1.181}};
  for(const [colour,spot] of Object.entries(spots)){
    const p=puzzles.find(p=>p.id==='hide-'+colour),r=replay(p);
    const before=p.balls.find(b=>b.id===colour),after=r.balls.find(b=>b.id===colour);
    near(before.x,spot.x);near(before.y,spot.y);near(after.x,before.x);near(after.y,before.y);
    const c=r.balls.find(b=>b.id==='cue'),t=r.balls.find(b=>b.id===p.targetId),view=G.occlusion(c,t,[after]);
    assert.equal(view.valid,true);near(view.blockedFraction,1);near(view.exposure,0);
    assert.ok(view.deltaDegrees>0);
  }
});

test('break-off has 15 reds, six spotted colours, a D-area cue, no pots, limited red spread and a baulk cushion leave', () => {
  const p=puzzles.find(p=>p.id==='break-off'),r=replay(p),c0=p.balls.find(b=>b.id==='cue'),c=r.balls.find(b=>b.id==='cue');
  assert.equal(p.balls.length,22);assert.equal(p.legalTargetIds.length,15);
  assert.ok(c0.x<=P.TABLE.baulk);assert.ok(Math.hypot(c0.x-P.TABLE.baulk,c0.y-P.TABLE.height/2)<=P.TABLE.dRadius);
  assert.ok(c.x<=P.TABLE.baulk);assert.ok(c.x-P.TABLE.radius<.01);
  assert.equal(r.balls.some(b=>b.potted),false);
  let total=0;
  for(const b of r.balls){const start=p.balls.find(s=>s.id===b.id);if(b.color==='red')total+=G.distance(b,start);else if(b.id!=='cue')near(G.distance(b,start),0);}
  assert.ok(total<.5);
});

test('the short-cushion and three-cushion lessons include substantial safety after contact, not merely a legal hit', () => {
  for(const [id,minDistance,maxRail] of [['one-rail-short',.8,.04],['three-rail-escape',1.5,.2]]){
    const p=puzzles.find(p=>p.id===id),r=replay(p),cue=r.balls.find(b=>b.id==='cue'),target=r.balls.find(b=>b.id===p.targetId);
    assert.ok(G.distance(cue,target)>=minDistance);
    const rail=Math.min(cue.x-P.TABLE.radius,P.TABLE.width-P.TABLE.radius-cue.x,cue.y-P.TABLE.radius,P.TABLE.height-P.TABLE.radius-cue.y);
    assert.ok(rail<=maxRail);
  }
});

test('offline classic-script question bundle is exactly the independently editable JSON', () => {
  const context={};vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../data/puzzles.js'),'utf8'),context);
  assert.deepEqual(json(context.Coach.puzzles),puzzles);
});

test('hide lessons for green, pink and black keep each colour on its official spot and block the red', () => {
  const spots={green:{x:.737,y:.597},pink:{x:2.67675,y:.889},black:{x:3.245,y:.889}};
  for(const [colour,spot] of Object.entries(spots)){
    const p=puzzles.find(q=>q.id==='hide-'+colour),r=replay(p),before=p.balls.find(b=>b.id===colour),after=r.balls.find(b=>b.id===colour);
    near(before.x,spot.x);near(before.y,spot.y);near(after.x,before.x);near(after.y,before.y);
    const c=r.balls.find(b=>b.id==='cue'),t=r.balls.find(b=>b.id===p.targetId),view=G.occlusion(c,t,[after]);
    assert.ok(view.blockedFraction>=.95,colour);
  }
});

test('new escape lessons start fully screened and take the advertised cushions in order before contact', () => {
  const expected={'one-rail-left':['left'],'one-rail-right':['right'],'two-rail-bottom':['bottom','right'],'two-rail-spin':['right','bottom'],'three-rail-sweep':['top','left','bottom'],'return-to-baulk':['right']};
  for(const [id,order] of Object.entries(expected)){
    const p=puzzles.find(q=>q.id===id),r=replay(p);
    const first=r.events.find(e=>e.type==='ball'&&e.ids.includes('cue'));
    assert.equal(first.ids.find(x=>x!=='cue'),p.targetId,id);
    assert.deepEqual(r.events.filter(e=>e.type==='cushion'&&e.id==='cue'&&e.t<first.t-1e-9).map(e=>e.wall),order,id);
    if(id!=='return-to-baulk'){
      const cue=p.balls.find(b=>b.id==='cue'),target=p.balls.find(b=>b.id===p.targetId),blockers=p.balls.filter(b=>b.id!=='cue'&&!p.legalTargetIds.includes(b.id));
      near(G.occlusion(cue,target,blockers).blockedFraction,1);
    }
  }
});

test('the object-ball, screw-back and baulk-return lessons achieve their stated outcomes', () => {
  const pk=b=>Math.min(...P.TABLE.pockets.map(k=>G.distance(b,k)));
  const clear=puzzles.find(p=>p.id==='pull-red-clear'),rc=replay(clear),redStart=clear.balls.find(b=>b.id==='red1'),redEnd=rc.balls.find(b=>b.id==='red1');
  assert.ok(pk(redStart)<.3);assert.ok(pk(redEnd)>=.65);
  const screw=puzzles.find(p=>p.id==='screw-back'),rs=replay(screw);
  assert.equal(rs.events.some(e=>e.type==='cushion'&&e.id==='cue'),false);
  assert.ok(G.distance(rs.balls.find(b=>b.id==='cue'),rs.balls.find(b=>b.id==='red1'))>1);
  const home=puzzles.find(p=>p.id==='return-to-baulk'),rh=replay(home);
  assert.ok(rh.balls.find(b=>b.id==='cue').x<=P.TABLE.baulk);
  assert.ok(G.distance(rh.balls.find(b=>b.id==='red1'),home.balls.find(b=>b.id==='red1'))<.2);
});
