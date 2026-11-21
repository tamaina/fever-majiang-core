/*
 *  Majiang.Util.hule
 */
import distributeTsumo = require('./tsumo');
import Shan = require('./shan');
import createRule = require('./rule');
import Shoupai = require('./shoupai');

type Suit = 'm' | 'p' | 's' | 'z';
type Suited = Exclude<Suit, 'z'>;
type Direction = '+' | '=' | '-';
const directions: Record<Direction, number> = { '+': 1, '=': 2, '-': 3 };
type ThreeScores = [number, number, number];
type ScoreTable = {
    oya: { ron: Readonly<Record<number, number>>; tsumo: Readonly<Record<number, readonly [number, ...number[]]>> };
    ko: { ron: Readonly<Record<number, number>>; tsumo: Readonly<Record<number, readonly [number, number]>> };
};
type Rule = Omit<ReturnType<typeof createRule>, '3p簡易スコア表'> & { '3p簡易スコア表': ScoreTable | null };
type Yaku = { name: string; fanshu: number | '*' | '**'; baojia?: Direction };
type HupaiContext = { lizhi: number; yifa: boolean; qianggang: boolean; lingshang: boolean; haidi: number; tianhu: number };

export type HuleParam = {
    rule: Rule;
    zhuangfeng: number;
    menfeng: number;
    hupai: HupaiContext;
    baopai: readonly string[];
    fubaopai: readonly string[] | null;
    jicun: { changbang: number; lizhibang: number };
};
export type HuleParamInput = Partial<Omit<HuleParam, 'hupai' | 'jicun' | 'baopai' | 'fubaopai'> & HupaiContext & {
    baopai: readonly string[] | string;
    fubaopai: readonly string[] | string | null;
    changbang: number;
    lizhibang: number;
}>;
export type HuleResult = {
    defen: number;
    hupai?: Yaku[];
    fu?: number;
    fanshu?: number;
    damanguan?: number;
    fenpei?: ThreeScores;
};

function isDirection(value: string): value is Direction {
    return value === '+' || value === '=' || value === '-';
}

function ronPayer(winner: number, tile: string): number {
    const direction = tile[2];
    if (!isDirection(direction)) throw new Error(tile);
    return (winner + directions[direction]) % 3;
}

function mianzi(s: Suited, bingpai: number[], n = 1): string[][] {

    if (n > 9) return [[]];

    if (bingpai[n] == 0) return mianzi(s, bingpai, n + 1);

    let shunzi: string[][] = [];
    if (n <= 7 && bingpai[n] > 0 && bingpai[n + 1] > 0 && bingpai[n + 2] > 0) {
        bingpai[n]--; bingpai[n + 1]--; bingpai[n + 2]--;
        shunzi = mianzi(s, bingpai, n);
        bingpai[n]++; bingpai[n + 1]++; bingpai[n + 2]++;
        for (let s_mianzi of shunzi) {
            s_mianzi.unshift(s + (n) + (n + 1) + (n + 2));
        }
    }

    let kezi: string[][] = [];
    if (bingpai[n] == 3) {
        bingpai[n] -= 3;
        kezi = mianzi(s, bingpai, n + 1);
        bingpai[n] += 3;
        for (let k_mianzi of kezi) {
            k_mianzi.unshift(s + n + n + n);
        }
    }

    return shunzi.concat(kezi);
}

function mianzi_all(shoupai: Shoupai): string[][] {

    let shupai_all: string[][] = [[]];
    for (let s of ['m', 'p', 's'] as const) {
        let new_mianzi = [];
        for (let mm of shupai_all) {
            for (let nn of mianzi(s, shoupai._bingpai[s])) {
                new_mianzi.push(mm.concat(nn));
            }
        }
        shupai_all = new_mianzi;
    }

    let zipai = [];
    for (let n = 1; n <= 7; n++) {
        if (shoupai._bingpai.z[n] == 0) continue;
        if (shoupai._bingpai.z[n] != 3) return [];
        zipai.push('z' + n + n + n);
    }

    let fulou = shoupai._fulou.map(m => m.replace(/0/g, '5'));

    return shupai_all.map(shupai => shupai.concat(zipai).concat(fulou));
}

