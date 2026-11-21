/*!
 *  Fever Mahjong Core, derived from @kobalab/majiang-core
 *
 *  Copyright(C) 2021 Satoshi Kobayashi
 *  Released under the MIT license
 *  https://github.com/kobalab/majiang-core/blob/master/LICENSE
 */

import rule = require('./rule');
import Shoupai = require('./shoupai');
import Shan = require('./shan');
import He = require('./he');
import Board = require('./board');
import Game = require('./game');
import Player = require('./player');
import Xiangting = require('./xiangting');
import Hule = require('./hule');

const Util = Object.assign({}, Xiangting, Hule);

export = { rule, Shoupai, Shan, He, Board, Game, Player, Util };
