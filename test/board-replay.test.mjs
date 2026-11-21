import { describe, expect, test } from 'vitest';
import Majiang from '../dist/index.js';
const { Board, Game, He, Shan, Shoupai, rule } = Majiang;

const opening = { title: 'three-seat replay', player: ['A', 'B', 'C'], qijia: 2 };
const deal = { zhuangfeng: 0, jushu: 1, changbang: 1, lizhibang: 0,
    baopai: 'm1', shoupai: ['', 'p11s123456789z11', ''], defen: [35000, 35000, 35000] };

describe('three-seat board and discards', () => {
    test('replays a masked draw, legal pon and its discard into identical state', () => {
        function play() {
            const board = new Board(opening);
            board.qipai(deal);
            expect(board.player_id).toEqual([0, 1, 2]);
            expect(board.player_id.map(id => board.menfeng(id))).toEqual([0, 1, 2]);
            expect(board.shan.paishu).toBe(55);
            board.zimo({ l: 0 });
            board.dapai({ l: 0, p: 'p1' });
            expect(Game.get_peng_mianzi(rule(), board.shoupai[1], 'p1=', board.shan.paishu))
                .toContain('p111=');
            board.fulou({ l: 1, m: 'p111=' });
            board.dapai({ l: 1, p: 's1' });
            return { seats: board.player_id, points: board.defen, wall: board.shan.paishu,
                hands: board.shoupai.map(hand => hand.toString()),
                rivers: board.he.map(river => river._pai) };
        }
        const snapshot = play();
        expect(snapshot.wall).toBe(54);
        expect(snapshot.rivers).toEqual([['p1='], ['s1'], []]);
        expect(play()).toEqual(snapshot);
    });

    test('legal calls disallow chi and empty-wall pon; red five lookup stays normalized', () => {
        const hand = Shoupai.fromString('p550s123456789z1');
        const config = rule();
        expect(Game.get_chi_mianzi(config, hand, 's1=', 20)).toEqual([]);
        expect(Game.get_peng_mianzi(config, hand, 'p5=', 0)).toEqual([]);
        expect(Game.get_gang_mianzi(config, hand, 'p5=', 20, 0)).toEqual(['p5505=']);
        const river = new He().dapai('p0_*');
        expect(river.find('p5')).toBe(true);
        expect(river._pai).toEqual(['p0_*']);
    });

    test('wall draws exactly 94 live tiles before dead wall and excludes illegal ranks', () => {
        const wall = new Shan(rule());
        const draws = [];
        while (wall.paishu > 0) draws.push(wall.zimo());
        expect(draws).toHaveLength(94);
        expect(draws.every(tile => !/^m[02-8]$/.test(tile))).toBe(true);
        expect(() => wall.zimo()).toThrow();
        expect(Shoupai.valid_pai('m0')).toBeNull();
        expect(Shoupai.valid_mianzi('m555-')).toBeUndefined();
    });
});
