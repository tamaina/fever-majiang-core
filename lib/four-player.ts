/*
 * Typed, deliberately narrow facade for the unmodified four-player engine.
 * @kobalab/majiang-core v1.4.1, copyright (c) 2021 Satoshi Kobayashi, MIT.
 */
type FourRule = { '配給原点': number; '場数': number; '赤牌': {
    m: number; p: number; s: number
}; [option: string]: unknown };
type Decision = { daopai?: string; hule?: boolean; gang?: string; dapai?: string; fulou?: string };
type Player = {
    name?: string;
    action(message: Record<string, unknown>, respond?: (reply?: Decision) => void): void;
};
type Journal = {
    title: string;
    player: string[];
    qijia: number;
    log: Record<string, unknown>[][];
    defen: number[];
    point: string[];
    rank: number[];
};
interface Hand {
    readonly lizhi: boolean;
    readonly menqian: boolean;
    clone(): Hand;
    toString(): string;
    zimo(tile: string, check?: boolean): this;
    dapai(tile: string, check?: boolean): this;
    get_dapai(check?: boolean): string[] | null;
}
interface Wall {
    readonly paishu: number;
    readonly baopai: string[];
    readonly fubaopai: string[] | null;
    zimo(): string;
    gangzimo(): string;
    kaigang(): this;
    close(): this;
}
interface FourGame {
    readonly model: { player_id: number[]; defen: number[] };
    do_sync(): this;
    kaiju(dealer?: number): void;
    qipai(wall?: Wall): void;
}
interface FourCore {
    rule(options?: Partial<FourRule>): FourRule;
    Game: {
        new (players: Player[], callback?: (journal: Journal) => void, rule?: FourRule, title?: string): FourGame;
        get_chi_mianzi(rule: FourRule, hand: Hand, tile: string, remaining: number): string[] | null;
    };
    Shan: { new (rule: FourRule): Wall; zhenbaopai(tile: string): string };
    Shoupai: { new (tiles?: string[]): Hand; fromString(tiles?: string): Hand };
    He: { new (): { dapai(tile: string): unknown; find(tile: string): boolean | undefined } };
    Board: { new (...args: never[]): unknown };
    Player: { new (...args: never[]): unknown };
    Util: { xiangting(hand: Hand): number; tingpai(hand: Hand): string[] | null };
}

// The exact upstream CommonJS package ships no declarations. This facade only
// describes the subset exercised by the package tests and validates identity.
declare function require(moduleName: '@kobalab/majiang-core'): FourCore;
const core = require('@kobalab/majiang-core');
export = core;
