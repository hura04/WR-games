// ゲームの入口。index.html から読み込まれます。
import './style.css';
import { Game } from './core/Game.js';

const game = new Game(document.getElementById('app'));

// 開発中（npm run dev）だけ、動作確認用にブラウザのコンソールから触れるようにする
if (import.meta.env.DEV) window.__game = game;
