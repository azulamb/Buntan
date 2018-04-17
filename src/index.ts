interface CHOICE_DATA
{
	name: string,
	label: string,
}

interface BUNTAN_DATA
{
	text: string,
	name?: string,
	label?: string,
	jump?: string,
	effect?: string,
	choices?: CHOICE_DATA[],
}

interface BUNTAN_CONFIG
{
	escapement?: number,
	afterWait?: number,
	printTime?: number,
}

interface BUNTAN_EVENT
{ 
	choices?: ( data: CHOICE_DATA[] ) => void,
	next?: ( prev: BUNTAN_DATA, next: BUNTAN_DATA ) => void,
	end?: ( last: BUNTAN_DATA ) => void,
}

class Buntan
{
	private logs: BUNTAN_DATA[];
	private config: BUNTAN_CONFIG;

	private chara: HTMLElement;
	private name: HTMLElement;
	private text: HTMLElement;

	private anime: boolean;
	private effect: boolean;
	private count: number;
	private chars: string[];
	private charInterval: number;
	private autoInterval: number;

	private effects: { [ key: string ]: ( cb: () => void ) => void }
	private events: BUNTAN_EVENT;

	/** コンストラクタ
	target: 必要なUIを含んだHTMLElement
	config: 制御設定[任意]
	        escapement: 文字送りの速度(ミリ秒)
	*/
	constructor( target: HTMLElement, config?: BUNTAN_CONFIG )
	{
		// もろもろの初期化
		this.logs = [];
		this.anime = false;
		this.effect = false;
		this.effects = {};
		this.count = -1;
		this.charInterval = 0;
		this.autoInterval = 0;
		this.events = {};
		this.config = config || {};

		// 制御設定の初期化
		if ( this.config.escapement && this.config.escapement < 0 ) { this.config.escapement = 0; }
		if ( this.config.afterWait && this.config.afterWait < 0 ) { this.config.afterWait = 1000; }
		if ( this.config.printTime && this.config.printTime < 0 ) { this.config.afterWait = 0; }

		// 必要な要素の取得
		this.chara = <HTMLElement>target.getElementsByClassName( 'chara' )[ 0 ];
		const win = target.getElementsByClassName( 'msgwin' )[ 0 ];
		this.name = <HTMLElement>win.getElementsByClassName( 'name' )[ 0 ];
		this.text = <HTMLElement>win.getElementsByClassName( 'text' )[ 0 ];
	}

	/** エフェクト追加
	name:   エフェクト名
	effect: エフェクト関数
	        必ずエフェクトの後に第一引数のcbを呼ぶようにすること！
	*/
	public addEffect( name: string, effect: ( cb: () => void ) => void )
	{
		this.effects[ name ] = effect;
	}

	/** イベント追加
	event:  対応したイベントを追加できる
	        choices ... 選択肢が現れた時に呼ばれるイベント
	        next    ... 次の文章に進むときに呼ばれるイベント
	        end     ... 文章の最後を再生し終わった時に呼ばれるイベント
	cb:     イベントが発生したときに呼ばれるコールバック関数
	*/
	public addEventListener( event: 'choices', cb: BUNTAN_EVENT[ 'choices' ] ): void;
	public addEventListener<K extends keyof BUNTAN_EVENT>( event: K, cb: BUNTAN_EVENT[ K ] )
	{
		if ( !cb ) { return; }
		switch ( event )
		{
			case 'choices': this.events.choices = <BUNTAN_EVENT['choices']>cb; break;
			case 'next': this.events.next = <BUNTAN_EVENT['next']>cb; break;
			case 'end': this.events.end = <BUNTAN_EVENT['end']>cb; break;
		}
	}

	private onChoices()
	{
		if ( !this.events.choices ) { return; }
		this.events.choices( this.logs[ this.count ].choices || [] );
	}

	private onNext( prev: number, next: number )
	{
		if ( !this.events.next ) { return; }
		this.events.next( this.logs[ prev ], this.logs[ next ] );
	}

	private onEnd( end: number )
	{
		if ( !this.events.end ) { return; }
		this.events.end( this.logs[ end ] );
	}

	/**
	logs:   会話ログを追加する
	        以下構造の配列を与える
	        {
	            text:   会話文[必須]
	            name:   表示する名前[任意,省略時には過去のを引き継ぐ]
	            label:  設定すると選択肢で飛ぶことができるラベル[任意]
	            jump:   設定するとテキスト再生後に指定したラベルに飛ぶ[任意]
	            effect: 設定するとテキスト再生後に指定したエフェクトを再生する[任意]
	                    エフェクトは事前にaddEffectで登録する必要あり
	            choices:選択肢の配列[任意]
	                    { name: 表示選択肢, label: 遷移先ラベル }
	        }
	*/
	public add( logs: BUNTAN_DATA[] )
	{
		logs.forEach( ( log ) => { this.logs.push( log ); } );
	}

