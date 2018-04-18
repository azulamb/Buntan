var Buntan = (function () {
    function Buntan(target, config) {
        this.logs = [];
        this.anime = false;
        this.effect = false;
        this.effects = {};
        this.count = -1;
        this.charInterval = 0;
        this.autoInterval = 0;
        this.events = {};
        this.config = config || {};
        if (this.config.escapement && this.config.escapement < 0) {
            this.config.escapement = 0;
        }
        if (this.config.afterWait && this.config.afterWait < 0) {
            this.config.afterWait = 1000;
        }
        if (this.config.printTime && this.config.printTime < 0) {
            this.config.afterWait = 0;
        }
        this.chara = target.getElementsByClassName('chara')[0];
        var win = target.getElementsByClassName('msgwin')[0];
        this.name = win.getElementsByClassName('name')[0];
        this.text = win.getElementsByClassName('text')[0];
    }
    Buntan.prototype.addEffect = function (name, effect) {
        this.effects[name] = effect;
    };
    Buntan.prototype.addEventListener = function (event, cb) {
        if (!cb) {
            return;
        }
        switch (event) {
            case 'choices':
                this.events.choices = cb;
                break;
            case 'next':
                this.events.next = cb;
                break;
            case 'end':
                this.events.end = cb;
                break;
        }
    };
    Buntan.prototype.onChoices = function () {
        if (!this.events.choices) {
            return;
        }
        this.events.choices(this.logs[this.count].choices || []);
    };
    Buntan.prototype.onNext = function (prev, next) {
        if (!this.events.next) {
            return;
        }
        this.events.next(this.logs[prev], this.logs[next]);
    };
    Buntan.prototype.onEnd = function (end) {
        if (!this.events.end) {
            return;
        }
        this.events.end(this.logs[end]);
    };
    Buntan.prototype.add = function (logs) {
        var _this = this;
        logs.forEach(function (log) { _this.logs.push(log); });
    };
    Buntan.prototype.nextLog = function (label) {
        var count = this.count;
        if (!label) {
            this.onNext(count, count + 1);
            return this.logs[++this.count];
        }
        this.count = -1;
        while (++this.count < this.logs.length) {
            if (this.logs[this.count].label === label) {
                this.onNext(count, this.count);
                return this.logs[this.count];
            }
        }
        this.onEnd(count);
        return null;
    };
    Buntan.prototype.clearCharAnime = function () {
        var _this = this;
        if (this.charInterval) {
            clearInterval(this.charInterval);
        }
        this.charInterval = 0;
        while (0 < this.chars.length) {
            this.text.textContent += this.chars.shift() || '';
        }
        if (this.effect) {
            return;
        }
        var key = this.logs[this.count].effect;
        if (key && this.effects[key]) {
            this.effect = true;
            this.effects[key](function () {
                _this.effect = false;
                _this.anime = false;
            });
            return;
        }
        this.anime = false;
    };
    Buntan.prototype.nextChar = function () {
        var _this = this;
        if (!this.config.escapement || this.config.escapement <= 0) {
            this.clearCharAnime();
            return;
        }
        this.charInterval = setInterval(function () {
            if (_this.chars.length <= 0) {
                return _this.clearCharAnime();
            }
            _this.text.textContent += _this.chars.shift() || '';
        }, this.config.escapement);
    };
    Buntan.prototype._next = function (log) {
        if (log.name !== undefined) {
            this.name.textContent = log.name;
        }
        this.chars = log.text.split(/(?![\uDC00-\uDFFF])/);
        this.text.textContent = '';
        this.anime = true;
    };
    Buntan.prototype.next = function (label) {
        if (this.anime) {
            if (0 < this.chars.length) {
                this.clearCharAnime();
            }
            return null;
        }
        if (this.logs.length <= this.count) {
            return null;
        }
        if (0 <= this.count && this.logs[this.count].choices && !label) {
            if (this.events.choices && this.logs[this.count].choices) {
                this.onChoices();
            }
            return this.logs[this.count].choices;
        }
        if (0 <= this.count && this.logs[this.count].jump) {
            label = this.logs[this.count].jump;
        }
        var log = this.nextLog(label);
        if (!log) {
            return null;
        }
        this._next(log);
        this.nextChar();
        return null;
    };
    Buntan.prototype.choice = function (select) {
        if (this.count < 0 || !this.logs[this.count] || !this.logs[this.count].choices) {
            return this.next();
        }
        var choices = this.logs[this.count].choices;
        if (!choices) {
            return this.next();
        }
        if (choices.length <= 1) {
            return this.next(choices[0].label);
        }
        return this.next(choices[select % choices.length].label);
    };
    Buntan.prototype.auto = function () {
        var _this = this;
        if (this.autoInterval) {
            return;
        }
        var begin = new Date().getTime();
        var end = 0;
        var afterWait = this.config.afterWait || 0;
        var printTime = this.config.printTime || 0;
        this.autoInterval = setInterval(function () {
            if (_this.anime) {
                return;
            }
            var now = new Date().getTime();
            if (end <= 0) {
                end = begin;
            }
            if (now - end < afterWait) {
                return;
            }
            if (now - begin < printTime) {
                return;
            }
            end = 0;
            begin = now;
            _this.next();
        }, this.config.escapement || 100);
    };
    Buntan.prototype.cancelAuto = function () {
        if (this.autoInterval) {
            clearInterval(this.autoInterval);
        }
        this.autoInterval = 0;
    };
    Buntan.prototype.getLogs = function (all) {
        if (all === void 0) { all = false; }
        if (all || this.logs.length + 1 <= this.count) {
            return this.logs;
        }
        if (this.count < 0) {
            return [];
        }
        return this.logs.slice(0, this.count + 1);
    };
    Buntan.prototype.isEnd = function () {
        return (0 < this.count || this.logs.length <= this.count) && this.logs[this.count] === undefined;
    };
    return Buntan;
}());
