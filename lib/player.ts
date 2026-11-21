/*
 *  Majiang.Player
 */
"use strict";

import Shoupai = require('./shoupai');
import Board = require('./board');
import Game = require('./game');
import rule = require('./rule');
import Xiangting = require('./xiangting');

type Rule = ReturnType<typeof rule>;
type Opening = Parameters<Board['kaiju']>[0] & { id: number; rule: Rule };
type Deal = Parameters<Board['qipai']>[0];
type Draw = Parameters<Board['zimo']>[0];
type Discard = Parameters<Board['dapai']>[0];
type Meld = Parameters<Board['fulou']>[0];
type Dora = Parameters<Board['kaigang']>[0];
type Win = Parameters<Board['hule']>[0];
type DrawResult = Parameters<Board['pingju']>[0];
type End = Parameters<Board['jieju']>[0];
type Update = { zimo?: Draw; gangzimo?: Draw; dapai?: Discard; fulou?: Meld;
    gang?: Meld; kaigang?: Dora; hule?: Win; pingju?: DrawResult };
type Message = Update & { kaiju?: Opening; qipai?: Deal; jieju?: End };
type Reply = { daopai?: string; hule?: boolean; gang?: string; dapai?: string; fulou?: string };
type View = { kaiju(id: number): void; redraw(): void; update(event: Update): void; summary(paipu: End): void };

class Player {
    _model: Board;
    _id = 0;
    _rule = rule();
    _menfeng = 0;
    _diyizimo = true;
    _n_gang = 0;
    _neng_rong = true;
    _view?: View;
    _callback?: (reply: Reply) => void;
    _paipu?: End;

    constructor() {
        this._model = new Board();
    }

    action(msg: Message, callback?: (reply: Reply) => void) {

        this._callback = callback;

        if (msg.kaiju) this.kaiju(msg.kaiju);
        else if (msg.qipai) this.qipai(msg.qipai);
        else if (msg.zimo) this.zimo(msg.zimo);
        else if (msg.dapai) this.dapai(msg.dapai);
        else if (msg.fulou) this.fulou(msg.fulou);
        else if (msg.gang) this.gang(msg.gang);
        else if (msg.gangzimo) this.zimo(msg.gangzimo, true)
        else if (msg.kaigang) this.kaigang(msg.kaigang);
        else if (msg.hule) this.hule(msg.hule);
        else if (msg.pingju) this.pingju(msg.pingju);
        else if (msg.jieju) this.jieju(msg.jieju);
    }

    get shoupai() { return this._model.shoupai[this._menfeng] }
    get he() { return this._model.he[this._menfeng] }
    get shan() {
        if (!this._model.shan) throw new Error('No hand has been dealt');
        return this._model.shan;
    }
    get hulepai() {
        return Xiangting.xiangting(this.shoupai) == 0
            && Xiangting.tingpai(this.shoupai)
            || [];
    }
    get model() { return this._model }
    set view(view: View | undefined) { this._view = view }

    kaiju(kaiju: Opening) {
        this._id = kaiju.id;
        this._rule = kaiju.rule;
        this._model.kaiju(kaiju);
        if (this._view) this._view.kaiju(kaiju.id);

        if (this._callback) this.action_kaiju(kaiju);
    }

    qipai(qipai: Deal) {
        this._model.qipai(qipai);
        const model = this._model;
        this._menfeng = (this._id + 3 - model.qijia + 3 - model.jushu) % 3;
        this._diyizimo = true;
        this._n_gang = 0;
        this._neng_rong = true;
        if (this._view) this._view.redraw();

        if (this._callback) this.action_qipai(qipai);
    }

    zimo(zimo: Draw, gangzimo = false) {
        this._model.zimo(zimo);
        if (gangzimo) this._n_gang++;
        if (this._view) {
            if (gangzimo) this._view.update({ gangzimo: zimo });
            else this._view.update({ zimo: zimo });
        }

        if (this._callback) this.action_zimo(zimo, gangzimo);
    }

