import { createRequire } from 'node:module';
import { expect, test, vi } from 'vitest';

const require = createRequire(import.meta.url);
const upstream = require('@kobalab/majiang-core');
const four = require('@aqz/fever-majiang-core/four-player');
const three = require('@aqz/fever-majiang-core/three-player');

test('the four-player entry returns the unmodified installed core; root remains Fever sanma', () => {
    expect(four).toBe(upstream);
    expect(require('@aqz/fever-majiang-core')).toBe(three);
    expect(three.Game).not.toBe(four.Game);
    expect(new four.Shan(four.rule()).paishu).toBe(122);
    expect(new three.Shan(three.rule()).paishu).toBe(94);
    expect(four.Shan.zhenbaopai('m1')).toBe('m2');
    expect(three.Shan.zhenbaopai('m1')).toBe('m9');
    expect(four.Game.get_chi_mianzi(four.rule(), four.Shoupai.fromString('m124p23456s23456'), 'm3-', 20))
        .toContain('m123-');
});

function replay(engine) {
    let seed = 0xa55a;
    const randomness = vi.spyOn(Math, 'random').mockImplementation(() => {
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        return seed / 0x100000000;
    });
    let journal;
    const projectedDeals = [];
    try {
        const players = Array.from({ length: 4 }, () => ({
            action(event, reply) {
                if (event.qipai) projectedDeals.push(event.qipai.shoupai.filter(Boolean).length);
                const tile = event.zimo?.p || event.gangzimo?.p;
                reply?.(tile ? { dapai: tile + '_' } : {});
            },
        }));
        const game = new engine.Game(players, undefined, engine.rule({
            '場数': 0, '連荘方式': 0, '途中流局あり': false,
        }), 'seeded fixtures');
        game._sync = true;
        game.kaiju(0);
        for (let step = 0; step < 180; step++) {
            game.next();
            const hand = game._paipu.log[0];
            if (hand?.some(event => event.pingju || event.hule)) {
                game.next();
                journal = { log: [structuredClone(hand)], defen: [...game.model.defen] };
                break;
            }
        }
        expect(journal, 'bounded four-player hand completed').toBeDefined();
    }
    finally {
        randomness.mockRestore();
    }
    expect(journal.defen).toHaveLength(4);
    expect(journal.log[0][0].qipai.shoupai.filter(Boolean)).toHaveLength(4);
    expect(projectedDeals.slice(0, 4)).toEqual([1, 1, 1, 1]);
    expect(journal.log[0].some(event => event.pingju || event.hule)).toBe(true);
    return journal;
}

test('same seeded hand produces identical four-player play log and payouts via either entry', () => {
    expect(replay(four)).toEqual(replay(upstream));
});
