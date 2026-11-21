/*
 *  Majiang.Game
 */
import createRule = require('./rule');
import Shoupai = require('./shoupai');
import Shan = require('./shan');
import He = require('./he');
import Xiangting = require('./xiangting');
import HuleUtil = require('./hule');
import type {
    GameHandler, GameMessage, GameMessageType, GamePlayer, GameView,
    HandEvent, Hule, Paipu, PlayerReply, Rule,
} from './protocol';

const Majiang = {
    rule: createRule, Shoupai, Shan, He,
    Util: Object.assign(Xiangting, HuleUtil),
};

type Wall = {
    zimo(): string; gangzimo(): string;
    kaigang(): unknown; close(): unknown;
    readonly paishu: number;
    readonly baopai: string[];
    readonly fubaopai: string[] | null;
};
type GameModel = {
    title: string; player: string[]; player_id: number[];
    qijia: number; zhuangfeng: number; jushu: number;
    changbang: number; lizhibang: number; defen: number[];
    shan: Wall | null;
    shoupai: (Shoupai | null)[]; he: (He | null)[];
    player_connected: boolean[]; lunban?: number;
};
// qipai sets the wall, hands, rivers and turn before play progresses.
type ActiveHand = Omit<GameModel, 'shan' | 'shoupai' | 'he' | 'lunban'> & { shan: Wall; shoupai: Shoupai[]; he: He[]; lunban: number };

function jsonClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

class Game {
    declare _players: GamePlayer[];
    declare _handler: GameHandler | undefined;
    declare _rule: Rule;
    declare _title: string;
    declare _model: GameModel;
    declare _view: GameView | null;
    declare _wait: number;
    declare _speed: number;
    declare _stop: false | (() => void) | null;
    declare _reply: PlayerReply[];
    declare _sync: boolean;
    declare _delay: boolean;
    declare _timeout_id: ReturnType<typeof setTimeout> | undefined;
    declare _status: GameMessageType | undefined;
    declare _max_jushu: number;
    declare _paipu: Paipu;
    declare _diyizimo: boolean;
    declare _fengpai: boolean;
    declare _dapai: string | null;
    declare _gang: string | null;
    declare _lizhi: number[];
    declare _yifa: (number | boolean)[];
    declare _n_gang: number[];
    declare _neng_rong: (number | boolean)[];
    declare _hule: number[];
    declare _hule_option: 'qianggang' | 'lingshang' | null;
    declare _no_game: boolean;
    declare _lianzhuang: boolean;
    declare _changbang: number;
    declare _fenpei: number[] | null;

    constructor(players?: GamePlayer[] | null, callback?: GameHandler, rule?: Rule | null, title?: string | null) {

        if (!players) players = [];

        this._players = players;
        this._handler = callback;
        this._rule = rule ? rule : Majiang.rule();
        this._title = title ?? '電脳麻将';

        this._model = {
            title: this._title,
            player: ['', '', ''],
            player_id: [0, 1, 2],
            qijia: 0,
            zhuangfeng: 0,
            jushu: 0,
            changbang: 0,
            lizhibang: 0,
            defen: [0, 0, 0].map(() => this._rule['配給原点']),
            shan: null,
            shoupai: [null, null, null],
            he: [null, null, null],
            player_connected: [true, true, true]
        };

        for (let id = 0; id < 3; id++) {
            if (players[id]) this._model.player[id] = players[id].name || '';
        }

        this._view = null;
        this._wait = 0;
        this._speed = 3;
        this._stop = false;
        this._reply = [];

        this._sync = false;
        this._delay = false;
        this._timeout_id;
    }

    get model() { return this._model }
    set view(view: GameView | null) { this._view = view }
    get speed() { return this._speed }
    set speed(speed: number) { this._speed = speed }
    set wait(wait: number) { this._wait = wait }

    set handler(callback: GameHandler | undefined) { this._handler = callback }

    add_paipu(paipu: HandEvent) {
        this._paipu.log[this._paipu.log.length - 1].push(paipu);
    }

    delay(callback: () => void, timeout?: number | null) {

        if (this._sync) return callback();

        timeout = this._speed == 0 ? 0
            : timeout == null ? Math.max(500, this._speed * 200)
                : timeout;
        setTimeout(callback, timeout);
    }

    say(name: string, l: number) {
        if (this._view) this._view.say(name, l);
    }

    stop(callback = () => { }) {
        this._stop = callback;
    }

    start() {
        if (this._timeout_id) return;
        this._stop = null;
        this._timeout_id = setTimeout(() => this.next(), 0);
    }

    notify_players(type: GameMessageType, msg: GameMessage[]) {

        for (let l = 0; l < 3; l++) {
            let id = this._model.player_id[l];
            if (this._sync)
                this._players[id].action(msg[l]);
            else setTimeout(() => {
                this._players[id].action(msg[l]);
            }, 0);
        }
    }

