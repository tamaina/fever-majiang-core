/*
 *  Majiang.Game message and score contracts
 */
import type createRule = require('./rule');

export type Rule = ReturnType<typeof createRule>;
export type TileEvent = { l: number; p: string };
export type MeldEvent = { l: number; m: string };
export type Kaigang = { baopai?: string };
export type Kaiju = { id: number; rule: Rule; title: string; player: string[]; qijia: number };
export type Qipai = {
    zhuangfeng: number; jushu: number; changbang: number; lizhibang: number;
    defen: number[]; baopai: string; shoupai: string[];
};
export type Yaku = { name: string; fanshu: number | string; baojia?: string };
export type Hule = {
    l: number; shoupai: string; baojia: number | null; fubaopai: string[] | null;
    fu?: number; fanshu?: number; damanguan?: number;
    defen: number; hupai?: Yaku[]; fenpei: number[];
};
export type Pingju = { name: string; shoupai: string[]; fenpei: number[] };
export type HandMessages = {
    qipai: Qipai;
    zimo: TileEvent;
    dapai: TileEvent;
    fulou: MeldEvent;
    gang: MeldEvent;
    gangzimo: TileEvent;
    kaigang: Kaigang;
    hule: Hule;
    pingju: Pingju;
};
export type HandEvent = {
    [K in keyof HandMessages]: { [P in K]: HandMessages[K] };
}[keyof HandMessages];
export type Paipu = {
    title: string; player: string[]; qijia: number;
    log: HandEvent[][]; defen: number[]; point: string[]; rank: number[];
};
export type GameMessages = HandMessages & { kaiju: Kaiju; jieju: Paipu };
export type GameMessageType = keyof GameMessages;
export type GameMessage<K extends GameMessageType = GameMessageType> = {
    [P in K]: { [Q in P]: GameMessages[P] } &
        Partial<Record<Exclude<GameMessageType, P>, never>> & { timer?: [number, number] };
}[K];
export type PlayerReply = { daopai?: string; hule?: boolean; gang?: string; dapai?: string; fulou?: string };
export type ReplyCallback = (reply?: PlayerReply | null) => void;
export type GamePlayer = {
    name?: string;
    action(message: GameMessage, callback?: ReplyCallback): void;
};
export type GameHandler = (paipu?: Paipu) => void;
export type GameView = {
    say(name: string, l: number): void;
    kaiju(): void;
    redraw(): void;
    update(event?: HandEvent): void;
    summary(paipu: Paipu): void;
};
