/*
 *  Majiang.Shan
 */
import Shoupai = require('./shoupai');

type WallRules = {
    '赤牌': { m: number; p: number; s: number };
    '裏ドラあり': boolean;
    'カンドラあり': boolean;
    'カン裏あり': boolean;
};

class Shan {
    private _rule: WallRules;
    private _pai: string[] = [];
    private _baopai: string[];
    private _fubaopai: string[] | null;
    private _weikaigang = false;
    private _closed = false;

    static zhenbaopai(p: string): string {
        if (!Shoupai.valid_pai(p)) throw new Error(p);
        let s = p[0], n = + p[1] || 5;
        if (s == 'm' && (n == 1 || n == 9)) return n == 1 ? 'm9' : 'm1';
        return s == 'z' ? (n < 5 ? s + (n % 4 + 1) : s + ((n - 4) % 3 + 5))
            : s + (n % 9 + 1);
    }

    constructor(rule: WallRules) {

        this._rule = rule;
        let hongpai = rule['赤牌'];

        let pai = [];
        for (const s of ['m', 'p', 's', 'z'] as const) {
            for (let n = 1; n <= (s == 'z' ? 7 : 9); n++) {
                if (s == 'm' && n >= 2 && n <= 8) continue;

                for (let i = 0; i < 4; i++) {
                    if (n == 5 && s !== 'z' && i < hongpai[s]) pai.push(s + 0);
                    else pai.push(s + n);
                }
            }
        }

        while (pai.length) {
            this._pai.push(pai.splice(Math.random() * pai.length, 1)[0]);
        }

        this._baopai = [this._pai[4]];
        this._fubaopai = rule['裏ドラあり'] ? [this._pai[9]] : null;
    }

    zimo() {
        if (this._closed) throw new Error(String(this));
        if (this.paishu == 0) throw new Error(String(this));
        if (this._weikaigang) throw new Error(String(this));
        const tile = this._pai.pop();
        if (tile === undefined) throw new Error("Empty wall");
        return tile;
    }

    gangzimo() {
        if (this._closed) throw new Error(String(this));
        if (this.paishu == 0) throw new Error(String(this));
        if (this._weikaigang) throw new Error(String(this));
        if (this._baopai.length == 5) throw new Error(String(this));
        this._weikaigang = this._rule['カンドラあり'];
        if (!this._weikaigang) this._baopai.push('');
        const tile = this._pai.shift();
        if (tile === undefined) throw new Error("Empty wall");
        return tile;
    }

    kaigang() {
        if (this._closed) throw new Error(String(this));
        if (!this._weikaigang) throw new Error(String(this));
        this._baopai.push(this._pai[4]);
        if (this._fubaopai && this._rule['カン裏あり'])
            this._fubaopai.push(this._pai[9]);
        this._weikaigang = false;
        return this;
    }

    close() { this._closed = true; return this }

    get paishu() { return this._pai.length - 14 }

    get baopai() { return this._baopai.filter(x => x) }

    get fubaopai() {
        return !this._closed ? null
            : this._fubaopai ? this._fubaopai.concat()
                : null;
    }
}

export = Shan;
