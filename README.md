# Fever Mahjong Core

[ntanetani/fever-majiang-core](https://github.com/ntanetani/fever-majiang-core) の
メンテナンス用フォークです。元の実装は
[kobalab/majiang-core](https://github.com/kobalab/majiang-core)（Satoshi Kobayashi）です。

三人用の牌山・局進行・和了点計算を提供する CommonJS ライブラリです。
対局サーバーや通信層は含みません。
Fever 麻将由来のルールであり、北抜きを含む天鳳・雀魂の三麻ルールとの
互換性はありません。四人用は別入口から、既存の上流エンジンをそのまま使います。

## インストール（公開後）

TypeScript ソースから生成した CommonJS と型宣言を公開します。Node.js 22・24 を CI で検証します。

```sh
npm install @aqz/fever-majiang-core
```

```js
const threePlayer = require('@aqz/fever-majiang-core/three-player');
const fourPlayer = require('@aqz/fever-majiang-core/four-player');
// require('@aqz/fever-majiang-core') is the same as threePlayer.
```

四麻入口は MIT の [@kobalab/majiang-core 1.4.1](https://github.com/kobalab/majiang-core/tree/7e964296dd8eb5ff5a32f8182acdc6a0c2a81cbb) に固定した薄いラッパーです。四麻のルールは変更せず、型宣言は検証した公開 API の一部を提供します。

## テスト

- `npm ci && npm test`: TypeScript のビルド、型定義の利用テスト、三麻の回帰テスト。
- `npm run typecheck`: 移行済み TypeScript ソースの厳密な型チェック。
- 公開 API の型は TypeScript ソースから生成します。
- `npm ci && npm run build && npm run test:legacy`: 引き継いだテスト一式。四人用の局進行・牌山・
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