	/** 次に進む
	label:  飛ぶ先のラベル[任意]
	*/
	private nextLog( label?: string )
	{
		const count = this.count;
		if ( !label )
		{
			this.onNext( count, count + 1 );
			return this.logs[ ++this.count ];
		}

		// labelが設定してある場合、最初から検索する
		this.count = -1;
		while ( ++this.count < this.logs.length )
		{
			if ( this.logs[ this.count ].label === label )
			{
				this.onNext( count, this.count );
				return this.logs[ this.count ];
			}
		}
		this.onEnd( count );

		return null;
	}

	/** 文字送りを止めてすべて表示する*/
	private clearCharAnime()
	{
		if ( this.charInterval ) { clearInterval( this.charInterval ); }
		this.charInterval = 0;
		while ( 0 < this.chars.length ) { this.text.textContent += this.chars.shift() || ''; }
		if ( this.effect ) { return; }
		const key = this.logs[ this.count ].effect;
		if ( key && this.effects[ key ] )
		{
			this.effect = true;
			this.effects[ key ]( () =>
			{
				this.effect = false;
				this.anime = false;
			} );
			return;
		}
		this.anime = false;
	}

	/** 文字送りを開始する */
	private nextChar()
	{
		if ( !this.config.escapement || this.config.escapement <= 0 )
		{
			this.clearCharAnime();
			return;
		}

		this.charInterval = setInterval( () =>
		{
			if ( this.chars.length <= 0 ) { return this.clearCharAnime(); }
			this.text.textContent += this.chars.shift() || '';
		}, this.config.escapement );
	}

	/** 次のログを表示する */
	private _next( log: BUNTAN_DATA )
	{
		if ( log.name !== undefined ) { this.name.textContent = log.name; }

		this.chars = log.text.split( /(?![\uDC00-\uDFFF])/ );
		this.text.textContent = '';

		this.anime = true;
	}

	/** 次に進む
	label:  次に進むラベル[任意]
	*/
	public next( label?: string )
	{
		if ( this.anime )
		{
			// 文字送り中の場合は、文字送りをやめて全文表示
			if ( 0 < this.chars.length ) { this.clearCharAnime(); }
			return null;
		}

		// もうログがない場合は何もしない
		if ( this.logs.length <= this.count ) { return null; }

		// 今選択肢にいる場合、label無しで次に進ませない。
		if ( 0 <= this.count && this.logs[ this.count ].choices && !label )
		{
			// イベントを登録している場合は実行
			if ( this.events.choices && this.logs[ this.count ].choices ) { this.onChoices(); }
			return this.logs[ this.count ].choices;
		}

		// 今飛び先にいる場合、強制的にラベルを書き換える。
		if ( 0 <= this.count && this.logs[ this.count ].jump )
		{
			label = this.logs[ this.count ].jump;
		}

		// 次に進む
		const log = this.nextLog( label );

		if ( !log ) { return null; }

		// 次に進めるので、表示する
		this._next( log );

		this.nextChar();

		return null;
	}

	/** 選択肢を選ぶ
	select: 選択肢に来ている場合、選択肢を番号で選べる
	*/
	public choice( select: number )
	{
		if ( this.count < 0 || !this.logs[ this.count ] || !this.logs[ this.count ].choices ) { return this.next(); }
		const choices = <CHOICE_DATA[]>this.logs[ this.count ].choices;
		if ( !choices ) { return this.next(); }
		if ( choices.length <= 1 )
		{
			return this.next( choices[ 0 ].label );
		}
		return this.next( choices[ select % choices.length ].label );
	}

	/** オートモード開始 */
	public auto()
	{
		if ( this.autoInterval ) { return; }

		let begin = new Date().getTime();
		let end = 0;
		const afterWait = this.config.afterWait || 0;
		const printTime = this.config.printTime || 0;
		this.autoInterval = setInterval( () =>
		{
			if ( this.anime ) { return; }
			const now = new Date().getTime();
			if ( end <= 0 ) { end = begin; }
			if ( now - end < afterWait ) { return; }
			if ( now - begin < printTime ) { return; }
			end = 0;
			begin = now;
			this.next();
		}, this.config.escapement || 100 );
	}

	/** オートモードをやめる */
	public cancelAuto()
	{
		if ( this.autoInterval ) { clearInterval( this.autoInterval ); }
		this.autoInterval = 0;
	}

	/** 次の選択肢までスキップする */
	/*public skip()
	{
		TODO: onNext,onEnd
		while ( this.count < this.logs.length )
		{
			if ( this.logs[ this.count ].choices ) { return this.onChoices(); }
			++this.count;
		}
	}*/

	public getLogs( all: boolean = false )
	{
		if ( all || this.logs.length + 1 <= this.count) { return this.logs; }
		if ( this.count < 0 ) { return []; }
		return this.logs.slice( 0, this.count + 1 );
	}

}
