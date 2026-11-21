import { describe, expect, test } from 'vitest';
import Majiang from '../dist/index.js';

const { rule, Shoupai, Util } = Majiang;

describe('sanma score settlement', () => {
    const draw = 'p123456s789z55566';
    const beforeRon = 'p123456s789z5556';
    const normal = rule({ '3p簡易スコア使用': false });
    const table = rule({
        '3p簡易スコア表': {
            oya: { ron: { 1: 4000 }, tsumo: { 2: [2000] } },
            ko: { ron: { 1: 2000 }, tsumo: { 2: [2000, 1000] } },
        },
    });
    const score = (hand, tile, config, seat, repeat = 2, pot = 0) =>
        Util.hule(Shoupai.fromString(hand), tile, Util.hule_param({
            rule: config, menfeng: seat, changbang: repeat, lizhibang: pot,
        }));

    test.each([
        [0, [3000, -1500, -1500]],
        [1, [-1500, 2400, -900]],
        [2, [-1500, -900, 2400]],
    ])('normal tsumo settles both payers, winner seat %i', (seat, expected) => {
        expect(score(draw, null, normal, seat).fenpei).toEqual(expected);
        const withPot = score(draw, null, normal, seat, 2, 1).fenpei;
        expect(withPot.map((v, i) => v - expected[i])).toEqual(
            expected.map((_, i) => i === seat ? 1000 : 0),
        );
    });

    test.each([
        [0, '+', [3000, -3000, 0]],
        [0, '=', [3000, 0, -3000]],
        [1, '+', [0, 2200, -2200]],
        [1, '=', [-2200, 2200, 0]],
        [2, '+', [-2200, 0, 2200]],
        [2, '=', [0, -2200, 2200]],
    ])('normal ron charges only the source for winner seat %i and %s', (seat, from, expected) => {
        expect(score(beforeRon, 'z6' + from, normal, seat).fenpei).toEqual(expected);
    });

    test('simplified table retains the Fever honba payment scheme', () => {
        expect(score(draw, null, table, 0).fenpei).toEqual([8000, -4000, -4000]);
        expect(score(draw, null, table, 1).fenpei).toEqual([-4000, 7000, -3000]);
        expect(score(beforeRon, 'z6=', table, 1).fenpei).toEqual([-4000, 4000, 0]);
    });

    test('two red fives both count when five is also dora and ura', () => {
        const hand = Shoupai.fromString('p005123s789z55566');
        const result = Util.hule(hand, null, Util.hule_param({
            rule: normal, baopai: ['p4'], fubaopai: ['p4'],
        }));
        expect(Object.fromEntries(result.hupai.map(({ name, fanshu }) => [name, fanshu])))
            .toMatchObject({ ドラ: 3, 赤ドラ: 2, 裏ドラ: 3 });
    });
});

describe('sanma hand analysis', () => {
    test('kokushi waits contain only the existing 13 terminal and honor types', () => {
        const hand = Shoupai.fromString('m19p19s19z1234567');
        expect(Util.xiangting(hand)).toBe(0);
        expect(Util.tingpai(hand)).toEqual(['m1','m9','p1','p9','s1','s9','z1','z2','z3','z4','z5','z6','z7']);
    });

    test('failed custom wait analysis does not mutate the original hand', () => {
        const hand = Shoupai.fromString('p123456s789z5556');
        const before = JSON.stringify(hand);
        let calls = 0;
        expect(() => Util.tingpai(hand, () => {
            if (calls++ > 0) throw new Error('custom evaluator');
            return 0;
        })).toThrow('custom evaluator');
        expect(JSON.stringify(hand)).toBe(before);
    });
});
