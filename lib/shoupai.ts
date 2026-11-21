/*
 *  Majiang.Shoupai
 */
"use strict";

const suits = ['m', 'p', 's', 'z'] as const;
type Suit = typeof suits[number];
type Counts = Record<Suit, number[]> & { _: number };

function tileSuit(value: string): Suit {
    const suit = suits.find(s => s === value[0]);
    if (suit === undefined) throw new Error(value);
    return suit;
}

class Shoupai {
    _bingpai: Counts;
    _fulou: string[];
    _zimo: string | null;
    _lizhi: boolean;

    static valid_pai(p: string): string | null {
        // 基本の牌パターンチェック
        if (!p.match(/^(?:[mps]\d|z[1-7])_?\*?[\+\=\-]?$/)) return null;

        // 三人麻雀では萬子の2-8は使用しない
        const s = p[0], n = +p[1];
        if (s === 'm' && n !== 1 && n !== 9) return null;

        return p;
    }

    static valid_mianzi(m: string): string | undefined {

        if (m.match(/^z.*[089]/) || m[0] === "m" && /[02-8]/.test(m.slice(1))) return;
        let h = m.replace(/0/g, '5');
        if (h.match(/^[mpsz](\d)\1\1[\+\=\-]\1?$/)) {
            return m.replace(/([mps])05/, '$1' + '50');
        }
        else if (h.match(/^[mpsz](\d)\1\1\1[\+\=\-]?$/)) {
            return m[0] + (m.match(/\d(?![\+\=\-])/g) ?? []).sort().reverse().join('')
                + (m.match(/\d[\+\=\-]$/) || [''])[0];
        }
        else if (h.match(/^[mps]\d+\-\d*$/)) {
            let hongpai = m.match(/0/);
            let nn = (h.match(/\d/g) ?? []).sort();
            if (nn.length != 3) return;
            if (+nn[0] + 1 != +nn[1] || +nn[1] + 1 != +nn[2]) return;
            h = h[0] + (h.match(/\d[\+\=\-]?/g) ?? []).sort().join('');
            return hongpai ? h.replace(/5/, '0') : h;
        }
    }

    constructor(qipai: string[] = []) {

        this._bingpai = {
            _: 0,
            m: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            p: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            z: [0, 0, 0, 0, 0, 0, 0, 0],
        };
        this._fulou = [];
        this._zimo = null;
        this._lizhi = false;

        for (let p of qipai) {
            if (p == '_') {
                this._bingpai._++;
                continue;
            }
            if (!Shoupai.valid_pai(p)) throw new Error(p);
            let s = tileSuit(p), n = +p[1];
            if (this._bingpai[s][n] == 4) throw new Error([this, p].join(','));
            this._bingpai[s][n]++;
            if (s != 'z' && n == 0) this._bingpai[s][5]++;
        }
    }

    static fromString(paistr = '') {

        let fulou = paistr.split(',');
        let bingpai = fulou.shift() ?? '';

        let qipai: string[] = bingpai.match(/^_*/)?.[0].match(/_/g) || [];
        for (let suitstr of bingpai.match(/[mpsz]\d+_*/g) || []) {
            let s = suitstr[0];
            for (let n of suitstr.match(/\d/g) ?? []) {
                if (s == 'z' && (+n < 1 || 7 < +n)) continue;
                qipai.push(s + n);
            }
            qipai = qipai.concat(suitstr.match(/_/g) || []);
        }
        qipai = qipai.slice(0, 14 - fulou.filter(x => x).length * 3);
        let zimo = (qipai.length - 2) % 3 == 0 && qipai.slice(-1)[0];
        const shoupai = new Shoupai(qipai);

        let last: string | null = null;
        for (let m of fulou) {
            if (!m) { shoupai._zimo = last; break }
            const canonical = Shoupai.valid_mianzi(m);
            if (canonical) {
                shoupai._fulou.push(canonical);
                last = canonical;
            }
        }

        shoupai._zimo = shoupai._zimo || zimo || null;
        shoupai._lizhi = bingpai.slice(-1) == '*';

        return shoupai;
    }