function add_hulepai(mianzi: string[], p: string): string[][] {

    let [s, n, d] = p;
    let regexp = new RegExp(`^(${s}.*${n})`);
    let replacer = `$1${d}!`;

    let new_mianzi = [];

    for (let i = 0; i < mianzi.length; i++) {
        if (mianzi[i].match(/[\+\=\-]|\d{4}/)) continue;
        if (i > 0 && mianzi[i] == mianzi[i - 1]) continue;
        let m = mianzi[i].replace(regexp, replacer);
        if (m == mianzi[i]) continue;
        let tmp_mianzi = mianzi.concat();
        tmp_mianzi[i] = m;
        new_mianzi.push(tmp_mianzi);
    }

    return new_mianzi;
}

function hule_mianzi_yiban(shoupai: Shoupai, hulepai: string): string[][] {

    let mianzi: string[][] = [];

    for (let s of ['m', 'p', 's', 'z'] as const) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n < bingpai.length; n++) {
            if (bingpai[n] < 2) continue;
            bingpai[n] -= 2;
            let jiangpai = s + n + n;
            for (let mm of mianzi_all(shoupai)) {
                mm.unshift(jiangpai);
                if (mm.length != 5) continue;
                mianzi = mianzi.concat(add_hulepai(mm, hulepai));
            }
            bingpai[n] += 2;
        }
    }

    return mianzi;
}

function hule_mianzi_qidui(shoupai: Shoupai, hulepai: string): string[][] {

    if (shoupai._fulou.length > 0) return [];

    let mianzi: string[] = [];

    for (let s of ['m', 'p', 's', 'z'] as const) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n < bingpai.length; n++) {
            if (bingpai[n] == 0) continue;
            if (bingpai[n] == 2) {
                let m = (s + n == hulepai.slice(0, 2))
                    ? s + n + n + hulepai[2] + '!'
                    : s + n + n;
                mianzi.push(m);
            }
            else return [];
        }
    }

    return (mianzi.length == 7) ? [mianzi] : [];
}

function hule_mianzi_guoshi(shoupai: Shoupai, hulepai: string): string[][] {

    if (shoupai._fulou.length > 0) return [];

    let mianzi: string[] = [];
    let n_duizi = 0;

    for (let s of ['m', 'p', 's', 'z'] as const) {
        let bingpai = shoupai._bingpai[s];
        let nn = (s == 'z') ? [1, 2, 3, 4, 5, 6, 7] : [1, 9];
        for (let n of nn) {
            if (bingpai[n] == 2) {
                let m = (s + n == hulepai.slice(0, 2))
                    ? s + n + n + hulepai[2] + '!'
                    : s + n + n;
                mianzi.unshift(m);
                n_duizi++;
            }
            else if (bingpai[n] == 1) {
                let m = (s + n == hulepai.slice(0, 2))
                    ? s + n + hulepai[2] + '!'
                    : s + n;
                mianzi.push(m);
            }
            else return [];
        }
    }

    return (n_duizi == 1) ? [mianzi] : [];
}

function hule_mianzi_jiulian(shoupai: Shoupai, hulepai: string): string[][] {

    if (shoupai._fulou.length > 0) return [];

    let s = hulepai[0];
    if (s !== 'm' && s !== 'p' && s !== 's') return [];

    let mianzi = s;
    let bingpai = shoupai._bingpai[s];
    for (let n = 1; n <= 9; n++) {
        if (bingpai[n] == 0) return [];
        if ((n == 1 || n == 9) && bingpai[n] < 3) return [];
        let n_pai = (n == +hulepai[1]) ? bingpai[n] - 1 : bingpai[n];
        for (let i = 0; i < n_pai; i++) {
            mianzi += n;
        }
    }
    if (mianzi.length != 14) return [];
    mianzi += hulepai.slice(1) + '!';

    return [[mianzi]];
}