    dapai(dapai: Discard) {

        if (dapai.l == this._menfeng) {
            if (!this.shoupai.lizhi) this._neng_rong = true;
        }

        this._model.dapai(dapai);
        if (this._view) this._view.update({ dapai: dapai });

        if (this._callback) this.action_dapai(dapai);

        if (dapai.l == this._menfeng) {
            this._diyizimo = false;
            if (this.hulepai.find(p => this.he.find(p))) this._neng_rong = false;
        }
        else {
            let s = dapai.p[0], n = +dapai.p[1] || 5;
            if (this.hulepai.find(p => p == s + n)) this._neng_rong = false;
        }
    }

    fulou(fulou: Meld) {
        this._model.fulou(fulou);
        if (this._view) this._view.update({ fulou: fulou });

        if (this._callback) this.action_fulou(fulou);

        this._diyizimo = false;
    }

    gang(gang: Meld) {
        this._model.gang(gang);
        if (this._view) this._view.update({ gang: gang });

        if (this._callback) this.action_gang(gang);

        this._diyizimo = false;
        if (gang.l != this._menfeng && !gang.m.match(/^[mpsz]\d{4}$/)) {
            let s = gang.m[0], n = +gang.m.slice(-1) || 5;
            if (this.hulepai.find(p => p == s + n)) this._neng_rong = false;
        }
    }

    kaigang(kaigang: Dora) {
        this._model.kaigang(kaigang);
        if (this._view) this._view.update({ kaigang: kaigang });
    }

    hule(hule: Win) {
        this._model.hule(hule);
        if (this._view) this._view.update({ hule: hule });
        if (this._callback) this.action_hule(hule);
    }

    pingju(pingju: DrawResult) {
        this._model.pingju(pingju);
        if (this._view) this._view.update({ pingju: pingju });
        if (this._callback) this.action_pingju(pingju);
    }

    jieju(paipu: End) {
        this._model.jieju(paipu);
        this._paipu = paipu;
        if (this._view) this._view.summary(paipu);
        if (this._callback) this.action_jieju(paipu);
    }

    get_dapai(shoupai: Shoupai) {
        return Game.get_dapai(this._rule, shoupai);
    }
    get_chi_mianzi(shoupai: Shoupai, p: string) {
        return Game.get_chi_mianzi(this._rule, shoupai, p,
            this.shan.paishu);
    }
    get_peng_mianzi(shoupai: Shoupai, p: string) {
        return Game.get_peng_mianzi(this._rule, shoupai, p,
            this.shan.paishu);
    }
    get_gang_mianzi(shoupai: Shoupai, p?: string) {
        return Game.get_gang_mianzi(this._rule, shoupai, p,
            this.shan.paishu, this._n_gang);
    }
    allow_lizhi(shoupai: Shoupai, p: string | null) {
        return Game.allow_lizhi(this._rule, shoupai, p,
            this.shan.paishu,
            this._model.defen[this._id]);
    }
    allow_hule(shoupai: Shoupai, p: string | null, hupai = false) {
        hupai = hupai || shoupai.lizhi || this.shan.paishu == 0;
        return Game.allow_hule(this._rule, shoupai, p,
            this._model.zhuangfeng, this._menfeng,
            hupai, this._neng_rong);
    }
    allow_pingju(shoupai: Shoupai) {
        return Game.allow_pingju(this._rule, shoupai,
            this._diyizimo);
    }
    allow_no_daopai(shoupai: Shoupai) {
        return Game.allow_no_daopai(this._rule, shoupai,
            this.shan.paishu);
    }
}

interface Player {
    action_kaiju(event: Opening): void;
    action_qipai(event: Deal): void;
    action_zimo(event: Draw, replacement: boolean): void;
    action_dapai(event: Discard): void;
    action_fulou(event: Meld): void;
    action_gang(event: Meld): void;
    action_hule(event: Win): void;
    action_pingju(event: DrawResult): void;
    action_jieju(event: End): void;
}

export = Player;