    call_players(type: GameMessageType, msg: GameMessage[], timeout?: number | null) {

        timeout = this._speed == 0 ? 0
            : timeout == null ? this._speed * 200
                : timeout;
        this._status = type;
        this._reply = [];
        for (let l = 0; l < 3; l++) {
            let id = this._model.player_id[l];
            if (this._sync)
                this._players[id].action(
                    msg[l], reply => this.reply(id, reply));
            else setTimeout(() => {
                this._players[id].action(
                    msg[l], reply => this.reply(id, reply));
            }, 0);
        }
        if (!this._sync)
            this._timeout_id = setTimeout(() => this.next(), timeout);
    }

    reply(id: number, reply?: PlayerReply | null) {
        this._reply[id] = reply || {};
        if (this._sync) return;
        if (this._reply.filter(x => x).length < 3) return;
        if (!this._timeout_id)
            this._timeout_id = setTimeout(() => this.next(), 0);
    }

    next() {
        this._timeout_id = clearTimeout(this._timeout_id) as undefined;
        if (this._reply.filter(x => x).length < 3) return;
        if (this._stop) return this._stop();

        if (this._status == 'kaiju') this.reply_kaiju();
        else if (this._status == 'qipai') this.reply_qipai();
        else if (this._status == 'zimo') this.reply_zimo();
        else if (this._status == 'dapai') this.reply_dapai();
        else if (this._status == 'fulou') this.reply_fulou();
        else if (this._status == 'gang') this.reply_gang();
        else if (this._status == 'gangzimo') this.reply_zimo();
        else if (this._status == 'hule') this.reply_hule();
        else if (this._status == 'pingju') this.reply_pingju();
        else this._handler!(this._paipu);
    }

    do_sync() {

        this._sync = true;

        this.kaiju();

        for (; ;) {
            if (this._status == 'kaiju') this.reply_kaiju();
            else if (this._status == 'qipai') this.reply_qipai();
            else if (this._status == 'zimo') this.reply_zimo();
            else if (this._status == 'dapai') this.reply_dapai();
            else if (this._status == 'fulou') this.reply_fulou();
            else if (this._status == 'gang') this.reply_gang();
            else if (this._status == 'gangzimo') this.reply_zimo();
            else if (this._status == 'hule') this.reply_hule();
            else if (this._status == 'pingju') this.reply_pingju();
            else break;
        }

        this._handler!(this._paipu);

        return this;
    }

    kaiju(qijia?: number | null) {

        this._model.qijia = qijia ?? Math.floor(Math.random() * 3);

        this._max_jushu = this._rule['場数'] == 0 ? 0
            : this._rule['場数'] * 3 - 1;

        this._paipu = {
            title: this._model.title,
            player: this._model.player,
            qijia: this._model.qijia,
            log: [],
            defen: this._model.defen.concat(),
            point: [],
            rank: []
        };

        let msg: GameMessage<'kaiju'>[] = [];
        for (let id = 0; id < 3; id++) {
            msg[id] = jsonClone({
                kaiju: {
                    id: id,
                    rule: this._rule,
                    title: this._paipu.title,
                    player: this._paipu.player,
                    qijia: this._paipu.qijia
                }
            });
        }
        this.call_players('kaiju', msg, 0);

        if (this._view) this._view.kaiju();
    }

    qipai(shan?: Wall | null) {

        let model = this._model as ActiveHand;

        model.shan = shan || new Majiang.Shan(this._rule);
        for (let l = 0; l < 3; l++) {
            let qipai = [];
            for (let i = 0; i < 13; i++) {
                qipai.push(model.shan.zimo());
            }
            model.shoupai[l] = new Majiang.Shoupai(qipai);
            model.he[l] = new Majiang.He();
            model.player_id[l] = (model.qijia + model.jushu + l) % 3;
        }
        model.lunban = -1;

        this._diyizimo = true;
        this._fengpai = this._rule['途中流局あり'];

        this._dapai = null;
        this._gang = null;

        this._lizhi = [0, 0, 0];
        this._yifa = [0, 0, 0];
        this._n_gang = [0, 0, 0];
        this._neng_rong = [1, 1, 1];

        this._hule = [];
        this._hule_option = null;
        this._no_game = false;
        this._lianzhuang = false;
        this._changbang = model.changbang;
        this._fenpei = null;

        this._paipu.defen = model.defen.concat();
        this._paipu.log.push([]);
        let paipu = {
            qipai: {
                zhuangfeng: model.zhuangfeng,
                jushu: model.jushu,
                changbang: model.changbang,
                lizhibang: model.lizhibang,
                defen: model.player_id.map(id => model.defen[id]),
                baopai: model.shan.baopai[0],
                shoupai: model.shoupai.map(shoupai => shoupai.toString())
            }
        };
        this.add_paipu(paipu);

        let msg: GameMessage<'qipai'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
            for (let i = 0; i < 3; i++) {
                if (i != l) msg[l].qipai.shoupai[i] = '';
            }
            msg[l].timer = [1, 0];
        }
        this.call_players('qipai', msg, 0);