export function hule_mianzi(shoupai: Shoupai, rongpai?: string | null): string[][] {

    let new_shoupai = shoupai.clone();
    if (rongpai) new_shoupai.zimo(rongpai);

    if (!new_shoupai._zimo || new_shoupai._zimo.length > 2) return [];
    let hulepai = (rongpai || new_shoupai._zimo + '_').replace(/0/, '5');

    return hule_mianzi_yiban(new_shoupai, hulepai)
        .concat(hule_mianzi_qidui(new_shoupai, hulepai))
        .concat(hule_mianzi_guoshi(new_shoupai, hulepai))
        .concat(hule_mianzi_jiulian(new_shoupai, hulepai));
}

function get_hudi(mianzi: string[], zhuangfeng: number, menfeng: number, rule: Rule) {

    const zhuangfengpai = new RegExp(`^z${zhuangfeng + 1}.*$`);
    const menfengpai = new RegExp(`^z${menfeng + 1}.*$`);
    const sanyuanpai = /^z[567].*$/;

    const yaojiu = /^.*[z19].*$/;
    const zipai = /^z.*$/;

    const kezi = /^[mpsz](\d)\1\1.*$/;
    const ankezi = /^[mpsz](\d)\1\1(?:\1|_\!)?$/;
    const gangzi = /^[mpsz](\d)\1\1.*\1.*$/;

    const danqi = /^[mpsz](\d)\1[\+\=\-\_]\!$/;
    const kanzhang = /^[mps]\d\d[\+\=\-\_]\!\d$/;
    const bianzhang = /^[mps](123[\+\=\-\_]\!|7[\+\=\-\_]\!89)$/;

    let hudi = {
        fu: 20,
        menqian: true,
        zimo: true,
        shunzi: {
            m: [0, 0, 0, 0, 0, 0, 0, 0],
            p: [0, 0, 0, 0, 0, 0, 0, 0],
            s: [0, 0, 0, 0, 0, 0, 0, 0]
        },
        kezi: {
            m: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            p: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            z: [0, 0, 0, 0, 0, 0, 0, 0]
        },
        n_shunzi: 0,
        n_kezi: 0,
        n_ankezi: 0,
        n_gangzi: 0,
        n_yaojiu: 0,
        n_zipai: 0,
        danqi: false,
        pinghu: false,
        zhuangfeng: zhuangfeng,
        menfeng: menfeng
    };

    for (let m of mianzi) {

        if (m.match(/[\+\=\-](?!\!)/)) hudi.menqian = false;
        if (m.match(/[\+\=\-]\!/)) hudi.zimo = false;

        if (mianzi.length == 1) continue;

        if (m.match(danqi)) hudi.danqi = true;

        if (mianzi.length == 13) continue;

        if (m.match(yaojiu)) hudi.n_yaojiu++;
        if (m.match(zipai)) hudi.n_zipai++;

        if (mianzi.length != 5) continue;

        if (m == mianzi[0]) {
            let fu = 0;
            if (m.match(zhuangfengpai)) fu += 2;
            if (m.match(menfengpai)) fu += 2;
            if (m.match(sanyuanpai)) fu += 2;
            fu = rule['連風牌は2符'] && fu > 2 ? 2 : fu;
            hudi.fu += fu;
            if (hudi.danqi) hudi.fu += 2;
        }
        else if (m.match(kezi)) {
            hudi.n_kezi++;
            let fu = 2;
            if (m.match(yaojiu)) { fu *= 2; }
            if (m.match(ankezi)) { fu *= 2; hudi.n_ankezi++; }
            if (m.match(gangzi)) { fu *= 4; hudi.n_gangzi++; }
            hudi.fu += fu;
            hudi.kezi[m[0] as Suit][+m[1]]++;
        }
        else {
            hudi.n_shunzi++;
            if (m.match(kanzhang)) hudi.fu += 2;
            if (m.match(bianzhang)) hudi.fu += 2;
            hudi.shunzi[m[0] as Suited][+m[1]]++;
        }
    }

    if (mianzi.length == 7) {
        hudi.fu = 25;
    }
    else if (mianzi.length == 5) {
        hudi.pinghu = (hudi.menqian && hudi.fu == 20);
        if (hudi.zimo) {
            if (!hudi.pinghu) hudi.fu += 2;
        }
        else {
            if (hudi.menqian) hudi.fu += 10;
            else if (hudi.fu == 20) hudi.fu = 30;
        }
        hudi.fu = Math.ceil(hudi.fu / 10) * 10;
    }

    return hudi;
}

