import Majiang = require('..');

const wall = new Majiang.Shan(Majiang.rule());
const tile: string = wall.zimo();
const count: number = wall.paishu;
void [tile, count];

// @ts-expect-error A dora indicator is a tile string.
Majiang.Shan.zhenbaopai(1);

import Four = require('@aqz/fever-majiang-core/four-player');
import Three = require('@aqz/fever-majiang-core/three-player');
const fourWall: number = new Four.Shan(Four.rule()).paishu;
const threeWall: number = new Three.Shan(Three.rule()).paishu;
void [fourWall, threeWall];