    toString() {

        let paistr = '';

        for (const s of suits) {
            let suitstr: string = s;
            let bingpai = this._bingpai[s];
            let n_hongpai = s == 'z' ? 0 : bingpai[0];
            for (let n = 1; n < bingpai.length; n++) {
                let n_pai = bingpai[n];
                if (this._zimo) {
                    if (s + n == this._zimo) { n_pai--; }
                    if (n == 5 && s + 0 == this._zimo) { n_pai--; n_hongpai-- }
                }
                for (let i = 0; i < n_pai; i++) {
                    if (n == 5 && n_hongpai > 0) { suitstr += 0; n_hongpai-- }
                    else { suitstr += n; }
                }
            }
            if (suitstr.length > 1) paistr += suitstr;
        }
        paistr += '_'.repeat(this._bingpai._ + (this._zimo == '_' ? -1 : 0));
        if (this._zimo && this._zimo.length <= 2) paistr += this._zimo;
        if (this._lizhi) paistr += '*';

        for (let m of this._fulou) {
            paistr += ',' + m;
        }
        if (this._zimo && this._zimo.length > 2) paistr += ',';

        return paistr;
    }

    clone() {

        const shoupai = new Shoupai();

        shoupai._bingpai = {
            _: this._bingpai._,
            m: this._bingpai.m.concat(),
            p: this._bingpai.p.concat(),
            s: this._bingpai.s.concat(),
            z: this._bingpai.z.concat(),
        };
        shoupai._fulou = this._fulou.concat();
        shoupai._zimo = this._zimo;
        shoupai._lizhi = this._lizhi;

        return shoupai;
    }

    fromString(paistr: string) {
        const shoupai = Shoupai.fromString(paistr);
        this._bingpai = {
            _: shoupai._bingpai._,
            m: shoupai._bingpai.m.concat(),
            p: shoupai._bingpai.p.concat(),
            s: shoupai._bingpai.s.concat(),
            z: shoupai._bingpai.z.concat(),
        };
        this._fulou = shoupai._fulou.concat();
        this._zimo = shoupai._zimo;
        this._lizhi = shoupai._lizhi;

        return this;
    }

    decrease(s: Suit, rank: number | string) {
        const n = Number(rank);
        let bingpai = this._bingpai[s];
        if (bingpai[n] == 0 || n == 5 && bingpai[0] == bingpai[5]) {
            if (this._bingpai._ == 0) throw new Error([this, s + n].join(','));
            this._bingpai._--;
        }
        else {
            bingpai[n]--;
            if (n == 0) bingpai[5]--;
        }
    }

    zimo(p: string, check = true) {
        if (check && this._zimo) throw new Error([this, p].join(','));
        if (p == '_') {
            this._bingpai._++;
            this._zimo = p;
        }
        else {
            if (!Shoupai.valid_pai(p)) throw new Error(p);
            let s = tileSuit(p), n = +p[1];
            let bingpai = this._bingpai[s];
            if (bingpai[n] == 4) throw new Error([this, p].join(','));
            bingpai[n]++;
            if (n == 0) {
                if (bingpai[5] == 4) throw new Error([this, p].join(','));
                bingpai[5]++;
            }
            this._zimo = s + n;
        }
        return this;
    }

    dapai(p: string, check = true) {
        if (check && !this._zimo) throw new Error([this, p].join(','));
        if (!Shoupai.valid_pai(p)) throw new Error(p);
        let s = tileSuit(p), n = +p[1];
        this.decrease(s, n);
        this._zimo = null;
        if (p.slice(-1) == '*') this._lizhi = true;
        return this;
    }

    fulou(m: string, check = true) {
        if (check && this._zimo) throw new Error([this, m].join(','));
        if (m != Shoupai.valid_mianzi(m)) throw new Error(m);
        if (m.match(/\d{4}$/)) throw new Error([this, m].join(','));
        if (m.match(/\d{3}[\+\=\-]\d$/)) throw new Error([this, m].join(','));
        let s = tileSuit(m);
        for (let n of m.match(/\d(?![\+\=\-])/g) ?? []) {
            this.decrease(s, n);
        }
        this._fulou.push(m);
        if (!m.match(/\d{4}/)) this._zimo = m;
        return this;
    }