function get_pre_hupai(hupai: HupaiContext): Yaku[] {

    let pre_hupai: Yaku[] = [];

    if (hupai.lizhi == 1) pre_hupai.push({ name: '立直', fanshu: 1 });
    if (hupai.lizhi == 2) pre_hupai.push({ name: 'ダブル立直', fanshu: 2 });
    if (hupai.yifa) pre_hupai.push({ name: '一発', fanshu: 1 });
    if (hupai.haidi == 1) pre_hupai.push({ name: '海底摸月', fanshu: 1 });
    if (hupai.haidi == 2) pre_hupai.push({ name: '河底撈魚', fanshu: 1 });
    if (hupai.lingshang) pre_hupai.push({ name: '嶺上開花', fanshu: 1 });
    if (hupai.qianggang) pre_hupai.push({ name: '槍槓', fanshu: 1 });

    if (hupai.tianhu == 1) pre_hupai = [{ name: '天和', fanshu: '*' }];
    if (hupai.tianhu == 2) pre_hupai = [{ name: '地和', fanshu: '*' }];

    return pre_hupai;
}

function get_hupai(mianzi: string[], hudi: ReturnType<typeof get_hudi>, pre_hupai: Yaku[], post_hupai: Yaku[], rule: Rule): Yaku[] {

    function menqianqing() {
        if (hudi.menqian && hudi.zimo)
            return [{ name: '門前清自摸和', fanshu: 1 }];
        return [];
    }
    function fanpai() {
        let feng_hanzi = ['東', '南', '西', '北'];
        let fanpai_all: Yaku[] = [];
        if (hudi.kezi.z[hudi.zhuangfeng + 1])
            fanpai_all.push({
                name: '場風 ' + feng_hanzi[hudi.zhuangfeng],
                fanshu: 1
            });
        if (hudi.kezi.z[hudi.menfeng + 1])
            fanpai_all.push({
                name: '自風 ' + feng_hanzi[hudi.menfeng],
                fanshu: 1
            });
        if (hudi.kezi.z[5]) fanpai_all.push({ name: '翻牌 白', fanshu: 1 });
        if (hudi.kezi.z[6]) fanpai_all.push({ name: '翻牌 發', fanshu: 1 });
        if (hudi.kezi.z[7]) fanpai_all.push({ name: '翻牌 中', fanshu: 1 });
        return fanpai_all;
    }
    function pinghu() {
        if (hudi.pinghu) return [{ name: '平和', fanshu: 1 }];
        return [];
    }
    function duanyaojiu() {
        if (hudi.n_yaojiu > 0) return [];
        if (rule['クイタンあり'] || hudi.menqian)
            return [{ name: '断幺九', fanshu: 1 }];
        return [];
    }
    function yibeikou() {
        if (!hudi.menqian) return [];
        const shunzi = hudi.shunzi;
        let beikou = shunzi.m.concat(shunzi.p).concat(shunzi.s)
            .map(x => x >> 1).reduce((a, b) => a + b);
        if (beikou == 1) return [{ name: '一盃口', fanshu: 1 }];
        return [];
    }
    function sansetongshun() {
        const shunzi = hudi.shunzi;
        for (let n = 1; n <= 7; n++) {
            if (shunzi.m[n] && shunzi.p[n] && shunzi.s[n])
                return [{ name: '三色同順', fanshu: (hudi.menqian ? 2 : 1) }];
        }
        return [];
    }
    function yiqitongguan() {
        const shunzi = hudi.shunzi;
        for (let s of ['m', 'p', 's'] as const) {
            if (shunzi[s][1] && shunzi[s][4] && shunzi[s][7])
                return [{ name: '一気通貫', fanshu: (hudi.menqian ? 2 : 1) }];
        }
        return [];
    }
    function hunquandaiyaojiu() {
        if (hudi.n_yaojiu == 5 && hudi.n_shunzi > 0 && hudi.n_zipai > 0)
            return [{ name: '混全帯幺九', fanshu: (hudi.menqian ? 2 : 1) }];
        return [];
    }
    function qiduizi() {
        if (mianzi.length == 7) return [{ name: '七対子', fanshu: 2 }];
        return [];
    }
    function duiduihu() {
        if (hudi.n_kezi == 4) return [{ name: '対々和', fanshu: 2 }];
        return [];
    }
    function sananke() {
        if (hudi.n_ankezi == 3) return [{ name: '三暗刻', fanshu: 2 }];
        return [];
    }
    function sangangzi() {
        if (hudi.n_gangzi == 3) return [{ name: '三槓子', fanshu: 2 }];
        return [];
    }
    function sansetongke() {
        const kezi = hudi.kezi;
        for (let n = 1; n <= 9; n++) {
            if (kezi.m[n] && kezi.p[n] && kezi.s[n])
                return [{ name: '三色同刻', fanshu: 2 }];
        }
        return [];
    }
    function hunlaotou() {
        if (hudi.n_yaojiu == mianzi.length
            && hudi.n_shunzi == 0 && hudi.n_zipai > 0)
            return [{ name: '混老頭', fanshu: 2 }];
        return [];
    }
    function xiaosanyuan() {
        const kezi = hudi.kezi;
        if (kezi.z[5] + kezi.z[6] + kezi.z[7] == 2
            && mianzi[0].match(/^z[567]/))
            return [{ name: '小三元', fanshu: 2 }];
        return [];
    }
    function hunyise() {
        for (let s of ['m', 'p', 's'] as const) {
            const yise = new RegExp(`^[z${s}]`);
            if (mianzi.filter(m => m.match(yise)).length == mianzi.length
                && hudi.n_zipai > 0)
                return [{ name: '混一色', fanshu: (hudi.menqian ? 3 : 2) }];
        }
        return [];
    }
    function chunquandaiyaojiu() {
        if (hudi.n_yaojiu == 5 && hudi.n_shunzi > 0 && hudi.n_zipai == 0)
            return [{ name: '純全帯幺九', fanshu: (hudi.menqian ? 3 : 2) }];
        return [];
    }
    function erbeikou() {
        if (!hudi.menqian) return [];
        const shunzi = hudi.shunzi;
        let beikou = shunzi.m.concat(shunzi.p).concat(shunzi.s)
            .map(x => x >> 1).reduce((a, b) => a + b);
        if (beikou == 2) return [{ name: '二盃口', fanshu: 3 }];
        return [];
    }
    function qingyise() {
        for (let s of ['m', 'p', 's'] as const) {
            const yise = new RegExp(`^[${s}]`);
            if (mianzi.filter(m => m.match(yise)).length == mianzi.length)
                return [{ name: '清一色', fanshu: (hudi.menqian ? 6 : 5) }];
        }
        return [];
    }

    function guoshiwushuang(): Yaku[] {
        if (mianzi.length != 13) return [];
        if (hudi.danqi) return [{ name: '国士無双十三面', fanshu: '**' }];
        else return [{ name: '国士無双', fanshu: '*' }];
    }
    function sianke(): Yaku[] {
        if (hudi.n_ankezi != 4) return [];
        if (hudi.danqi) return [{ name: '四暗刻単騎', fanshu: '**' }];
        else return [{ name: '四暗刻', fanshu: '*' }];
    }
    function dasanyuan(): Yaku[] {
        const kezi = hudi.kezi;
        if (kezi.z[5] + kezi.z[6] + kezi.z[7] == 3) {
            let bao_mianzi = mianzi.filter(m =>
                m.match(/^z([567])\1\1(?:[\+\=\-]|\1)(?!\!)/));
            let baojia = (bao_mianzi[2] && bao_mianzi[2].match(/[\+\=\-]/));
            if (baojia && isDirection(baojia[0]))
                return [{ name: '大三元', fanshu: '*', baojia: baojia[0] }];
            else return [{ name: '大三元', fanshu: '*' }];
        }
        return [];
    }
    function sixihu(): Yaku[] {
        const kezi = hudi.kezi;
        if (kezi.z[1] + kezi.z[2] + kezi.z[3] + kezi.z[4] == 4) {
            let bao_mianzi = mianzi.filter(m =>
                m.match(/^z([1234])\1\1(?:[\+\=\-]|\1)(?!\!)/));
            let baojia = (bao_mianzi[3] && bao_mianzi[3].match(/[\+\=\-]/));
            if (baojia && isDirection(baojia[0]))
                return [{ name: '大四喜', fanshu: '**', baojia: baojia[0] }];
            else return [{ name: '大四喜', fanshu: '**' }];
        }
        if (kezi.z[1] + kezi.z[2] + kezi.z[3] + kezi.z[4] == 3
            && mianzi[0].match(/^z[1234]/))
            return [{ name: '小四喜', fanshu: '*' }];
        return [];
    }
    function ziyise(): Yaku[] {
        if (hudi.n_zipai == mianzi.length)
            return [{ name: '字一色', fanshu: '*' }];
        return [];
    }
    function lvyise(): Yaku[] {
        if (mianzi.filter(m => m.match(/^[mp]/)).length > 0) return [];
        if (mianzi.filter(m => m.match(/^z[^6]/)).length > 0) return [];
        if (mianzi.filter(m => m.match(/^s.*[1579]/)).length > 0) return [];
        return [{ name: '緑一色', fanshu: '*' }];
    }
    function qinglaotou(): Yaku[] {
        if (hudi.n_yaojiu == 5 && hudi.n_kezi == 4 && hudi.n_zipai == 0)
            return [{ name: '清老頭', fanshu: '*' }];
        return [];
    }
    function sigangzi(): Yaku[] {
        if (hudi.n_gangzi == 4) return [{ name: '四槓子', fanshu: '*' }];
        return [];
    }
    function jiulianbaodeng(): Yaku[] {
        if (mianzi.length != 1) return [];
        if (mianzi[0].match(/^[mpsz]1112345678999/))
            return [{ name: '純正九蓮宝燈', fanshu: '**' }];
        else return [{ name: '九蓮宝燈', fanshu: '*' }];
    }

    let damanguan = (pre_hupai.length > 0 && typeof pre_hupai[0].fanshu === 'string')
        ? pre_hupai : [];
    damanguan = damanguan
        .concat(guoshiwushuang())
        .concat(sianke())
        .concat(dasanyuan())
        .concat(sixihu())
        .concat(ziyise())
        .concat(lvyise())
        .concat(qinglaotou())
        .concat(sigangzi())
        .concat(jiulianbaodeng());

    for (let hupai of damanguan) {
        if (!rule['ダブル役満あり']) hupai.fanshu = '*';
        if (!rule['役満パオあり']) delete hupai.baojia;
    }
    if (damanguan.length > 0) return damanguan;

    let hupai = pre_hupai
        .concat(menqianqing())
        .concat(fanpai())
        .concat(pinghu())
        .concat(duanyaojiu())
        .concat(yibeikou())
        .concat(sansetongshun())
        .concat(yiqitongguan())
        .concat(hunquandaiyaojiu())
        .concat(qiduizi())
        .concat(duiduihu())
        .concat(sananke())
        .concat(sangangzi())
        .concat(sansetongke())
        .concat(hunlaotou())
        .concat(xiaosanyuan())
        .concat(hunyise())
        .concat(chunquandaiyaojiu())
        .concat(erbeikou())
        .concat(qingyise());

    if (hupai.length > 0) hupai = hupai.concat(post_hupai);

    return hupai;
}

