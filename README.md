# Buntan

某作業で必要になって作った、シナリオ再生用のエンジン。
かなり薄く作って最低限の作業をこなし、後は拡張して使うことを想定。

# 使い方

## 初期化

以下要素を持ったHTMLを用意します。

```
<div class="msgwin"><!-- Message window -->
	<div class="name"> Name </div>
	<div class="text"> Text </div>
</div>
```

この要素を含む親要素が最低限必要です。

これを持つ親要素を指定するので、最小構成は以下のような感じです。

```
<div id="content"><!-- Parent node -->
	<div class="msgwin"><!-- Message window -->
		<div class="name"> Name </div>
		<div class="text"> Text </div>
	</div>
</div>
```

詳しくは `docs/index.html` を見てください。

サンプルでは以下のようになります。

```
var adv = new Buntan( document.getElementById('content') );
```

また第二引数ではオプションを指定することもできます。

### オプションについて


#### escapement: number

文字送りのスピード（ミリ秒）を指定します。

大雑把なので精度を期待しないこと。

#### afterWait: number

指定するとオート再生時に、すべての文字を読んだ後に最低限待つ時間（ミリ秒）を指定できます。

大雑把なので精度を期待しないこと。

下の `printTime` を指定している場合、この待ち時間を過ぎるまで判定が実行されないことに注意してください。

またデフォルトでは1秒に設定してあります。

#### printTime: number

指定するとオート再生時に、文字を表示し始めてから終わった後次の文章を再生するまで、どれだけ文字を表示するかを指定できます。

`afterWait` 指定時にはこの待ち時間が終わるまではこの判定が実行されないことに注意してください。


### オート用の指定について

オートの再生周りは、次のような処理で行われます。

* `escapement` で指定した間隔で文字が表示される
* 文字をすべて表示し終わると、`afterWait` だけ待つ。
* 文字をすべて表示し、待ち時間も消費してもなお `printTime` より短い場合は、この時間を過ぎるまで待つ。

また、わりとこの処理は大雑把なので、精度に関しては期待せず、最低限これだけの時間は確保するという目安に考えてください。

## エフェクトの追加

テキストの再生終了後にエフェクトを入れることができます。

デフォルトで何かエフェクトが用意されていたりはしないので、必要なエフェクトの名前と処理をあらかじめ登録しておきます。

```
adv.addEffect('finish', function (end) {
	var content = document.getElementById('content');
	var color = content.style.backgroundColor;
	content.style.backgroundColor = 'pink';
	setTimeout(function () {
		content.style.backgroundColor = color;
		end();
	}, 2000);
});
```

これは `finish` というエフェクトで、`#content` の要素の背景色を2秒間だけピンクにして戻します。

このエフェクトについて注意事項が一つあり、エフェクトの第一引数に与えられる `end` 関数を必ず呼び出してください。
これが呼び出されない限り、Buntanはエフェクトが続いていると判断して、何もしなくなります。

## テキストの追加

以下のようにテキストの配列を追加します。

```
adv.add([
	{ name: 'aaa', text: 'もしかして？' },
]);
```

動的に追加も（理論上は）可能です。

配列の要素は以下のようになっています。

### text[必須]

会話文です。
登録した要素内にある `.text` を更新します。

名前など指定しない場合は前のものが継続して使われますが、会話文に関しては必ず更新されるため、絶対に必要です。

### name[任意]

表示する名前です。
登録した要素内にある `.name` を更新します。

省略時には過去のを引き継ぎます。


### label[任意]

設定すると選択肢で飛ぶことができるラベルです。

ラベルの設定以上の効果はないです。

ラベルを設定すると、`jump` や 選択肢からの飛び先指定が可能になります。
ラベルに飛ぶ場合は、必ず一番上から検索するため、同じラベルを付けると最初のラベルにしか飛ばないです。

### jump[任意]

設定するとテキスト再生後に指定したラベルに飛びます。

### effect[任意]

設定するとテキスト再生後に指定したエフェクトを再生します。

エフェクトは事前に `addEffect` で追加したものに限ります。

### choices[任意]

テキスト再生後に選択肢を出すイベントを発生させることができます。

選択肢の配列を渡すことで、イベント発生時にこの配列が受け取れます。

配列の要素として必須なのは以下です。

```
{ name: 表示選択肢, label: 遷移先ラベル }
```

## イベントの検知

いくつか一定の条件を満たすとイベントが発生し、コールバック関数を登録することで検知することができます。

```
adv.addEventListener('choices', function (choices) {
	var area = document.getElementById('choices');
	area.classList.add('open');
	var children = area.childNodes;
	for (var i = children.length - 1; 0 <= i; --i) {
		area.removeChild(children[i]);
	}
	choices.forEach(function (choice, index) {
		var button = document.createElement('button');
		button.textContent = choice.name;
		button.addEventListener('click', function (event) {
			event.preventDefault();
			adv.choice(index);
			area.classList.remove('open');
		}, false);
		area.appendChild(button);
	});
});
```

例えばこれば選択肢が現れた時のイベントで、選択肢を受け取って選択肢の画面を作っています。

イベントには以下があります。

### choices

### next

### end

## 次に進む

上の準備ができたら実際にストーリーを再生します。

基本的には `next` を呼び出せば進みます。

```
adv.next();
```

これが以下のような挙動を示します。

* 文字送りの途中だった場合、文字をすべて出力する
    * 出力後止まるので、再度 `next` を呼び出すことで次に進める
* 選択肢がある場合は次に進まない
    * `choice` で選択肢の番号(配列の0-)を指定することで、指定した番号に書いてあるラベルに飛ぶ
    * もしくは `next( ラベル )` でラベルに強制的に飛ぶ
        * `choice` の内部実装は最終的に `next( ラベル )` になる
* エフェクト再生中の場合は次に進まない
* ラベルの指定、もしくは会話に `jump` で飛び先ラベルが指定されている場合、そこまで進む
* それ以外の場合は会話を1つ進める

選択肢やエフェクトアニメーション再生中は何もできず、文章がすべて表示されていないと次に進めないとわかっていれば大丈夫です。

## オート再生

オートで再生する場合は次のようにします。

```
adv.auto();
```

止める場合は以下です。

```
adv.cancelAuto();
```

次に進む場合はオートを止める場合がほとんどだと思うので、次のように使うと良いでしょう。

```
// 次に進む
function NextMessage() {
	// オートは止める
	adv.cancelAuto();
	// 次に進む
	adv.next();
}
```

# 今後について

何かイベント登録でわりと万能に操作できるので、不要なもの削りたい。
