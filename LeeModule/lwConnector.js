const EventEmitter = require("events"),
    querystring = require("querystring"),
    https = require("https"),
    fs = require("fs");

const LeeKloud = require('./lkClass.js');

const $ = {
    post: post,
    get: get
};

let myCookie = "";

function saveCookie(res) {
    if (res.headers["set-cookie"] && LeeKloud.cookieStorage) {
        const dataCookie = mkdataCookie(res.headers["set-cookie"]);
        LeeKloud.setFileContent(LeeKloud.cookieStorage, JSON.stringify(dataCookie, null, 4));
        myCookie = dataCookieToString(dataCookie);
    }
}

function raw2json(raw) {
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.log(raw);
        console.log("\033[91mERREUR raw2json : Parse data impossible\033[00m");
        console.log(err.stack);
        return process.exit();
    }
}

const LeekWarsAPI = (function() {
    function loadCookie() {
        if (fs.existsSync(LeeKloud.cookieStorage)) {
            const dataCookie = JSON.parse(LeeKloud.getFileContent(LeeKloud.cookieStorage));
            myCookie = dataCookieToString(dataCookie);
            return true;
        }
        return false;
    }

    function useSession() {
        const myEmitter = new EventEmitter();

        /*// >> Ici et non autre part... ^_^"
        const lastLogin = LeeKloud.getFileContent(LeeKloud.files.lastLogin);
        if (!fs.existsSync(LeeKloud.folders.account + lastLogin)) {
        	return credentialsRequired();
        }
        LeeKloud.cookieStorage = LeeKloud.folders.account + lastLogin + "/.data/cookieStorage".replace(/\//g, path.sep);
        // <<*/

        if (loadCookie()) {
            const updater = update();

            updater.on("success", function(json) {
                myEmitter.emit("success", json);
            });

            updater.on("fail", function(json) {
                fs.unlinkSync(LeeKloud.cookieStorage);
                myEmitter.emit("fail", json);
            });

            return myEmitter;
        } else {
            return false; // = Pas de cookie pour toi
        }
    }

    function callback_getFarmerInfo(res, data, context) {
        const myEmitter = context.myEmitter;
        const json = raw2json(data);

        if (json.success) {
            /*// >> Avant et non après... ^_^"
            LeeKloud.cookieStorage = LeeKloud.folders.account + json.farmer.login + "/.data/cookieStorage".replace(/\//g, path.sep);
            saveCookie(res);
            // <<*/
            myEmitter.emit("success", json, function() {
                saveCookie(res);
            });
        } else {
            myEmitter.emit("fail", json);
        }
    }

    // GET farmer/get-from-token/{token}
    function get_from_token() {
        const myEmitter = new EventEmitter();

        $.get({
            url: "/api/farmer/get-from-token/$",
            context: {
                myEmitter: myEmitter
            },
            success: callback_getFarmerInfo
        });

        return myEmitter;
    }

    // POST farmer/login/ {login} {password} {keep_connected}
    function login(login, password, keep_connected) {
        const myEmitter = new EventEmitter();

        $.post({
            url: "/api/farmer/login/",
            data: {
                login: login,
                password: password,
                keep_connected: !!keep_connected
            },
            context: {
                myEmitter: myEmitter
            },
            success: callback_getFarmerInfo
        });

        return myEmitter;
    }

    // POST ai/get/ {ai_id} {token}
    function getIA(ai_id) {
        const myEmitter = new EventEmitter();

        $.post({
            url: "/api/ai/get/",
            data: {
                ai_id: ai_id,
                token: "$"
            },
            context: {
                ai_id: ai_id
            },
            success: function(res, data, context) {
                const json = raw2json(data);

                if (json.success) {
                    myEmitter.emit("success", json, context);
                } else {
                    myEmitter.emit("fail", json, context);
                }
            }
        });

        return myEmitter;
    }

    // POST ai/save/ {ai_id} {code} {token}
    function saveIA(ai_id, code) {
        const myEmitter = new EventEmitter();

        $.post({
            url: "/api/ai/save/",
            data: {
                ai_id: ai_id,
                code: code,
                token: "$"
            },
            context: {
                ai_id: ai_id
            },
            success: function(res, data, context) {
                const json = raw2json(data);

                if (!json.success || !json.result || json.result.length == 0) {
                    myEmitter.emit("fail", jso, context);
                } else {
                    myEmitter.emit("success", json, context);
                }
            }
        });

        return myEmitter;
    }

    // POST /api/message/create-conversation/ {farmer_id} {message} {token}
    function sendMP(conv, msg) {
        const myEmitter = new EventEmitter();
        $.post({
            url: "/api/message/create-conversation/",
            data: {
                farmer_id: conv,
                message: msg,
                token: "$"
            },
            success: function(res, data, context) {
                const json = raw2json(data);

                if (json.success) {
                    myEmitter.emit("success", json);
                } else {
                    myEmitter.emit("fail", json);
                }
            }
        });

        return myEmitter;
    }

    // POST farmer/update/ {token}
    function update() {
        const myEmitter = new EventEmitter();

        $.post({
            url: "/api/farmer/update/",
            data: {
                token: "$"
            },
            success: function(res, data) {
                const json = raw2json(data);

                if (json.success) {
                    myEmitter.emit("success", json);
                } else {
                    myEmitter.emit("fail", json);
                    process.exit();
                }
            }
        });

        return myEmitter;
    }

    function getTranslation() {
        return translation;
    }

    return {
        useSession: useSession,
        get_from_token: get_from_token,
        login: login,
        update: update,
        getIA: getIA,
        saveIA: saveIA,
        getTranslation: getTranslation,
        sendMP: sendMP
    }
})();