function get_post_hupai(shoupai: Shoupai, rongpai: string | null | undefined, baopai: readonly string[], fubaopai: readonly string[] | null): Yaku[] {

    let new_shoupai = shoupai.clone();
    if (rongpai) new_shoupai.zimo(rongpai);
    let paistr = new_shoupai.toString();

    let post_hupai: Yaku[] = [];

    let suitstr = paistr.match(/[mpsz][^mpsz,]*/g) ?? [];

    let n_baopai = 0;
    for (let p of baopai) {
        p = Shan.zhenbaopai(p);
        const regexp = new RegExp(p[1], 'g');
        for (let m of suitstr) {
            if (m[0] != p[0]) continue;
            m = m.replace(/0/g, '5');
            let nn = m.match(regexp);
            if (nn) n_baopai += nn.length;
        }
    }
    if (n_baopai) post_hupai.push({ name: 'ドラ', fanshu: n_baopai });

    let n_hongpai = 0;
    let nn = paistr.match(/0/g);
    if (nn) n_hongpai = nn.length;
    if (n_hongpai) post_hupai.push({ name: '赤ドラ', fanshu: n_hongpai });

    let n_fubaopai = 0;
    for (let p of fubaopai || []) {
        p = Shan.zhenbaopai(p);
        const regexp = new RegExp(p[1], 'g');
        for (let m of suitstr) {
            if (m[0] != p[0]) continue;
            m = m.replace(/0/g, '5');
            let nn = m.match(regexp);
            if (nn) n_fubaopai += nn.length;
        }
    }
    if (n_fubaopai) post_hupai.push({ name: '裏ドラ', fanshu: n_fubaopai });

    return post_hupai;
}

