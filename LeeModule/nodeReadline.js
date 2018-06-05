/*
 * nodeReadline v0.1.1
 * https://github.com/GuimDev/nodeReadline
 * Tested on = node v0.9.5
 */

const readline = require('readline'),
    util = require('util'),
    EventEmitter = require('events');

const myEmitter = new EventEmitter();

let rl,
    stdoutMuted = false,
    myPrompt = "> ",
    completions = [];

module.exports = (function() {
    return {
        init: init,
        secret: secret,
        getPrompt: function() {
            return myPrompt;
        },
        isMuted: function() {
            return stdoutMuted;
        },
        setCompletion: function(obj) {
            completions = (typeof obj == "object") ? obj : completions;
        },
        setMuted: function(bool, msg) {
            stdoutMuted = !!bool;
            msg = (msg && typeof msg == "string") ? msg : "> [hidden]";
            rl.setPrompt((!stdoutMuted) ? myPrompt : msg);
            return stdoutMuted;
        },
        setPrompt: function(str) {
            myPrompt = str;
            rl.setPrompt(myPrompt);
        },
        on: function(line) {
            myEmitter.on.apply(myEmitter, arguments);
        },
        getRL: function() {
            return rl;
        },
        getHistory: function() {
            return rl.history;
        },
        setHistory: function(history) {
            rl.history = history;
        }
    };
})();

let __fix_SIGINT_onQuestion = false;

function init(strPrompt) {
    myPrompt = strPrompt || "> ";

    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completer
    });

    rl.setPrompt(myPrompt);
    rl.on("line", function(line) {
        if (!stdoutMuted)
            rl.history.push(line);
        myEmitter.emit("line", line);
        rl.prompt();
    });
    rl.on("close", function() {
        myEmitter.emit("close");
        return process.exit(1);
    });
    rl.on("SIGINT", function() {
        __fix_SIGINT_onQuestion = !!rl._questionCallback;
        rl.line = '';
        if (!myEmitter.emit("SIGINT", rl))
            process.exit(1);
    });
    rl.prompt();

    hiddenOverwrite();
    consoleOverwrite();

    rl.input.on("data", function(char) { // fix CTRL+C on question
        if (char == "\u0003" && __fix_SIGINT_onQuestion) {
            rl._onLine("");
            rl._refreshLine();
        }
        __fix_SIGINT_onQuestion = false;
    });
}

function secret(query, callback) {
    const toggleAfterAnswer = !stdoutMuted;
    stdoutMuted = true;
    rl.question(query, function(value) {
        rl.history = rl.history.slice(1);

        if (toggleAfterAnswer)
            stdoutMuted = false;

        callback(value);
    });
}


function hiddenOverwrite() {
    rl._refreshLine = (function(refresh) {
        //https://github.com/nodejs/node/blob/v9.5.0/lib/readline.js#L335
        return function _refreshLine() {
            let abc;
            if (stdoutMuted) {
                abc = rl.line;
                rl.line = "";
            }

            refresh.apply(rl);

            if (stdoutMuted) {
                rl.line = abc;
            }
        }
    })(rl._refreshLine);

    //https://github.com/nodejs/node/blob/v9.5.0/lib/readline.js#L442
    function _insertString(c) {
        if (this.cursor < this.line.length) {
            const beg = this.line.slice(0, this.cursor);
            const end = this.line.slice(this.cursor, this.line.length);
            this.line = beg + c + end;
            this.cursor += c.length;
            this._refreshLine();
        } else {
            this.line += c;
            this.cursor += c.length;

            if (this._getCursorPos().cols === 0) {
                this._refreshLine();
            } else {
                //if (!stdoutMuted) {
                this._writeToOutput(c);
                //}
            }

            // a hack to get the line refreshed if it's needed
            this._moveCursor(0);
        }
    };
    rl._insertString = _insertString;

    rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (stdoutMuted)
            rl.output.write("\x1B[2K\x1B[200D" + rl._prompt + "[" + ((rl.line.length % 2 == 1) ? "=-" : "-=") + "]");
        else
            rl.output.write(stringToWrite);
    };
}

function consoleOverwrite() {
    const myWrite = function(stream, string, errorhandler) {
        const nbline = Math.ceil((rl.line.length + 3) / rl.columns);
        let text = "";
        text += "\n\r\x1B[" + nbline + "A\x1B[0J";
        text += string + "\r";
        text += Array(nbline).join("\r\x1B[1E");

        stream.write(text, errorhandler);

        rl._refreshLine();
    };
    const kGroupIndent = Symbol('groupIndent');
    console[kGroupIndent] = '';
    let MAX_STACK_MESSAGE;

    function noop() {}

    //Internal function console.js : https://github.com/nodejs/node/blob/v9.5.0/lib/console.js#L96
    function write(ignoreErrors, stream, string, errorhandler, groupIndent) {
        if (groupIndent.length !== 0) {
            if (string.indexOf('\n') !== -1) {
                string = string.replace(/\n/g, `\n${groupIndent}`);
            }
            string = groupIndent + string;
        }
        string += "\n";

        if (ignoreErrors === false) return myWrite(stream, string, errorhandler);

        try {
            stream.once('error', noop);
            myWrite(stream, string, errorhandler);
        } catch (e) {
            if (MAX_STACK_MESSAGE === undefined) {
                try {
                    function a() {
                        a();
                    }
                } catch (err) {
                    MAX_STACK_MESSAGE = err.message;
                }
            }
            if (e.message === MAX_STACK_MESSAGE && e.name === 'RangeError')
                throw e;
        } finally {
            stream.removeListener('error', noop);
        }
    }
    console.log = function log(...args) {
        write(console._ignoreErrors,
            console._stdout,
            util.format.apply(null, args),
            console._stdoutErrorHandler,
            console[kGroupIndent]);
    };
    console.debug = console.log;
    console.info = console.log;
    console.dirxml = console.log;

    console.warn = function warn(...args) {
        write(console._ignoreErrors,
            console._stderr,
            util.format.apply(null, args),
            console._stderrErrorHandler,
            console[kGroupIndent]);
    };
    console.error = console.warn;

    console.dir = function dir(object, options) {
        options = Object.assign({
            customInspect: false
        }, options);
        write(console._ignoreErrors,
            console._stdout,
            util.inspect(object, options),
            console._stdoutErrorHandler,
            console[kGroupIndent]);
    };
}

function completer(line) {
    let hits = completions.filter(function(c) {
        return c.indexOf(line) == 0;
    });

    const arg = {
        line: line,
        hits: hits
    };

    myEmitter.emit("completer", arg);

    hits = arg.hits;
    if (hits.length == 1) {
        return [hits, line];
    } else {
        console.log("\x1B[96mSuggestion :\x1B[00m");
        let list = "",
            l = 0,
            c = "",
            t = hits.length ? hits : completions;
        for (let i = 0; i < t.length; i++) {
            c = t[i].replace(/(\s*)$/g, "")
            if (list != "") {
                list += ", ";
            }
            if (((list + c).length + 4 - l) > process.stdout.columns) {
                list += "\n";
                l = list.length;
            }
            list += c;
        }
        console.log("\x1B[96m" + list + "\x1B[00m");
        return [(line != arg.line) ? [arg.line] : [], line];
    }
}