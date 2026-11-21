/*
 *  Majinng.rule
 */
"use strict";

type Scores = {
    oya: { ron: Record<number, number>; tsumo: Record<number, readonly [number, ...number[]]> };
    ko: { ron: Record<number, number>; tsumo: Record<number, readonly [number, number]> };
};

function defaults() {

    let rule = {
        /* 点数関連 */
        '配給原点': 35000,
        '順位点': ['15.0', '-5.0', '-10.0'],
        '連風牌は2符': false,

        /* 赤牌有無/クイタンなど */
        '赤牌': { m: 0, p: 1, s: 1 },
        'クイタンあり': true,
        '喰い替え許可レベル': 0,
        // 0: 喰い替えなし, 1: スジ喰い替えあり,  2: 現物喰い替えもあり

        /* 局数関連 */
        '場数': 2,
        // 0: 一局戦, 1: 東風戦, 2： 東南戦, 4: 一荘戦
        '途中流局あり': true,
        '流し満貫あり': true,
        'ノーテン宣言あり': false,
        'ノーテン罰あり': true,
        '最大同時和了数': 2,
        // 1: 頭ハネ, 2: ダブロンあり, 3: トリロンあり
        '連荘方式': 2,
        // 0: 連荘なし, 1: 和了連荘, 2: テンパイ連荘, 3: ノーテン連荘
        'トビ終了あり': true,
        'オーラス止めあり': true,
        '延長戦方式': 1,
        // 0: 延長戦なし, 1: サドンデス, 2: 連荘優先サドンデス, 3: 4局固定

        /* リーチ/ドラ関連 */
        '一発あり': true,
        '裏ドラあり': true,
        'カンドラあり': true,
        'カン裏あり': true,
        'カンドラ後乗せ': true,
        'ツモ番なしリーチあり': false,
        'リーチ後暗槓許可レベル': 2,
        // 0: 暗槓不可, 1: 牌姿の変わる暗槓不可, 2： 待ちの変わる暗槓不可

        /* 役満関連 */
        '役満の複合あり': true,
        'ダブル役満あり': true,
        '数え役満あり': true,
        '役満パオあり': true,
        '切り上げ満貫あり': false,

        /* 三人麻雀: 符計算なし・1000点単位の簡易スコアを使う場合 */
        '3p簡易スコア使用': true,
        '3p簡易スコア表': null as Scores | null,
        '流し満貫は役満扱い': true,
        'ノーテン罰符': 1000,
    };

    return rule;
}

type Rule = ReturnType<typeof defaults>;

function createRule(param: Partial<Rule> = {}): Rule {
    return { ...defaults(), ...param };
}

export = createRule;