function get_defen(initialFu: number, hupai: Yaku[], rongpai: string | null | undefined, param: HuleParam): HuleResult {
    let fu: number | undefined = initialFu;

    if (hupai.length == 0) return { defen: 0 };

    // 三人麻雀: 符計算なし・1000点単位テーブル適用
    if (param.rule['3p簡易スコア使用'] && param.rule['3p簡易スコア表']) {
        const table = param.rule['3p簡易スコア表'];
        // 飜数を集計（13以上は役満として固定）
        const isYakuman = typeof hupai[0].fanshu === 'string';
        let hanRaw = isYakuman ? 13 : hupai.reduce((s, h) => s + Number(h.fanshu), 0);
        let han = hanRaw >= 13 ? 13 : hanRaw;

        const menfeng = param.menfeng; // 0:親, 1/2:子
        const oya = menfeng == 0;

        let fenpei: ThreeScores = [0, 0, 0];
        const chang = param.jicun.changbang;
        const lizhi = param.jicun.lizhibang;

        if (rongpai) {
            // ロン
            let base = oya ? table.oya.ron[han] : table.ko.ron[han];
            const baojia = ronPayer(menfeng, rongpai);
            fenpei[menfeng] += base + chang * 1000 + lizhi * 1000;
            fenpei[baojia] -= base + chang * 1000;
            return { hupai, fu: undefined, fanshu: isYakuman ? undefined : hanRaw, damanguan: isYakuman ? 1 : undefined, defen: base, fenpei };
        }
        else {
            // ツモ
            if (oya) {
                let a = table.oya.tsumo[han][0];
                for (let l = 0; l < 3; l++) {
                    if (l == menfeng) fenpei[l] += a * 2 + chang * 2000 + lizhi * 1000;
                    else fenpei[l] -= a + chang * 1000;
                }
                const defen = a * 2;
                return { hupai, fu: undefined, fanshu: isYakuman ? undefined : hanRaw, damanguan: isYakuman ? 1 : undefined, defen, fenpei };
            }
            else {
                let [toOya, toKo] = table.ko.tsumo[han];
                for (let l = 0; l < 3; l++) {
                    if (l == menfeng) fenpei[l] += toOya + toKo + chang * 2000 + lizhi * 1000;
                    else if (l == 0) fenpei[l] -= toOya + chang * 1000;
                    else fenpei[l] -= toKo + chang * 1000;
                }
                const defen = toOya + toKo;
                return { hupai, fu: undefined, fanshu: isYakuman ? undefined : hanRaw, damanguan: isYakuman ? 1 : undefined, defen, fenpei };
            }
        }
    }

    let menfeng = param.menfeng;
    let fanshu: number | undefined, damanguan: number | undefined;
    let defen: number, base: number, defen2: number, base2 = 0;
    let baojia2: number | undefined;

    if (typeof hupai[0].fanshu === 'string') {
        fu = undefined;
        damanguan = !param.rule['役満の複合あり'] ? 1
            : hupai.reduce((count, h) => count + (typeof h.fanshu === 'string' ? h.fanshu.length : 0), 0);
        base = 8000 * damanguan;

        let h = hupai.find(h => h.baojia !== undefined);
        if (h && h.baojia && typeof h.fanshu === 'string') {
            baojia2 = (menfeng + directions[h.baojia]) % 3;
            base2 = 8000 * Math.min(h.fanshu.length, damanguan);
        }
    }
    else {
        fanshu = hupai.reduce((count, h) => count + Number(h.fanshu), 0);
        base = (fanshu >= 13 && param.rule['数え役満あり'])
            ? 8000
            : (fanshu >= 11) ? 6000
                : (fanshu >= 8) ? 4000
                    : (fanshu >= 6) ? 3000
                        : param.rule['切り上げ満貫あり'] && initialFu << (2 + fanshu) == 1920
                            ? 2000
                            : Math.min(initialFu << (2 + fanshu), 2000);
    }

    let fenpei: ThreeScores = [0, 0, 0];
    let chang = param.jicun.changbang;
    let lizhi = param.jicun.lizhibang;

    if (baojia2 != null) {
        if (rongpai) base2 = base2 / 2;
        base = base - base2;
        defen2 = base2 * (menfeng == 0 ? 6 : 4);
        fenpei[menfeng] += defen2;
        fenpei[baojia2] -= defen2;
    }
    else defen2 = 0;

    if (rongpai || base == 0) {
        const baojia = base === 0 ? baojia2 : rongpai && ronPayer(menfeng, rongpai);
        if (typeof baojia !== 'number') throw new Error('Missing payment seat');
        defen = Math.ceil(base * (menfeng == 0 ? 6 : 4) / 100) * 100;
        fenpei[menfeng] += defen + chang * 300 + lizhi * 1000;
        fenpei[baojia] -= defen + chang * 300;
    }
    else {
        const payout = distributeTsumo(base, menfeng, chang, lizhi);
        defen = payout.defen;
        for (let l = 0; l < fenpei.length; l++) fenpei[l] += payout.fenpei[l];
    }

    return {
        hupai: hupai,
        fu: fu,
        fanshu: fanshu,
        damanguan: damanguan,
        defen: defen + defen2,
        fenpei: fenpei
    };
}

