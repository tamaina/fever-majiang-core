# Fever Mahjong Core

[ntanetani/fever-majiang-core](https://github.com/ntanetani/fever-majiang-core) の
メンテナンス用フォークです。元の実装は
[kobalab/majiang-core](https://github.com/kobalab/majiang-core)（Satoshi Kobayashi）です。

三人用の牌山・局進行・和了点計算を提供する CommonJS ライブラリです。
Fever 麻将由来のルールであり、北抜きを含む天鳳・雀魂の三麻ルールとの
互換性はありません。既存の四人用まーじゃんコアの置き換えにも使えません。

## インストール

```sh
npm install @aqz/fever-majiang-core
```

```js
const { Game, Shan, Shoupai, Util, rule } = require('@aqz/fever-majiang-core');
```

## テスト

- `npm test`: 三麻の回帰テスト。追加依存なしで実行できます。
- `npm ci && npm run test:legacy`: 引き継いだテスト一式。四人用の局進行・牌山・
  点数などを期待するケースが残っており、三麻版では一部が失敗します。

## 提供機能
| クラス名            | 機能                                 |
|:--------------------|:-------------------------------------|
| ``Majiang.Shoupai`` | 手牌を表現するクラス                 |
| ``Majiang.Shan``    | 牌山を表現するクラス                 |
| ``Majiang.He``      | 捨て牌を表現するクラス               |
| ``Majiang.Util``    | シャンテン数計算、和了点計算ルーチン |
| ``Majiang.Game``    | 局進行を実現するクラス               |
| ``Majiang.Board``   | 卓情報を更新するクラス               |
| ``Majiang.Player``  | 対局者を実現する基底クラス           |

## API仕様
- [API仕様](https://github.com/kobalab/majiang-core/wiki)

## ライセンス
[MIT](https://github.com/kobalab/majiang-core/blob/master/LICENSE)

## 作者
[Satoshi Kobayashi](https://github.com/kobalab)
