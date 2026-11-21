import Majiang = require('..');

const wall = new Majiang.Shan(Majiang.rule());
const tile: string = wall.zimo();
const count: number = wall.paishu;
void [tile, count];

// @ts-expect-error A dora indicator is a tile string.
Majiang.Shan.zhenbaopai(1);