module.exports = LeekWarsAPI;

function get(option) {
    option.method = "GET";
    return ajax(option);
}

function post(option) {
    option.method = "POST";
    return ajax(option);
}

function ajax(option) {
    const data = (option.data) ? querystring.stringify(option.data) : "",
        context = (option.context) ? option.context : {};

    const options = {
        host: "leekwars.com",
        port: "443",
        path: option.url,
        method: (option.method == "GET") ? "GET" : "POST",
        headers: {
            "User-Agent": "NodeJS " + LeeKloud.title,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Content-Length": data.length,
            "Cookie": myCookie
        }
    };

    const req = https.request(options, function(res) {
        res.setEncoding("utf8");
        let content = "";

        res.on("data", function(chunk) {
            content += chunk;
        });

        res.on("end", function() {
            LeeKloud.setFileContent(LeeKloud.folders.tempLK + "debug_print_r.js", print_r(res));
            if (option.success) {
                saveCookie(res);
                option.success(res, content, context);
                //option.success(res, LeeKloud.fixASCII(content), context);
            }
        });
    });

    req.on("error", function(e) {
        console.log("\033[91mProblème avec la requête : " + e.message + "\033[00m");
        setTimeout(function() {
            return ajax(option);
        }, 1500);
    });

    req.write(data);
    req.end();
}

function dataCookieToString(dataCookie) {
    let t = "";
    for (let x = 0; x < dataCookie.length; x++) {
        t += ((t != "") ? "; " : "") + dataCookie[x].key + "=" + dataCookie[x].value;
    }
    return t;
}

function mkdataCookie(cookie) {
    let t, j;
    cookie = cookie.toString().replace(/,([^ ])/g, ",[12],$1").split(",[12],");
    for (let x = 0, i; x < cookie.length; x++) {
        cookie[x] = cookie[x].split("; ");
        j = cookie[x][0].split("=");
        t = {
            key: j[0],
            value: j[1]
        };
        if (t.value === "deleted") continue;
        for (i = 1; i < cookie[x].length; i++) {
            j = cookie[x][i].split("=");
            t[j[0]] = j[1];
        }
        cookie[x] = t;
    }

    return cookie;
}