    gang(m: string, check = true) {
        if (check && !this._zimo) throw new Error([this, m].join(','));
        if (check && this._zimo && this._zimo.length > 2) throw new Error([this, m].join(','));
        if (m != Shoupai.valid_mianzi(m)) throw new Error(m);
        let s = tileSuit(m);
        if (m.match(/\d{4}$/)) {
            for (let n of m.match(/\d/g) ?? []) {
                this.decrease(s, n);
            }
            this._fulou.push(m);
        }
        else if (m.match(/\d{3}[\+\=\-]\d$/)) {
            let m1 = m.slice(0, 5);
            let i = this._fulou.findIndex(m2 => m1 == m2);
            if (i < 0) throw new Error([this, m].join(','));
            this._fulou[i] = m;
            this.decrease(s, m.slice(-1));
        }
        else throw new Error([this, m].join(','));
        this._zimo = null;
        return this;
    }

    get menqian() {
        return this._fulou.filter(m => m.match(/[\+\=\-]/)).length == 0;
    }

    get lizhi() { return this._lizhi }

    get_dapai(check = true) {

        if (!this._zimo) return null;

        let deny: Partial<Record<string, true>> = {};
        if (check && this._zimo && this._zimo.length > 2) {
            let m = this._zimo;
            let s = tileSuit(m);
            let n = + (m.match(/\d(?=[\+\=\-])/)?.[0] ?? 0) || 5;
            deny[s + n] = true;
            if (!m.replace(/0/, '5').match(/^[mpsz](\d)\1\1/)) {
                if (n < 7 && m.match(/^[mps]\d\-\d\d$/)) deny[s + (n + 3)] = true;
                if (3 < n && m.match(/^[mps]\d\d\d\-$/)) deny[s + (n - 3)] = true;
            }
        }

        let dapai = [];
        if (!this._lizhi) {
            for (const s of suits) {
                let bingpai = this._bingpai[s];
                for (let n = 1; n < bingpai.length; n++) {
                    if (bingpai[n] == 0) continue;
                    if (deny[s + n]) continue;
                    if (s + n == this._zimo && bingpai[n] == 1) continue;
                    if (s == 'z' || n != 5) dapai.push(s + n);
                    else {
                        if (bingpai[0] > 0
                            && s + 0 != this._zimo || bingpai[0] > 1)
                            dapai.push(s + 0);
                        if (bingpai[0] < bingpai[5]) dapai.push(s + n);
                    }
                }
            }
        }
        if (this._zimo.length == 2) dapai.push(this._zimo + '_');
        return dapai;
    }

    get_chi_mianzi(p: string, check = true) {

        if (this._zimo) return null;
        if (!Shoupai.valid_pai(p)) throw new Error(p);

        let mianzi: string[] = [];
        let s = tileSuit(p), n = + p[1] || 5, d = p.match(/[\+\=\-]$/)?.[0];
        if (!d) throw new Error(p);
        if (s == 'z' || d != '-') return mianzi;
        if (this._lizhi) return mianzi;

        let bingpai = this._bingpai[s];
        if (3 <= n && bingpai[n - 2] > 0 && bingpai[n - 1] > 0) {
            if (!check
                || (3 < n ? bingpai[n - 3] : 0) + bingpai[n]
                < 14 - (this._fulou.length + 1) * 3) {
                if (n - 2 == 5 && bingpai[0] > 0) mianzi.push(s + '067-');
                if (n - 1 == 5 && bingpai[0] > 0) mianzi.push(s + '406-');
                if (n - 2 != 5 && n - 1 != 5 || bingpai[0] < bingpai[5])
                    mianzi.push(s + (n - 2) + (n - 1) + (p[1] + d));
            }
        }
        if (2 <= n && n <= 8 && bingpai[n - 1] > 0 && bingpai[n + 1] > 0) {
            if (!check || bingpai[n] < 14 - (this._fulou.length + 1) * 3) {
                if (n - 1 == 5 && bingpai[0] > 0) mianzi.push(s + '06-7');
                if (n + 1 == 5 && bingpai[0] > 0) mianzi.push(s + '34-0');
                if (n - 1 != 5 && n + 1 != 5 || bingpai[0] < bingpai[5])
                    mianzi.push(s + (n - 1) + (p[1] + d) + (n + 1));
            }
        }
        if (n <= 7 && bingpai[n + 1] > 0 && bingpai[n + 2] > 0) {
            if (!check
                || bingpai[n] + (n < 7 ? bingpai[n + 3] : 0)
                < 14 - (this._fulou.length + 1) * 3) {
                if (n + 1 == 5 && bingpai[0] > 0) mianzi.push(s + '4-06');
                if (n + 2 == 5 && bingpai[0] > 0) mianzi.push(s + '3-40');
                if (n + 1 != 5 && n + 2 != 5 || bingpai[0] < bingpai[5])
                    mianzi.push(s + (p[1] + d) + (n + 1) + (n + 2));
            }
        }
        return mianzi;
    }