export function hule(shoupai: Shoupai, rongpai: string | null | undefined, param: HuleParam): HuleResult | undefined {

    if (rongpai) {
        if (!rongpai.match(/[\+\=\-]$/)) throw new Error(rongpai);
        rongpai = rongpai.slice(0, 2) + rongpai.slice(-1);
    }

    let max: HuleResult | undefined;

    let pre_hupai = get_pre_hupai(param.hupai);
    let post_hupai = get_post_hupai(shoupai, rongpai,
        param.baopai, param.fubaopai);

    for (let mianzi of hule_mianzi(shoupai, rongpai)) {

        let hudi = get_hudi(mianzi, param.zhuangfeng, param.menfeng,
            param.rule);
        let hupai = get_hupai(mianzi, hudi, pre_hupai, post_hupai, param.rule);
        let rv = get_defen(hudi.fu, hupai, rongpai, param);

        if (!max || rv.defen > max.defen
            || rv.defen == max.defen
            && (!rv.fanshu || rv.fanshu > (max.fanshu ?? NaN)
                || rv.fanshu == max.fanshu && (rv.fu ?? NaN) > (max.fu ?? NaN))) max = rv;
    }

    return max;
}

export function hule_param(param: HuleParamInput = {}): HuleParam {

    let rv = {
        rule: param.rule ?? createRule(),
        zhuangfeng: param.zhuangfeng ?? 0,
        menfeng: param.menfeng ?? 1,
        hupai: {
            lizhi: param.lizhi ?? 0,
            yifa: param.yifa ?? false,
            qianggang: param.qianggang ?? false,
            lingshang: param.lingshang ?? false,
            haidi: param.haidi ?? 0,
            tianhu: param.tianhu ?? 0
        },
        baopai: typeof param.baopai === 'string' ? [param.baopai] : [...(param.baopai ?? [])],
        fubaopai: typeof param.fubaopai === 'string' ? [param.fubaopai] : param.fubaopai ? [...param.fubaopai] : null,
        jicun: {
            changbang: param.changbang ?? 0,
            lizhibang: param.lizhibang ?? 0
        }
    };

    return rv;
}