function print_r(obj) {
    let cache = [];
    return JSON.stringify(obj, function(key, value) {
        if (typeof value === "object" && value !== null) {
            if (cache.indexOf(value) !== -1) {
                return;
            }
            cache.push(value);
        }
        return value;
    });
}

function fixASCII(data) { // Problème d'encodage, on vire le caractère 65279.
    while (data.charCodeAt(0) == 65279) {
        data = data.replace(/^./, "");
    }
    return data;
}

const translation = {
    "ai_name_expected": "Le nom d'une IA est attendu ici",
    "ai_not_existing": "L'IA %s n'existe pas",
    "associative_array": "Il s'agit d'un tableau clé:valeur, impossible de déclarer une valeur sans sa clé",
    "break_out_of_loop": "Le mot clé break ne peut être utilisé que dans une boucle",
    "cant_add_instruction_after_break": "Impossible d'ajouter une instruction alors qu'il y a déjà un break, return ou continue dans le bloc actuel.",
    "cant_assign_value": "Impossible d'assigner une valeur à cette expression",
    "closing_parenthesis_expected": "Parenthèse fermante attendue",
    "closing_square_bracket_expected": "Crochet fermant attendu",
    "continue_out_of_loop": "Le mot clé continue ne peut être utilisé que dans une boucle",
    "end_of_instruction_expected": "Une fin d'instruction était attendue ici",
    "end_of_script_unexpected": "Fin du fichier inattendue",
    "function_name_expected": "Un nom de fonction était attendu",
    "function_name_unavailable": "Impossible d'utiliser ce nom de fonction",
    "function_not_exists": "Fonction inexistante",
    "function_only_in_main_block": "Impossible de déclarer une fonction ailleurs que dans le bloc principal",
    "global_only_in_main_block": "Vous ne pouvez déclarer une variable globale que dans le bloc principal",
    "include_only_in_main_block": "Impossible d'include une IA ailleurs que dans le bloc principal",
    "invalid_char": "Caractère invalide",
    "invalid_number": "Nombre invalide",
    "invalid_parameter_count": "Nombre de paramètres incorrect",
    "keyword_unexpected": "Mot-clé inattendu",
    "keywork_in_expected": "Mot-clé in attendu ici",
    "no_bloc_to_close": "Aucun bloc à fermer",
    "no_if_block": "Aucune condition pour ce else",
    "open_bloc_remaining": "Tous les blocs n'ont pas été refermés",
    "opening_curly_bracket_expected": "Accolade ouvrante attendue",
    "opening_parenthesis_expected": "Parenthèse ouvrante attendue",
    "operator_unexpected": "Cet opérateur est inattendu ici",
    "parameter_name_expected": "Un nom de paramètre était attendu",
    "parameter_name_unavailable": "Impossible d'utiliser ce nom de paramètre",
    "parenthesis_expected_after_function": "Une parenthèse ouvrante est attendue après le mot clé function",
    "parenthesis_expected_after_parameters": "Une parenthèse fermante est attendue après les paramètres d'une fonction",
    "simple_array": "Il s'agit d'un tableau à valeur simple, impossible de déclarer une valeur avec sa clé",
    "uncomplete_expression": "L'expression n'est pas complete",
    "unknown_variable_or_function": "Variable ou fonction inconnue",
    "value_expected": "Une valeur était attendue",
    "variable_name_expected": "Un nom de variable était attendu",
    "variable_name_unavailable": "Ce nom de variable est indisponible",
    "variable_not_exists": "Variable inexistante",
    "var_name_expected": "Une chaine de caractères est attendue en nom de variable",
    "var_name_expected_after_global": "Une chaine de caractères est attendue après un mot clé global",
    "while_expected_after_do": "Un while est attendu apres un bloc do"
};
