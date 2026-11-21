/*
 *  Majiang.Board
 */
"use strict";

import Shoupai = require('./shoupai');
import He = require('./he');

type Opening = { title: string; player: string[]; qijia: number };
type Deal = { zhuangfeng: number; jushu: number; changbang: number; lizhibang: number;
    baopai?: string | string[] | null; shoupai: string[]; defen: number[] };
type Draw = { l: number; p?: string | null };
type Discard = { l: number; p: string };
type Meld = { l: number; m: string };
type Dora = { baopai: string };
type Win = { l: number; baojia?: number | null; shoupai: string;
    fubaopai?: string[] | null; fenpei: number[] };
type DrawResult = { name: string; shoupai: string[]; fenpei?: number[] | null };
type End = { defen: number[] };

class Shan {
    paishu = 108 - 13 * 3 - 14;
    baopai: string[];
    fubaopai: string[] | null | undefined;
    constructor(baopai?: string | string[] | null) {
        this.baopai = typeof baopai === 'string' ? [baopai] : (baopai ?? []).slice();
    }
    zimo(p?: string | null) { this.paishu--; return p || '_'; }
    kaigang(baopai: string) { this.baopai.push(baopai); }
}

class Board {
    title = '';
    player: string[] = [];
    qijia = 0;
    zhuangfeng = 0;
    jushu = 0;
    changbang = 0;
    lizhibang = 0;
    defen: number[] = [];
    shan: Shan | null = null;
    shoupai: Shoupai[] = [];
    he: He[] = [];
    player_id: number[] = [];
    lunban = -1;

    _lizhi = false;
    _fenpei: number[] | null = null;
    _lianzhuang = false;
    _changbang = 0;
    _lizhibang = 0;

    private activeWall(): Shan {
        if (!this.shan) throw new Error('No hand has been dealt');
        return this.shan;
    }

    constructor(kaiju?: Opening) {
        if (kaiju) this.kaiju(kaiju);
    }

    kaiju(kaiju: Opening) {

        this.title  = kaiju.title;
        this.player = kaiju.player;
        this.qijia  = kaiju.qijia;

        this.zhuangfeng = 0;
        this.jushu      = 0;
        this.changbang  = 0;
        this.lizhibang  = 0;
        this.defen      = [];
        this.shan       = null;
        this.shoupai    = [];
        this.he         = [];
        this.player_id  = [0,1,2];
        this.lunban     = -1;

        this._lizhi = false;
        this._fenpei = null;
        this._lianzhuang = false;
        this._changbang = 0;
        this._lizhibang = 0;
    }

    menfeng(id: number) {
        return (id + 6 - this.qijia - this.jushu) % 3;
    }

    qipai(qipai: Deal) {
        this.zhuangfeng = qipai.zhuangfeng;
        this.jushu      = qipai.jushu;
        this.changbang  = qipai.changbang;
        this.lizhibang  = qipai.lizhibang;
        this.shan       = new Shan(qipai.baopai);
        for (let l = 0; l < 3; l++) {
            let paistr = qipai.shoupai[l] || '_'.repeat(13);
            this.shoupai[l] = Shoupai.fromString(paistr);
            this.he[l]      = new He();
            this.player_id[l] = (this.qijia + this.jushu + l) % 3;
            this.defen[this.player_id[l]] = qipai.defen[l];
        }
        this.lunban     = -1;

        this._lizhi     = false;
        this._fenpei    = null;
        this._changbang = qipai.changbang;
        this._lizhibang = qipai.lizhibang;
    }

    lizhi() {
        if (this._lizhi) {
            this.defen[this.player_id[this.lunban]] -= 1000;
            this.lizhibang++;
            this._lizhi = false;
        }
    }

    zimo(zimo: Draw) {
        this.lizhi();
        this.lunban = zimo.l;
        this.shoupai[zimo.l].zimo(this.activeWall().zimo(zimo.p), false);
    }

    dapai(dapai: Discard) {
        this.lunban = dapai.l;
        this.shoupai[dapai.l].dapai(dapai.p, false);
        this.he[dapai.l].dapai(dapai.p);
        this._lizhi = dapai.p.slice(-1) == '*';
    }

    fulou(fulou: Meld) {
        this.lizhi();
        this.he[this.lunban].fulou(fulou.m);
        this.lunban = fulou.l;
        this.shoupai[fulou.l].fulou(fulou.m, false);
    }

    gang(gang: Meld) {
        this.lunban = gang.l;
        this.shoupai[gang.l].gang(gang.m, false);
    }

    kaigang(kaigang: Dora) {
        this.activeWall().kaigang(kaigang.baopai);
    }

    hule(hule: Win) {
        let shoupai = this.shoupai[hule.l];
        shoupai.fromString(hule.shoupai);
        if (hule.baojia != null) {
            const winningTile = shoupai.get_dapai()?.pop();
            if (!winningTile) throw new Error('Ron result has no winning tile');
            shoupai.dapai(winningTile);
        }
        if (this._fenpei) {
            this.changbang = 0;
            this.lizhibang = 0;
            for (let l = 0; l < 3; l++) {
                this.defen[this.player_id[l]] += this._fenpei[l];
            }
        }
        this.activeWall().fubaopai = hule.fubaopai;
        this._fenpei = hule.fenpei;
        this._lizhibang = 0;
        if (hule.l == 0) this._lianzhuang = true;
    }

    pingju(pingju: DrawResult) {
        if (! pingju.name.match(/^三家和/)) this.lizhi();
        for (let l = 0; l < 3; l++) {
            if (pingju.shoupai[l])
                this.shoupai[l].fromString(pingju.shoupai[l]);
        }
        this._fenpei = pingju.fenpei ?? null;
        this._lizhibang = this.lizhibang;
        this._lianzhuang = true;
    }

    last() {
        if (! this._fenpei) return;
        this.changbang = this._lianzhuang ? this._changbang + 1 : 0;
        this.lizhibang = this._lizhibang;
        for (let l = 0; l < 3; l++) {
            this.defen[this.player_id[l]] += this._fenpei[l];
        }
    }

    jieju(paipu: End) {
        for (let id = 0; id < 3; id++) {
            this.defen[id] = paipu.defen[id];
        }
        this.lunban = -1;
    }
}

export = Board;
