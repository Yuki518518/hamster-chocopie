# あっちゃんにチョコパイ！

三角チョコパイを、ぽーんっ！ 左右に動くハムスターにおやつを届ける、30秒のブラウザゲームです。スマホではスワイプ、パソコンではマウスのドラッグで遊べます。ビルドや登録は不要です。

## 遊び方

1. 「はじめる ♡」を押します。音は右上のボタンで切り替えられます。
2. 画面下のチョコパイに指を置き、上へ動かして離します。
3. スワイプの方向・距離・速さで軌道が変わります。あっちゃんの少し先をねらうのがコツです。
4. 1個届くと10点。30秒後に結果を表示します。終了直前に投げたパイは着地まで判定します。
5. 「もういっかい！」で再挑戦。「結果をシェア」で共有または結果とURLをコピーします。

最高得点と音設定はそのブラウザに保存されます。保存できない環境でも遊べます。画面を離れると一時停止し、戻ったら「つづける」を押します。

## ファイル構成

- `index.html` / `styles.css`：画面とデザイン
- `js/main.js`：画面切替・保存・共有
- `js/game.js`：30秒の進行とハムスターの移動
- `js/physics.js`：奥行き・高さ・水平位置と連続命中判定
- `js/input.js`：Pointer Eventsによるスワイプ
- `js/renderer.js`：Canvas描画
- `js/audio.js`：BGMと合成効果音
- `js/config.js`：難易度・音量などの設定
- `assets/`：イラストとBGM
- `tests/`：物理演算の自動テスト
- `ASSETS_LICENSES.md`：出典とライセンス

## パソコンで起動する

このフォルダでターミナルを開き、Pythonがあれば次を実行します。

```sh
python -m http.server 8000
```

ブラウザで http://localhost:8000 を開きます。HTMLファイルのダブルクリックではなくHTTPサーバーを使ってください。

## GitHub Pagesへの公開

1. GitHubで公開リポジトリ `hamster-chocopie` を作ります。
2. このフォルダの中身を `main` ブランチ直下へアップロードします。
3. リポジトリの Settings → Pages → Source を「Deploy from a branch」にします。
4. Branch は `main`、フォルダは `/ (root)` を選び Save を押します。
5. 公開が完了すると `https://ユーザー名.github.io/hamster-chocopie/` で遊べます。

認証済みのGitHub CLIがある場合は、次の操作でも準備できます。

```sh
git init -b main
git add .
git commit -m "あっちゃんにチョコパイ！を公開"
gh repo create hamster-chocopie --public --source=. --remote=origin --push
```

その後、Settings → Pagesで上記の設定をしてください。素材のパスは相対指定のため、サブディレクトリでも動きます。

## イラストを差し替える

`assets/images/hamster.svg`、`chocopie.svg`、`strawberry.svg` を同じ名前で置き換えます。透明背景と余白の少ない正面絵がおすすめです。PNGなどへ変更する場合は `index.html` と `js/main.js` 内のファイル名も変更します。

参考画像や個人のチャット画面を追加せず、公開してよい素材だけ使ってください。

## BGM・効果音を差し替える

`assets/audio/bgm.mp3` を利用可能なMP3で置き換えます。音量は `js/config.js` の `bgmVolume`、`sfxVolume` で変更できます。効果音は `js/audio.js` の `effect()` にまとめてあります。再生は「はじめる」を押した後に開始します。BGMが読めない場合は合成音の予備ループを使います。

## 難易度を変える

`js/config.js` の数字を変更します。`duration` は秒数、`points` は1命中の点数、`minSpeed` / `maxSpeed` / `fastSpeed` は移動速度、`changeMin` / `changeMax` は移動変更間隔、`hitRadius` は当たりやすさです。`gravity`、`minDepthSpeed` / `maxDepthSpeed`、`throwSensitivity` は投げ心地、`effectDuration` は命中演出の長さです。速度は正規化した画面幅単位で扱っています。

## テスト

Node.jsがあればこのフォルダで `npm test` を実行できます。タップの無効化、強弱、放物線、奥行きでの連続衝突、二重得点防止、30/60/120fpsの一致を検証します。

ブラウザでは開始・斜めスワイプ・命中と失敗・30秒終了・再挑戦・一時停止・音声切替・共有を確認します。iPhone実機の音声、OSの共有シート、ホームインジケーター周辺は実機での確認もおすすめします。

## ライセンス

BGMはharutaさんの「kawaii 8bit」（CC0）。詳しくは `ASSETS_LICENSES.md` を参照してください。イラストと効果音はゲーム用に制作しました。