    get_peng_mianzi(p: string) {

        if (this._zimo) return null;
        if (!Shoupai.valid_pai(p)) throw new Error(p);

        let mianzi: string[] = [];
        let s = tileSuit(p), n = + p[1] || 5, d = p.match(/[\+\=\-]$/)?.[0];
        // 方向指定がない場合は例外ではなく不成立扱いにする
        if (!d) return mianzi;
        if (this._lizhi) return mianzi;

        // 三人麻雀では萬子の2-8は使用しないため、これらの場合は空の配列を返す
        if (s == 'm' && n >= 2 && n <= 8) return mianzi;
        // 三人麻雀では字牌の6,7（白、發）は使用しない

        let bingpai = this._bingpai[s];
        if (bingpai[n] >= 2) {
            if (n == 5 && bingpai[0] >= 2) mianzi.push(s + '00' + p[1] + d);
            if (n == 5 && bingpai[0] >= 1 && bingpai[5] - bingpai[0] >= 1)
                mianzi.push(s + '50' + p[1] + d);
            if (n != 5 || bingpai[5] - bingpai[0] >= 2)
                mianzi.push(s + n + n + p[1] + d);
        }
        return mianzi;
    }

    get_gang_mianzi(p?: string | null) {

        let mianzi: string[] = [];
        if (p) {
            if (this._zimo) return null;
            if (!Shoupai.valid_pai(p)) throw new Error(p);

            let s = tileSuit(p), n = + p[1] || 5, d = p.match(/[\+\=\-]$/)?.[0];
            if (!d) throw new Error(p);
            if (this._lizhi) return mianzi;

            // 三人麻雀では萬子の2-8は使用しないため、これらの場合は空の配列を返す
            if (s == 'm' && n >= 2 && n <= 8) return mianzi;

            let bingpai = this._bingpai[s];
            if (bingpai[n] == 3) {
                if (n == 5) mianzi = [s + '5'.repeat(3 - bingpai[0])
                    + '0'.repeat(bingpai[0]) + p[1] + d];
                else mianzi = [s + n + n + n + n + d];
            }
        }
        else {
            if (!this._zimo) return null;
            if (this._zimo.length > 2) return null;
            let p = this._zimo.replace(/0/, '5');

            for (const s of suits) {
                // 三人麻雀では萬子の2-8は使用しないためスキップ
                if (s == 'm') {
                    // 萬子の1と9、および赤5のみ処理
                    let bingpai = this._bingpai[s];
                    for (let n of [1, 5, 9]) {
                        if (bingpai[n] == 0) continue;
                        if (bingpai[n] == 4) {
                            if (this._lizhi && s + n != p) continue;
                            if (n == 5) mianzi.push(s + '5'.repeat(4 - bingpai[0])
                                + '0'.repeat(bingpai[0]));
                            else mianzi.push(s + n + n + n + n);
                        }
                        else {
                            if (this._lizhi) continue;
                            for (let m of this._fulou) {
                                if (m.replace(/0/g, '5').slice(0, 4) == s + n + n + n) {
                                    if (n == 5 && bingpai[0] > 0) mianzi.push(m + 0);
                                    else mianzi.push(m + n);
                                }
                            }
                        }
                    }
                } else {
                    // 萬子以外は通常の処理
                    let bingpai = this._bingpai[s];
                    for (let n = 1; n < bingpai.length; n++) {
                        if (bingpai[n] == 0) continue;
                        if (bingpai[n] == 4) {
                            if (this._lizhi && s + n != p) continue;
                            if (n == 5) mianzi.push(s + '5'.repeat(4 - bingpai[0])
                                + '0'.repeat(bingpai[0]));
                            else mianzi.push(s + n + n + n + n);
                        }
                        else {
                            if (this._lizhi) continue;
                            for (let m of this._fulou) {
                                if (m.replace(/0/g, '5').slice(0, 4) == s + n + n + n) {
                                    if (n == 5 && bingpai[0] > 0) mianzi.push(m + 0);
                                    else mianzi.push(m + n);
                                }
                            }
                        }
                    }
                }
            }
        }
        return mianzi;
    }
}

export = Shoupai;
