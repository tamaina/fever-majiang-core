'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Shan, Shoupai, Util, rule } = require('../lib');

test('sanma manzu dora skips the absent ranks in both directions', () => {
    assert.equal(Shan.zhenbaopai('m1'), 'm9');
    assert.equal(Shan.zhenbaopai('m9'), 'm1');
    assert.equal(Shan.zhenbaopai('p9'), 'p1');
    assert.equal(Shan.zhenbaopai('s0'), 's6');
    assert.equal(Shan.zhenbaopai('z4'), 'z1');
    const hand = Shoupai.fromString('m999p123s789z55566');
    const result = Util.hule(hand, null, Util.hule_param({ baopai: ['m1'] }));
    assert.equal(result.hupai.find(yaku => yaku.name === 'ドラ')?.fanshu, 3);
});

for (const [menfeng, expected] of [
    [0, [3000, -1500, -1500]],
    [1, [-1500, 2400, -900]],
    [2, [-1500, -900, 2400]],
]) {
    test(`normal-score tsumo conserves two honba in seat ${menfeng}`, () => {
        const hand = Shoupai.fromString('p123456s789z55566');
        const config = rule({ '3p簡易スコア使用': false });
        const score = (lizhibang) => Util.hule(hand, null, Util.hule_param({
            rule: config, menfeng, changbang: 2, lizhibang,
        }));
        const { fenpei } = score(0);
        assert.deepEqual(fenpei, expected);
        assert.equal(fenpei.reduce((sum, change) => sum + change, 0), 0);
        assert.equal(score(1).fenpei.reduce((sum, change) => sum + change, 0), 1000);
    });
}