        if (this._view) this._view.redraw();
    }

    zimo() {

        let model = this._model as ActiveHand;

        model.lunban = (model.lunban + 1) % 3;

        let zimo = model.shan.zimo();
        model.shoupai[model.lunban].zimo(zimo);

        let paipu = { zimo: { l: model.lunban, p: zimo } };
        this.add_paipu(paipu);

        let msg: GameMessage<'zimo'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
            if (l != model.lunban) msg[l].zimo.p = '';
            const id = model.player_id[l];
            if (id !== 0) msg[l].timer = [1, 0];
        }
        this.call_players('zimo', msg);

        if (this._view) this._view.update(paipu);
    }

    dapai(dapai: string) {

        let model = this._model as ActiveHand;

        this._yifa[model.lunban] = 0;

        if (!model.shoupai[model.lunban].lizhi)
            this._neng_rong[model.lunban] = true;

        model.shoupai[model.lunban].dapai(dapai);
        model.he[model.lunban].dapai(dapai);

        if (this._diyizimo) {
            if (!dapai.match(/^z[1234]/)) this._fengpai = false;
            if (this._dapai && this._dapai!.slice(0, 2) != dapai.slice(0, 2))
                this._fengpai = false;
        }
        else this._fengpai = false;

        if (dapai.slice(-1) == '*') {
            this._lizhi[model.lunban] = this._diyizimo ? 2 : 1;
            this._yifa[model.lunban] = this._rule['一発あり'];
        }

        if (Majiang.Util.xiangting(model.shoupai[model.lunban]) == 0
            && Majiang.Util.tingpai(model.shoupai[model.lunban])!
                .find(p => model.he[model.lunban].find(p))) {
            this._neng_rong[model.lunban] = false;
        }

        this._dapai = dapai;

        let paipu = { dapai: { l: model.lunban, p: dapai } };
        this.add_paipu(paipu);

        if (this._gang) this.kaigang();

        let msg: GameMessage<'dapai'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
            // AI側プレイヤーにだけタイマー。人間には出さない
            if (model.player_id[l] !== 0) msg[l].timer = [1, 0];
        }
        this.call_players('dapai', msg);

        if (this._view) this._view.update(paipu);
    }

    fulou(fulou: string) {

        let model = this._model as ActiveHand;

        this._diyizimo = false;
        this._yifa = [0, 0, 0];

        // まず河側を更新（捨て牌に鳴きの向きを付ける）
        model.he[model.lunban].fulou(fulou);

        // 鳴いたプレイヤーを算出
        let direction = fulou.match(/[\+\=\-]/);
        const d = direction ? direction[0] : '_';
        const idx = '_+=-'.indexOf(d);
        model.lunban = (model.lunban + 3 - idx) % 3;
        model.shoupai[model.lunban].fulou(fulou);

        if (fulou.match(/^[mpsz]\d{4}/)) {
            this._gang = fulou;
            this._n_gang[model.lunban]++;
        }

        let paipu = { fulou: { l: model.lunban, m: fulou } };
        this.add_paipu(paipu);

        let msg: GameMessage<'fulou'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
            if (model.player_id[l] !== 0) msg[l].timer = [1, 0];
        }
        this.call_players('fulou', msg);

        if (this._view) this._view.update(paipu);
    }

    gang(gang: string) {

        let model = this._model as ActiveHand;

        model.shoupai[model.lunban].gang(gang);

        let paipu = { gang: { l: model.lunban, m: gang } };
        this.add_paipu(paipu);

        if (this._gang) this.kaigang();

        this._gang = gang;
        this._n_gang[model.lunban]++;

        let msg: GameMessage<'gang'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
            if (model.player_id[l] !== 0) msg[l].timer = [1, 0];
        }
        this.call_players('gang', msg);

        if (this._view) this._view.update(paipu);
    }

    gangzimo() {

        let model = this._model as ActiveHand;

        this._diyizimo = false;
        this._yifa = [0, 0, 0];

        let zimo = model.shan.gangzimo();
        model.shoupai[model.lunban].zimo(zimo);

        let paipu = { gangzimo: { l: model.lunban, p: zimo } };
        this.add_paipu(paipu);

        if (!this._rule['カンドラ後乗せ'] ||
            this._gang!.match(/^[mpsz]\d{4}$/)) this.kaigang();

        let msg: GameMessage<'gangzimo'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
            if (l != model.lunban) msg[l].gangzimo.p = '';
            const id = model.player_id[l];
            if (id !== 0) msg[l].timer = [1, 0];
        }
        this.call_players('gangzimo', msg);

        if (this._view) this._view.update(paipu);
    }

    kaigang() {

        this._gang = null;

        if (!this._rule['カンドラあり']) return;

        let model = this._model as ActiveHand;

        model.shan.kaigang();
        let baopai = model.shan.baopai.pop();

        let paipu = { kaigang: { baopai: baopai } };
        this.add_paipu(paipu);

        let msg: GameMessage<'kaigang'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
        }
        this.notify_players('kaigang', msg);

        if (this._view) this._view.update(paipu);
    }

    hule() {

        let model = this._model as ActiveHand;

        if (this._status != 'hule') {
            model.shan.close();
            this._hule_option = this._status == 'gang' ? 'qianggang'
                : this._status == 'gangzimo' ? 'lingshang'
                    : null;
        }

        let menfeng = this._hule.length ? this._hule.shift()! : model.lunban;
        let rongpai = menfeng == model.lunban ? null
            : (this._hule_option == 'qianggang'
                ? this._gang![0] + this._gang!.slice(-1)
                : this._dapai!.slice(0, 2)
            ) + '_+=-'[(3 + model.lunban - menfeng) % 3];
        let shoupai = model.shoupai[menfeng].clone();
        let fubaopai = shoupai.lizhi ? model.shan.fubaopai : null;

        let param = {
            rule: this._rule,
            zhuangfeng: model.zhuangfeng,
            menfeng: menfeng,
            hupai: {
                lizhi: this._lizhi[menfeng],
                yifa: this._yifa[menfeng],
                qianggang: this._hule_option == 'qianggang',
                lingshang: this._hule_option == 'lingshang',
                haidi: model.shan.paishu > 0
                    || this._hule_option == 'lingshang' ? 0
                    : !rongpai ? 1
                        : 2,
                tianhu: !(this._diyizimo && !rongpai) ? 0
                    : menfeng == 0 ? 1
                        : 2
            },
            baopai: model.shan.baopai,
            fubaopai: fubaopai,
            jicun: {
                changbang: model.changbang,
                lizhibang: model.lizhibang
            }
        };
        let hule = Majiang.Util.hule(shoupai, rongpai, param)!;

        if (this._rule['連荘方式'] > 0 && menfeng == 0) this._lianzhuang = true;
        if (this._rule['場数'] == 0) this._lianzhuang = false;
        this._fenpei = hule.fenpei!;

        let paipu: { hule: Hule } = {
            hule: {
                l: menfeng,
                shoupai: rongpai ? shoupai.zimo(rongpai).toString()
                    : shoupai.toString(),
                baojia: rongpai ? model.lunban : null,
                fubaopai: fubaopai,
                fu: hule.fu,
                fanshu: hule.fanshu,
                damanguan: hule.damanguan,
                defen: hule.defen,
                hupai: hule.hupai,
                fenpei: hule.fenpei!
            }
        };
        for (let key of ['fu', 'fanshu', 'damanguan'] as const) {
            if (!paipu.hule[key]) delete paipu.hule[key];
        }
        this.add_paipu(paipu);

        let msg: GameMessage<'hule'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
        }
        this.call_players('hule', msg, this._wait);

        if (this._view) this._view.update(paipu);
    }

    pingju(name?: string | null, shoupai: string[] = ['', '', '']) {

        let model = this._model as ActiveHand;

        let fenpei = [0, 0, 0];

        if (!name) {

            let n_tingpai = 0;
            for (let l = 0; l < 3; l++) {
                if (this._rule['ノーテン宣言あり'] && !shoupai[l]
                    && !model.shoupai[l].lizhi) continue;
                if (!this._rule['ノーテン罰あり']
                    && (this._rule['連荘方式'] != 2 || l != 0)
                    && !model.shoupai[l].lizhi) {
                    shoupai[l] = '';
                }
                else if (Majiang.Util.xiangting(model.shoupai[l]) == 0
                    && Majiang.Util.tingpai(model.shoupai[l])!.length > 0) {
                    n_tingpai++;
                    shoupai[l] = model.shoupai[l].toString();
                    if (this._rule['連荘方式'] == 2 && l == 0)
                        this._lianzhuang = true;
                }
                else {
                    shoupai[l] = '';
                }
            }
            if (this._rule['流し満貫あり']) {
                for (let l = 0; l < 3; l++) {
                    let all_yaojiu = true;
                    for (let p of model.he[l]._pai) {
                        if (p.match(/[\+\=\-]$/)) { all_yaojiu = false; break }
                        if (p.match(/^z/)) continue;
                        if (p.match(/^[mps][19]/)) continue;
                        all_yaojiu = false; break;
                    }
                    if (all_yaojiu) {
                        name = '流し満貫';
                        // 役満扱いにする場合
                        if (this._rule['流し満貫は役満扱い'] && this._rule['3p簡易スコア使用'] && this._rule['3p簡易スコア表']) {
                            const table = this._rule['3p簡易スコア表'];
                            const payOya = l == 0; // 和了者が親か
                            let pay = [0, 0, 0];
                            const chang = model.changbang; // 本場数
                            if (payOya) {
                                // 親ツモ役満（13以上）: [24000,24000,24000] に本場ごと各+1000
                                const a = table.oya.tsumo[13][0];
                                pay = [a, a, a];
                                for (let i = 0; i < 3; i++) {
                                    if (i == l) fenpei[i] += a + chang * 2000 + 0; // 供託は加算しない
                                    else fenpei[i] -= a + chang * 1000;
                                }
                            }
                            else {
                                // 子ツモ役満: [12000(親),20000(子)] に本場ごと各+1000
                                const [toOya, toKo] = table.ko.tsumo[13];
                                for (let i = 0; i < 3; i++) {
                                    if (i == l) fenpei[i] += toOya + toKo + chang * 2000 + 0;
                                    else if (i == 0) fenpei[i] -= toOya + chang * 1000;
                                    else fenpei[i] -= toKo + chang * 1000;
                                }
                            }
                        }
                        else {
                            // 従来配分（3人用に調整済み）
                            for (let i = 0; i < 3; i++) {
                                fenpei[i] += l == 0 && i == l ? 12000
                                    : l == 0 ? -6000
                                        : l != 0 && i == l ? 8000
                                            : l != 0 && i == 0 ? -4000
                                                : -4000;
                            }
                        }
                    }
                }
            }
            if (!name) {
                name = '荒牌平局';
                if (this._rule['ノーテン罰あり']
                    && 0 < n_tingpai && n_tingpai < 3) {
                    const bappu = this._rule['ノーテン罰符'] || 3000;
                    for (let l = 0; l < 3; l++) {
                        fenpei[l] = shoupai[l] ? bappu / n_tingpai
                            : -bappu / (3 - n_tingpai);
                    }
                }
            }
            if (this._rule['連荘方式'] == 3) this._lianzhuang = true;
        }
        else {
            this._no_game = true;
            this._lianzhuang = true;
        }

        if (this._rule['場数'] == 0) this._lianzhuang = true;

        this._fenpei = fenpei;

        let paipu = {
            pingju: { name: name, shoupai: shoupai, fenpei: fenpei }
        };
        this.add_paipu(paipu);

        let msg: GameMessage<'pingju'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
        }
        this.call_players('pingju', msg, this._wait);

        if (this._view) this._view.update(paipu);
    }

    last() {

        let model = this._model;

        model.lunban = -1;
        if (this._view) this._view.update();

        if (!this._lianzhuang) {
            model.jushu++;
            model.zhuangfeng += (model.jushu / 3) | 0;
            model.jushu = model.jushu % 3;
        }

        let jieju = false;
        let guanjun = -1;
        const defen = model.defen;
        for (let i = 0; i < 3; i++) {
            let id = (model.qijia + i) % 3;
            if (defen[id] < 0 && this._rule['トビ終了あり']) jieju = true;
            if (defen[id] >= 30000
                && (guanjun < 0 || defen[id] > defen[guanjun])) guanjun = id;
        }

        let sum_jushu = model.zhuangfeng * 3 + model.jushu;

        if (15 < sum_jushu) jieju = true;
        else if ((this._rule['場数'] + 1) * 3 - 1 < sum_jushu) jieju = true;
        else if (this._max_jushu < sum_jushu) {
            if (this._rule['延長戦方式'] == 0) jieju = true;
            else if (this._rule['場数'] == 0) jieju = true;
            else if (guanjun >= 0) jieju = true;
            else {
                this._max_jushu += this._rule['延長戦方式'] == 3 ? 3
                    : this._rule['延長戦方式'] == 2 ? 1
                        : 0;
            }
        }
        else if (this._max_jushu == sum_jushu) {
            if (this._rule['オーラス止めあり'] && guanjun == model.player_id[0]
                && this._lianzhuang && !this._no_game) jieju = true;
        }

        if (jieju) this.delay(() => this.jieju(), 0);
        else this.delay(() => this.qipai(), 0);
    }

    jieju() {

        let model = this._model;

        let paiming: number[] = [];
        const defen = model.defen;
        for (let i = 0; i < 3; i++) {
            let id = (model.qijia + i) % 3;
            for (let j = 0; j < 3; j++) {
                if (j == paiming.length || defen[id] > defen[paiming[j]]) {
                    paiming.splice(j, 0, id);
                    break;
                }
            }
        }
        defen[paiming[0]] += model.lizhibang * 1000;
        this._paipu.defen = defen;

        let rank = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            rank[paiming[i]] = i + 1;
        }
        this._paipu.rank = rank;

        const round = !this._rule['順位点'].find(p => p.match(/\.\d$/));
        let point = [0, 0, 0];
        for (let i = 1; i < 3; i++) {
            let id = paiming[i];
            point[id] = (defen[id] - 30000) / 1000
                + + this._rule['順位点'][i];
            if (round) point[id] = Math.round(point[id]);
            point[paiming[0]] -= point[id];
        }
        this._paipu.point = point.map(p => p.toFixed(round ? 0 : 1));

        let paipu = { jieju: this._paipu };

        let msg: GameMessage<'jieju'>[] = [];
        for (let l = 0; l < 3; l++) {
            msg[l] = jsonClone(paipu);
        }
        this.call_players('jieju', msg, this._wait);

        if (this._view) this._view.summary(this._paipu);

        if (this._handler) this._handler();
    }

    get_reply(l: number) {
        let model = this._model;
        return this._reply[model.player_id[l]];
    }

    reply_kaiju() { this.delay(() => this.qipai(), 0) }

    reply_qipai() { this.delay(() => this.zimo(), 0) }

    reply_zimo() {

        let model = this._model as ActiveHand;

        let reply = this.get_reply(model.lunban);
        if (reply.daopai) {
            if (this.allow_pingju()) {
                let shoupai = ['', '', ''];
                shoupai[model.lunban] = model.shoupai[model.lunban].toString();
                return this.delay(() => this.pingju('九種九牌', shoupai), 0);
            }
        }
        else if (reply.hule) {
            if (this.allow_hule()) {
                this.say('zimo', model.lunban);
                return this.delay(() => this.hule());
            }
        }
        else if (reply.gang) {
            if (this.get_gang_mianzi()!.find(m => m == reply.gang)) {
                this.say('gang', model.lunban);
                return this.delay(() => this.gang(reply.gang!));
            }
        }
        else if (reply.dapai) {
            let dapai = reply.dapai.replace(/\*$/, '');
            if (this.get_dapai()!.find(p => p == dapai)) {
                if (reply.dapai.slice(-1) == '*' && this.allow_lizhi(dapai)) {
                    this.say('lizhi', model.lunban);
                    return this.delay(() => this.dapai(reply.dapai!));
                }
                return this.delay(() => this.dapai(dapai), 0);
            }
        }

        let p = this.get_dapai()!.pop();
        this.delay(() => this.dapai(p!), 0);
    }

    reply_dapai() {

        let model = this._model as ActiveHand;

        for (let i = 1; i < 3; i++) {
            let l = (model.lunban + i) % 3;
            let reply = this.get_reply(l);
            if (reply.hule && this.allow_hule(l)) {
                if (this._rule['最大同時和了数'] == 1 && this._hule.length)
                    continue;
                this.say('rong', l);
                this._hule.push(l);
            }
            else {
                let shoupai = model.shoupai[l].clone().zimo(this._dapai!);
                if (Majiang.Util.xiangting(shoupai) == -1)
                    this._neng_rong[l] = false;
            }
        }
        if (this._hule.length == 2 && this._rule['最大同時和了数'] == 2) {
            let shoupai = ['', '', ''];
            for (let l of this._hule) {
                shoupai[l] = model.shoupai[l].toString();
            }
            return this.delay(() => this.pingju('两家和', shoupai));
        }
        else if (this._hule.length) {
            return this.delay(() => this.hule());
        }

        if (this._dapai!.slice(-1) == '*') {
            model.defen[model.player_id[model.lunban]] -= 1000;
            model.lizhibang++;

            if (this._lizhi.filter(x => x).length == 3
                && this._rule['途中流局あり']) {
                let shoupai = model.shoupai.map(s => s.toString());
                return this.delay(() => this.pingju('三家立直', shoupai));
            }
        }

        if (this._diyizimo && model.lunban == 2) {
            this._diyizimo = false;
            if (this._fengpai) {
                return this.delay(() => this.pingju('三風連打'), 0);
            }
        }

        if (this._n_gang.reduce((x, y) => x + y) == 3) {
            if (Math.max(...this._n_gang) < 3 && this._rule['途中流局あり']) {
                return this.delay(() => this.pingju('三開杠'), 0);
            }
        }

        if (!model.shan.paishu) {
            let shoupai = ['', '', ''];
            for (let l = 0; l < 3; l++) {
                let reply = this.get_reply(l);
                if (reply.daopai) shoupai[l] = reply.daopai;
            }
            return this.delay(() => this.pingju('', shoupai), 0);
        }

        for (let i = 1; i < 3; i++) {
            let l = (model.lunban + i) % 3;
            let reply = this.get_reply(l);
            if (reply.fulou) {
                let m = reply.fulou.replace(/0/g, '5');
                if (m.match(/^[mpsz](\d)\1\1\1/)) {
                    if (this.get_gang_mianzi(l)!.find(m => m == reply.fulou)) {
                        this.say('gang', l);
                        return this.delay(() => this.fulou(reply.fulou!));
                    }
                }
                else if (m.match(/^[mpsz](\d)\1\1/)) {
                    if (this.get_peng_mianzi(l)!.find(m => m == reply.fulou)) {
                        this.say('peng', l);
                        return this.delay(() => this.fulou(reply.fulou!));
                    }
                }
            }
        }

        this.delay(() => this.zimo(), 0);
    }

    reply_fulou() {

        let model = this._model as ActiveHand;

        if (this._gang) {
            return this.delay(() => this.gangzimo(), 0);
        }

        let reply = this.get_reply(model.lunban);
        if (reply.dapai) {
            if (this.get_dapai()!.find(p => p == reply.dapai)) {
                return this.delay(() => this.dapai(reply.dapai!), 0);
            }
        }

        let p = this.get_dapai()!.pop();
        this.delay(() => this.dapai(p!), 0);
    }

    reply_gang() {

        let model = this._model as ActiveHand;

        if (this._gang!.match(/^[mpsz]\d{4}$/)) {
            return this.delay(() => this.gangzimo(), 0);
        }

        for (let i = 1; i < 3; i++) {
            let l = (model.lunban + i) % 3;
            let reply = this.get_reply(l);
            if (reply.hule && this.allow_hule(l)) {
                if (this._rule['最大同時和了数'] == 1 && this._hule.length)
                    continue;
                this.say('rong', l);
                this._hule.push(l);
            }
            else {
                let p = this._gang![0] + this._gang!.slice(-1);
                let shoupai = model.shoupai[l].clone().zimo(p);
                if (Majiang.Util.xiangting(shoupai) == -1)
                    this._neng_rong[l] = false;
            }
        }
        if (this._hule.length) {
            return this.delay(() => this.hule());
        }

        this.delay(() => this.gangzimo(), 0);
    }

    reply_hule() {

        let model = this._model;

        for (let l = 0; l < 3; l++) {
            model.defen[model.player_id[l]] += this._fenpei![l];
        }
        model.changbang = 0;
        model.lizhibang = 0;

        if (this._hule.length) {
            return this.delay(() => this.hule());
        }
        else {
            if (this._lianzhuang) model.changbang = this._changbang + 1;
            return this.delay(() => this.last(), 0);
        }
    }

    reply_pingju() {

        let model = this._model;

        for (let l = 0; l < 3; l++) {
            model.defen[model.player_id[l]] += this._fenpei![l];
        }
        model.changbang++;

        this.delay(() => this.last(), 0);
    }

    get_dapai() {
        let model = this._model as ActiveHand;
        return Game.get_dapai(this._rule, model.shoupai[model.lunban]);
    }

    get_chi_mianzi(l?: number): string[] {
        // チー関連の処理を無効化
        return [];
    }

    get_peng_mianzi(l: number) {
        let model = this._model as ActiveHand;
        let d = '_+=-'[(3 + model.lunban - l) % 3];
        return Game.get_peng_mianzi(this._rule, model.shoupai[l],
            this._dapai + d, model.shan.paishu);
    }

    get_gang_mianzi(l?: number | null) {
        let model = this._model as ActiveHand;
        if (l == null) {
            return Game.get_gang_mianzi(this._rule, model.shoupai[model.lunban],
                null, model.shan.paishu,
                this._n_gang.reduce((x, y) => x + y));
        }
        else {
            let d = '_+=-'[(3 + model.lunban - l) % 3];
            return Game.get_gang_mianzi(this._rule, model.shoupai[l],
                this._dapai + d, model.shan.paishu,
                this._n_gang.reduce((x, y) => x + y));
        }
    }

    allow_lizhi(p?: string | null) {
        let model = this._model as ActiveHand;
        return Game.allow_lizhi(this._rule, model.shoupai[model.lunban],
            p, model.shan.paishu,
            model.defen[model.player_id[model.lunban]]);
    }

    allow_hule(l?: number | null) {
        let model = this._model as ActiveHand;
        if (l == null) {
            let hupai = model.shoupai[model.lunban].lizhi
                || this._status == 'gangzimo'
                || model.shan.paishu == 0;
            return Game.allow_hule(this._rule,
                model.shoupai[model.lunban], null,
                model.zhuangfeng, model.lunban, hupai);
        }
        else {
            let p = (this._status == 'gang'
                ? this._gang![0] + this._gang!.slice(-1)
                : this._dapai
            ) + '_+=-'[(3 + model.lunban - l) % 3];
            let hupai = model.shoupai[l].lizhi
                || this._status == 'gang'
                || model.shan.paishu == 0;
            return Game.allow_hule(this._rule,
                model.shoupai[l], p,
                model.zhuangfeng, l, hupai,
                this._neng_rong[l]);
        }
    }

    allow_pingju() {
        let model = this._model as ActiveHand;
        return Game.allow_pingju(this._rule, model.shoupai[model.lunban],
            this._diyizimo);
    }

    static get_dapai(rule: Rule, shoupai: Shoupai) {

        if (rule['喰い替え許可レベル'] == 0) return shoupai.get_dapai(true);
        if (rule['喰い替え許可レベル'] == 1
            && shoupai._zimo && shoupai._zimo.length > 2) {
            let deny = shoupai._zimo[0]
                + (+shoupai._zimo.match(/\d(?=[\+\=\-])/)! || 5);
            return shoupai.get_dapai(false)!
                .filter(p => p.replace(/0/, '5') != deny);
        }
        return shoupai.get_dapai(false);
    }

    static get_chi_mianzi(rule: Rule, shoupai: Shoupai, p: string, paishu: number): string[] {
        // チー関連の処理を無効化
        return [];
    }

    static get_peng_mianzi(rule: Rule, shoupai: Shoupai, p: string, paishu: number) {

        let mianzi = shoupai.get_peng_mianzi(p);
        if (!mianzi) return mianzi;
        return paishu == 0 ? [] : mianzi;
    }

    static get_gang_mianzi(rule: Rule, shoupai: Shoupai, p: string | null | undefined, paishu: number, n_gang: number) {

        let mianzi = shoupai.get_gang_mianzi(p);
        if (!mianzi || mianzi.length == 0) return mianzi;

        if (shoupai.lizhi) {
            if (rule['リーチ後暗槓許可レベル'] == 0) return [];
            else if (rule['リーチ後暗槓許可レベル'] == 1) {
                let new_shoupai, n_hule1 = 0, n_hule2 = 0;
                new_shoupai = shoupai.clone().dapai(shoupai._zimo!);
                for (let p of Majiang.Util.tingpai(new_shoupai)!) {
                    n_hule1 += Majiang.Util.hule_mianzi(new_shoupai, p).length;
                }
                new_shoupai = shoupai.clone().gang(mianzi[0]);
                for (let p of Majiang.Util.tingpai(new_shoupai)!) {
                    n_hule2 += Majiang.Util.hule_mianzi(new_shoupai, p).length;
                }
                if (n_hule1 > n_hule2) return [];
            }
            else {
                let new_shoupai;
                new_shoupai = shoupai.clone().dapai(shoupai._zimo!);
                let n_tingpai1 = Majiang.Util.tingpai(new_shoupai)!.length;
                new_shoupai = shoupai.clone().gang(mianzi[0]);
                if (Majiang.Util.xiangting(new_shoupai) > 0) return [];
                let n_tingpai2 = Majiang.Util.tingpai(new_shoupai)!.length;
                if (n_tingpai1 > n_tingpai2) return [];
            }
        }
        return paishu == 0 || n_gang == 3 ? [] : mianzi;
    }

    static allow_lizhi(rule: Rule, shoupai: Shoupai, p: string | null | undefined, paishu: number, defen: number) {

        if (!shoupai._zimo) return false;
        if (shoupai.lizhi) return false;
        if (!shoupai.menqian) return false;

        if (!rule['ツモ番なしリーチあり'] && paishu < 3) return false;
        if (rule['トビ終了あり'] && defen < 1000) return false;

        if (Majiang.Util.xiangting(shoupai) > 0) return false;

        if (p) {
            let new_shoupai = shoupai.clone().dapai(p);
            return Majiang.Util.xiangting(new_shoupai) == 0
                && Majiang.Util.tingpai(new_shoupai)!.length > 0;
        }
        else {
            let dapai = [];
            for (let p of Game.get_dapai(rule, shoupai)!) {
                let new_shoupai = shoupai.clone().dapai(p);
                if (Majiang.Util.xiangting(new_shoupai) == 0
                    && Majiang.Util.tingpai(new_shoupai)!.length > 0) {
                    dapai.push(p);
                }
            }
            return dapai.length ? dapai : false;
        }
    }

    static allow_hule(rule: Rule, shoupai: Shoupai, p: string | null, zhuangfeng: number, menfeng: number, hupai: boolean, neng_rong?: boolean | number) {

        if (p && !neng_rong) return false;

        let new_shoupai = shoupai.clone();
        if (p) new_shoupai.zimo(p);
        if (Majiang.Util.xiangting(new_shoupai) != -1) return false;

        if (hupai) return true;

        let param = {
            rule: rule,
            zhuangfeng: zhuangfeng,
            menfeng: menfeng,
            hupai: {},
            baopai: [],
            jicun: { changbang: 0, lizhibang: 0 }
        };
        let hule = Majiang.Util.hule(shoupai, p, param);

        return hule!.hupai != null;
    }

    static allow_pingju(rule: Rule, shoupai: Shoupai, diyizimo: boolean) {

        if (!(diyizimo && shoupai._zimo)) return false;
        if (!rule['途中流局あり']) return false;

        let n_yaojiu = 0;
        for (let s of ['m', 'p', 's', 'z'] as const) {
            let bingpai = shoupai._bingpai[s];
            let nn = (s == 'z') ? [1, 2, 3, 4, 5, 6, 7] : [1, 9];
            for (let n of nn) {
                if (bingpai[n] > 0) n_yaojiu++;
            }
        }
        return n_yaojiu >= 9;
    }

    static allow_no_daopai(rule: Rule, shoupai: Shoupai, paishu: number) {

        if (paishu > 0 || shoupai._zimo) return false;
        if (!rule['ノーテン宣言あり']) return false;
        if (shoupai.lizhi) return false;

        return Majiang.Util.xiangting(shoupai) == 0
            && Majiang.Util.tingpai(shoupai)!.length > 0;
    }
}

export = Game;
