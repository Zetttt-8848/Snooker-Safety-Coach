'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const A = require('../src/safe-leaves.js'), P = require('../src/physics.js'), G = require('../src/geometry.js');
const b = (id,x,y,color='red') => ({id,x,y,color});

test('paper Eq. (37)/(38): clear-line exposure has the exact 0.30 boundary', () => {
  const ctx=A.context([b('r',2,1)],['r']), boundary=-.75*Math.log(.30);
  assert.equal(A.evaluate({x:2-boundary-.001,y:1},ctx).safe,true);
  assert.equal(A.evaluate({x:2-boundary+.001,y:1},ctx).safe,false);
  const actual=A.evaluate({x:1,y:1},ctx);
  assert.ok(Math.abs(actual.exposure-Math.exp(-1/.75))<1e-12);
});
test('a colour in front creates a hidden region; a colour behind the red does not', () => {
  const point={x:.5,y:.9}, red=b('r',1,.9), front=b('blue',.75,.9,'blue'), behind=b('blue',1.25,.9,'blue');
  const hidden=A.evaluate(point,A.context([red,front],['r']));
  assert.equal(hidden.safe,true);assert.equal(hidden.hidden,true);assert.equal(hidden.exposure,0);
  assert.equal(A.evaluate(point,A.context([red,behind],['r'])).safe,false);
});
test('every legal red is considered; other reds are not non-on blockers', () => {
  const point={x:.5,y:.9}, balls=[b('r1',1,.9),b('blue',.75,.9,'blue'),b('r2',.5,1.3)];
  assert.equal(A.evaluate(point,A.context(balls,['r1'])).hidden,true);
  const all=A.evaluate(point,A.context(balls,['r1','r2']));
  assert.equal(all.safe,false);assert.equal(all.hidden,false);
});
test('invalid placements, potted targets and empty legal-target sets never produce safe cells', () => {
  const balls=[b('r',1,1)]; const ctx=A.context(balls,['r']);
  for(const point of [{x:1,y:1},{x:0,y:.5},{x:P.TABLE.width/2,y:P.TABLE.radius}]) assert.equal(A.evaluate(point,ctx).valid,false);
  assert.equal(A.analyse([{...balls[0],potted:true}],['r']).safeCount,0);
  assert.equal(A.analyse(balls,[]).safeCount,0);
});
test('map samples use final object-ball positions, preserve input and exclude whole overlapping squares', () => {
  const balls=[b('cue',.5,.9,'white'),b('r',1,.9),b('blue',.75,.9,'blue')];
  const copy=structuredClone(balls),first=A.analyse(balls,['r']);
  assert.deepEqual(balls,copy);assert.equal(first.actual.hidden,true);assert.ok(first.hiddenCount>0);
  const later=A.analyse([balls[0],{...balls[1],x:.5,y:1.3},balls[2]],['r']);
  assert.equal(later.actual.safe,false);assert.notDeepEqual(first.cells,later.cells);
  for(let row=0;row<first.rows;row++)for(let col=0;col<first.cols;col++)if(first.cells[row*first.cols+col]){
    const point={x:P.TABLE.radius+(col+.5)*first.dx,y:P.TABLE.radius+(row+.5)*first.dy};
    for(const object of balls.slice(1))assert.ok(G.distance(point,object)>=2*P.TABLE.radius+Math.hypot(first.dx,first.dy)/2-1e-10);
  }
  assert.equal(first.reachable,false);
});
