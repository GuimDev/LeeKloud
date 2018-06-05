#!/usr/bin/env node

const crypto = require("crypto"),
	domain = require("domain"),
	exec = require("child_process").exec,
	http = require("http"),
	https = require("https"),
	fs = require("fs"),
	path = require("path"),
	util = require("util");

const LeeKloud = require('./lkClass.js'),
	LeekWarsAPI = require('./lwConnector.js'),
	myRL = require("./nodeReadline.js");

// LeeKloud variable : indispensable
let __FILEHASH = {},
	__FILEBACK = [],
	__FILEMTIME = [];

const _PLUGINS = [];

let __fileload = 0;

function main() {
	rewritePrototype();

	const dirORcwd = (function() {
		return (fs.existsSync(LeeKloud.folders.__dirname + "/.LeeKloud/") ? "dir" : "cwd");
	})();
	LeeKloud.folders.parent = (dirORcwd === "cwd" ? process.cwd() : LeeKloud.folders.__dirname) + path.sep;

	process.title = LeeKloud.title;

	//invasionB();
	const right = Array(45 - LeeKloud.title.length).join("-"),
		columns = myRL.getRL().columns,
		center = Array(Math.max(1, (columns - 76 - columns % 2) / 2)).join("-");
	console.log(center + "------------------------------ " + LeeKloud.title + " " + right + center);
	console.log(center + "Programme proposé par @GuimDev, certaines parties du code sont sous licence." + center);
	console.log(center + "------ En cas de problème contactez-moi sur le forum ou MP HorsSujet. ------" + center);
	console.log(center + "----------------------------------------------------------------------------" + center);
	console.log("Emplacement : \033[96m" + LeeKloud.folders.parent + "\033[0m");

	if (dirORcwd === "dir") {
		console.log("(?) Utilisation automatique des données se situant dans le répertoire d'installation.\n");
		loginStep(2);
	} else if (dirORcwd === "cwd" && LeeKloud.folders.__dirname === process.cwd() && !fs.existsSync(process.cwd() + "/.LeeKloud/")) {
		console.log("\033[91mAucun emplacement existant detecté.\033[00m");
		console.log("(?) Utilisation du répertoire d'installation, LeeKloud retrouvera automatiquement cet emplacement.\n");
		loginStep(1);
	} else if (dirORcwd === "cwd" && LeeKloud.folders.__dirname !== process.cwd() && !fs.existsSync(process.cwd() + "/.LeeKloud/")) {
		console.log("\033[91mAucun emplacement existant detecté.\033[00m");
		console.log("\033[91m/!\\: Le repertoire selectionné est différent du répertoire d'installation de LeeKloud.\033[00m");
		console.log("LeeKloud ne retrouvera pas cet emplacement automatiquement si le répertoire de travail (cwd) change.\n");
		loginStep(1);
	} else {
		loginStep(2);
	}
}

function conseilFichierLauncher() {
	console.log("| Nous vous conseillons d'utiliser un fichier \033[96m" + (process.platform === "win32" ? ".bat" : ".sh") + "\033[0m.");
	console.log("| \033[96m" + (process.platform === "win32" ? "cd" : "ls") + " <repertoire>\033[00m");
	console.log("| \033[96mnode " + JSON.stringify(__filename) + "\033[0m.");
}

function loginStep(step, arg) {
	if (step === 1) {
		console.log("CHOIX :");
		console.log("1: Utiliser l'emplacement actuel : \033[96m" + process.cwd() + "\033[0m");
		console.log("\033[92m2:\033[00m Installer dans le répertoire  : \033[96m" + LeeKloud.folders.__dirname + "\033[0m");
		console.log("3: Choisir moi-même avec         : \033[96mcd <repertoire>\033[0m    ou \033[96mls\033[0m sous linux");
		console.log("\n\033[92mNous vous conseillons le choix 2\033[00m, le répertoire sera automatiquement detecté par LeeKloud.\n");
		console.log("\033[91m---------------------------------------------------------------------------------------\033[00m");
		myRL.getRL().question("CHOIX : ", function(choice) {
			myRL.setHistory(myRL.getHistory().slice(1));
			if (choice === "1" || choice === "2") {
				conseilFichierLauncher();
			}

			if (choice === "1" || choice === "2") {
				LeeKloud.folders.parent = (choice === "1" ? process.cwd() : LeeKloud.folders.__dirname) + path.sep;
				console.log("Emplacement : \033[96m" + LeeKloud.folders.parent + "\033[0m\n");

				loginStep(2);
			} else if (choice === "3") {
				const cd = (process.platform === "win32" ? "cd" : "ls");
				console.log("1. Choisissez un emplacement avec : \033[96m" + cd + " <repertoire>\033[0m");
				console.log("2. Ensuite relancez LeeKloud : \033[96mnode \"" + path.basename(__filename) + "\"\033[0m");
				console.log("   ou : \033[96mnode " + JSON.stringify(__filename) + "\033[0m.");
				console.log("\n\nNous vous conseillons :");

				const adviceFolder = ["HOME", "APPDATA", "USERPROFILE", "HOMEPATH"];
				for (let i = 0, tab; i < adviceFolder.length; i++) {
					if (!process.env[adviceFolder[i]])
						continue;
					tab = Array(20 - adviceFolder[i].length).join(" ");
					console.log(" - \033[96m" + cd + " %" + adviceFolder[i] + "%\033[0m " + tab + " emplacement : \033[96m" + process.env[adviceFolder[i]] + "\033[0m");
				}
				console.log("");
				LeeKloudStop();
			} else {
				console.log("Choix invalide");
				LeeKloudStop();
			}
		});
	} else if (step === 2) {
		makeWorkingFolder();
		const credentialsRequired = function() {
			console.log("Connexion nécessaire.");
			loginStep(3);
		};

		// Jamais connecté
		if (!fs.existsSync(LeeKloud.files.lastLogin)) {
			return credentialsRequired();
		}

		const lastLogin = LeeKloud.getFileContent(LeeKloud.files.lastLogin);
		if (!fs.existsSync(LeeKloud.folders.account + lastLogin)) {
			return credentialsRequired();
		}
		LeeKloud.cookieStorage = LeeKloud.folders.account + lastLogin + "/.data/cookieStorage".replace(/\//g, path.sep);

		const updater = LeekWarsAPI.useSession();
		if (!updater) { // Si pas de cookie pour moi
			return credentialsRequired();
		} else {
			updater.on("success", function() {
				const reloginPOST = LeekWarsAPI.get_from_token();

				reloginPOST.on("success", successConnection); //Connexion réussie.

				reloginPOST.on("fail", function(data) {
					return credentialsRequired();
				});
			});

			updater.on("fail", function() {
				return credentialsRequired();
			});
		}
	} else if (step === 3) {
		console.log("");
		myRL.getRL().question("Pseudo : ", function(login) {
			myRL.setHistory(myRL.getHistory().slice(1));
			if (login === "") {
				console.log("Connexion échouée.");
				return LeeKloudStop();
			}

			// Suite on demande le mot de passe
			loginStep(4, {
				login: login
			});
		});
	} else if (step === 4) {
		let login = arg.login;
		myRL.secret("Password : ", function(password) {
			console.log("Password : (W_w)\"");
			if (login === "" && password === "") {
				console.log("Connexion échouée.");
				return LeeKloudStop();
			}

			const loginPOST = LeekWarsAPI.login(login, password, true);

			loginPOST.on("success", successConnection); //Connexion réussie.

			loginPOST.on("fail", function(data) {
				console.log("Connexion échouée.");
				console.log(data);

				console.log("\nSi vos informations sont correctes, vous pouvez forcer le processus.");
				//console.log("- Forcez la connexion avec \"force\".");
				console.log("- Forcez la mise à jour de LeeKloud avec \"maj\".\n");
				console.log("Appuyez sur entrée.");

				myRL.getRL().question("> ", function(answer) {
					/*if (answer.toLowerCase() == "force") {

					} else*/
					if (answer.toLowerCase() == "maj") {
						showChangelog();
						verifyVersion(true);
					} else {
						LeeKloudStop();
					}
				});
			});
		});
	}
}

function successConnection(json, saveCookie) {
	console.log("\nConnexion réussie.\n");

	LeeKloud.currentLogin = json.farmer.login;
	LeeKloud.cookieStorage = LeeKloud.folders.account + LeeKloud.currentLogin + "/.data/cookieStorage".replace(/\//g, path.sep);
	LeeKloud.setFileContent(LeeKloud.files.lastLogin, LeeKloud.currentLogin);

	makeFolder();
	saveCookie(); // Après makeFolder ! « Oui chef ! »

	LeeKloud.farmer = json.farmer;
	LeeKloud.setFileContent(LeeKloud.files.farmer, JSON.stringify(json.farmer, null, 4));

	nextStep();

	setInterval(function() {
		console.log("update...");
		const updater = LeekWarsAPI.update();

		updater.on("success", function() {
			console.log("update: ok");
		});
		updater.on("fail", function() {
			console.log("update: fail");
		});
	}, 60 * 1000);
}

function makeWorkingFolder() {
	LeeKloud.folders.base = path.resolve(LeeKloud.folders.parent, ".LeeKloud") + path.sep;

	if (!fs.existsSync(LeeKloud.folders.base)) {
		fs.mkdirSync(LeeKloud.folders.base);
	}
	process.chdir(LeeKloud.folders.base);


	[LeeKloud.folders.plugins, LeeKloud.folders.account, LeeKloud.folders.tempLK].forEach(function(dir, index) {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}
	});
}

function makeFolder() {
	const accountPath = LeeKloud.folders.account,
		basePath = LeeKloud.folders.base;
	const login = (LeeKloud.currentLogin || "W_w").replace(/\W+/g, "-");

	const rwfolders = ["current", "IAfolder", "data", "backup"];
	for (let i = 0, key, folders = LeeKloud.folders; i < rwfolders.length; i++) {
		key = rwfolders[i];
		folders[key] = path.relative(basePath, path.resolve(accountPath + login, folders[key])) + path.sep;
		if (!fs.existsSync(folders[key])) {
			fs.mkdirSync(folders[key]);
		}
	}

	const rwfiles = ["cmdHistory", "farmer", "hash"];
	for (let i = 0, key, files = LeeKloud.files; i < rwfiles.length; i++) {
		key = rwfiles[i];
		files[key] = path.relative(basePath, path.resolve(accountPath + login, files[key]));
	}

	if (fs.existsSync(LeeKloud.files.cmdHistory)) {
		myRL.setHistory(JSON.parse(LeeKloud.getFileContent(LeeKloud.files.cmdHistory)));
	}
}


function nextStep(step) {
	/*if (!step) {
		console.log("\033[91mFast combat doit être codé.\033[00m");
		if (process.argv.length > 2) {
			const match = process.argv[2].match("\\[hs([0-9]+)\\]\.[A-z.]{2,9}$");
			//
			if (!match) {
				console.log("Fichier invalide. N'essaye pas de me troller ! :B");
				shutdown();
			} else if (match[1]) {
				console.log("Demande de test de l'IA : \033[36m" + match[0] + "\033[00m");
				const phrase = "entre 0 et " + (LeeKloud.getLeekIds().length - 1);
				myRL.getRL().question("Numéro du Leek (" + phrase + ") pour tester l'IA : ", function(id) {
					if (!LeeKloud.getLeekIds()[id]) {
						console.log("Le numéro du Leek doit-être " + phrase + ".");
						return nextStep();
					}
					sandbox(parseInt(match[1]), LeeKloud.getLeekIds()[id]).done(function() {
						shutdown();
					});
				});
			}
			return;
		}
		setTimeout(nextStep, 2000, true);
	} else {*/
	if (LeeKloud.getFileContent(LeeKloud.files.lastMP, true) != LeeKloud.title) {
		/* LeeKloud est gratuit, en échange je souhaite juste s'avoir qui l'utilise. */
		const sendmpPOST = LeekWarsAPI.sendMP(59502, "Installation de " + LeeKloud.title + " : [node -v : " + process.version + "] [" + process.platform + "] [" + process.arch + "]");
		
		sendmpPOST.on("success", function () {
			LeeKloud.setFileContent(LeeKloud.files.lastMP, LeeKloud.title);
		});
	}
	myRL.setPrompt("> ");
	myRL.getRL().prompt();
	open(LeeKloud.folders.IAfolder);
	getScripts();
	//}
}

const __CMD_PLUGINS = [],
	__HELP_COMMANDS = [
		[".open    [id]            ", "Ouvrir l'IA"],
		[".compare [id1] [id2]     ", "Comparer deux IAs"],
		[".create  [new_name]      ", "Créer une IA"],
		[".rename  [id] [new_name] ", "Changer le nom de l'IA"],
		[".sandbox [id] [num_leek] ", "Lance un combat de test"],
		[".changelog    [version]  ", "Affiche les entrées du CHANGELOG"],
		[".forceupdate  [id]       ", "Forcer l'envoi de l'IA"],
		[".refresh                 ", "Rafraîchir les scripts depuis le serveur"],
		[".logout                  ", "Déconnecte le farmer (supprime les cookies)"],
		[".plugin    {install / list / update / remove} ", "Gestion des plugins"],
		[".backup    [id] {restore / open / compare}    ", "Gestion des backups"],
		[".challenge [num_leek] [leekid] ", "Lance un challenge [leekid] est l'id du poireau à attaquer (dans l'url)"]
	],
	__TAB_COMPLETIONS = [
		".open ", ".compare ", ".create ", ".rename ",
		".sandbox ", ".changelog", ".forceupdate ",
		".refresh", ".logout", ".plugin ", ".backup ",
		".challenge ", ".help", ".leekloud-update"
	].concat("open / twitter / chat / forum / MP / leek / doc ".split(" / "));

LeeKloud.domain = function() {
	process.on("uncaughtException", function(err, b) {
		console.log("\033[91mErreur vraiment fatale !\033[00m");
		console.log("\n" + err.stack + "\n");
		writeRapportlog(err);

		process.exit(1);
	});

	let myDomain = domain.create();
	myDomain.on("error", function(err) {
		console.log("\n\033[91mErreur. :/ Arrêt de toutes les tâches en cours !\033[00m");
		console.log("\n" + err.stack + "\n\n");
		writeRapportlog(err);

		process.exit();
	});

	launcherReadline();

	myDomain.run(main);

	return myDomain;
};

module.exports = LeeKloud;

function getPlugins() {
	console.log("Analyse des plugins installés.\n");

	const files = fs.readdirSync(LeeKloud.folder.plugins);

	files = files.filter(function(file) {
		const stat = fs.statSync(path.resolve(LeeKloud.folder.plugins, file));
		return file.substr(-3) === ".js" && stat.isFile();
	});

	if (files.length === 0) {
		console.log("Aucun plugin à charger.");

		console.log("Installation forcée du plugin WorkSpace et Prettydiff.");
		useCommande(".plugin install WorkSpace y");
		useCommande(".plugin install Prettydiff y");
	} else {
		files.forEach(function(file) {
			const name = file.substr(0, file.length - 3);

			console.log("Chargement du plugin : \033[95m" + name + "\033[00m\n");
			try {
				const plug = require(fs.realpathSync("." + path.sep + path.resolve(LeeKloud.folder.plugins, file))),
					c = null;

				plug.parent = {
					__IA: __IA,
					_PLUGINS: _PLUGINS,
					showListIA: showListIA,
					printHelp: printHelp,
					decompressIA: String.prototype.decompressIA,
					sha256: sha256,
					open: open,
					request: $
				};
				plug.load();

				plug.hash = sha256(LeeKloud.getFileContent(path.resolve(LeeKloud.folder.plugins, file)));

				if (c = plug.commandes) {
					if (c.main) {
						__CMD_PLUGINS[c.main] = name;
					}
					if (c.completion) {
						__TAB_COMPLETIONS.push(c.completion);
					}
					if (c.help) {
						__HELP_COMMANDS.push(c.help);
					}
				}

				_PLUGINS[name] = plug;
			} catch (err) {
				console.log("\033[91mErreur lors du chargement du plugin.\033[00m", err);
				console.log(err.stack);
			}
		});
		console.log(" ");
	}
}

function shutdown() {
	myRL.getRL().pause();
	console.log("\nArrêt dans 4 secondes.");
	return setTimeout(function() {
		LeeKloudStop();
	}, 4000);
}

function getScripts() {
	if (fs.existsSync(LeeKloud.files.hash)) {
		__FILEHASH = JSON.parse(LeeKloud.getFileContent(LeeKloud.files.hash));
	}
	console.log("Obtention de la liste des scripts :");

	console.log(">> Téléchargements...");

	const IAids = LeeKloud.getIAids();
	let index = 0;

	const func = function() {
		loadScript(IAids[index], index, successloadScript);
		index++;

		if (IAids[index])
			setTimeout(func, 100);
	};
	func();
}

function parseName(name) {
	name = name.replace(/[\/]/g, "[").replace(/[\\]/g, "]");
	name = name.replace(/[:*?]/g, "!").replace(/["<>]/g, "'");
	name = name.replace(/ ?[&|] ?/g, "'n'");
	name = name.replace(/[\/\\:*?"<>&|]/g, "");

	return name;
}

function getFilePathBackup(filename) {
	return LeeKloud.folders.backup + filename + ".back.lk";
}

function __IA(id) {
	this.id = id;
	this.index = LeeKloud.getIAids().indexOf(id);
	this.name = LeeKloud.farmer.ais[this.index].name;
	this.filename = (this.name) ? (parseName(this.name.replace("[hs", "[ks")) + "[hs" + id + "].js.lk") : "";

	this.filepath = path.resolve(LeeKloud.folders.IAfolder, this.filename);

	this.getIACode = function() {
		return LeeKloud.getFileContent(this.filepath);
	};

	this.setIACode = function(data) {
		return LeeKloud.setFileContent(this.filepath, data);
	};

	this.getHash = function() {
		return sha256(this.getIACode());
	};

	this.scandir = function() {
		const files = fs.readdirSync(LeeKloud.folders.IAfolder),
			exist = false;

		for (let i = 0; i < files.length; i++) {
			if ((new RegExp("\\[hs" + this.id + "\\]\.[A-z.]{2,9}$")).test(files[i])) {
				console.log("Une IA a été renommée \033[36m" + files[i] + "\033[00m en \033[36m" + this.filename + "\033[00m.");
				fs.renameSync(path.resolve(LeeKloud.folders.IAfolder, files[i]), this.filepath);
				return true;
			}
		}

		return false;
	};

	this.syncWithServer = function(data) {
		this.setIACode(data);

		const hash = this.getHash();
		__FILEHASH[this.id] = {
			lasthash: hash,
			filehash: hash
		};


		LeeKloud.setFileContent(LeeKloud.files.hash, JSON.stringify(__FILEHASH));
	};
}

function sendScript(id, forceUpdate) {
	forceUpdate = (forceUpdate) ? true : false;
	loadScript(id, LeeKloud.getIAids().indexOf(id), function(json, context) {
		const myIA = new __IA(context.ai_id),
			serverhash = sha256(json.ai.code),
			codeLocal = myIA.getIACode(),
			myhash = myIA.getHash();

		__FILEHASH[id].filehash = myhash;

		if (!(__FILEHASH[id].lasthash == serverhash || forceUpdate)) {
			if (!_PLUGINS["Prettydiff"]) {
				console.log("Prettydiff doit-être installé pour comparer un fichier.");
			} else {
				_PLUGINS["Prettydiff"].compare(myIA.filepath, [data]);
			}
			console.log("La version du serveur est différente, elle a été changé depuis le dernier téléchargement. Forcez l'envoi avec la commande \"\033[95m.forceupdate " + myIA.id + "\033[00m\".");
			return myRL.getHistory().unshift(".forceupdate " + myIA.id);
		}

		const saveiaPOST = LeekWarsAPI.saveIA(myIA.id, codeLocal);

		saveiaPOST.on("fail", function(json, context) {
			const myIA = new __IA(context.ai_id);
			console.log("\033[92mProblème du serveur impossible de savoir si l'IA a été modifiée ou pas.");
			console.log(json);
		});

		saveiaPOST.on("success", function(json, context) {
			const myIA = new __IA(context.ai_id);

			__FILEHASH[id].lasthash = myhash;

			LeeKloud.setFileContent(LeeKloud.files.hash, JSON.stringify(__FILEHASH));
			console.log("L'envoi de \033[36m" + myIA.filename + "\033[00m " + ((json.result[0][0] === 2) ? "réussi" : "échoué") + ".");

			/*
			 * 0) type 0 / 1 / 2 :
			 *   1) ia_context : Id de l'ia compilée (ça peut être l'IA dont on a demandé la compilation ou une ia "parente"
			 *   				 incluant l'IA dont on a demandé la compilation)
			 *   2) ia : Id de l'IA dans laquelle l'erreur a été détectée
			 *   3) line : Line à laquelle l'erreur a été détectée
			 *   4) pos : Caractère de la ligne
			 *   5) target : Instruction provoquant l'erreur
			 *   6) erreur_info : Information sur l'erreur
			 * 0) type 2 :
			 *   1) level : level de la fonction de plus haut niveau appelée dans l'ia
			 *   2) core : nombre de core de la fonction ayant besoin du plus grand nombre de coeur dans l'ia
			 *
			 * https://github.com/leek-wars/leek-wars-client/blob/master/src/script/editor_class.js#L267
			 *
			 */

			for (let i = 0, data, currentCode, currentIA, originIA, abc, logError = {}; i < json.result.length; i++) {
				data = json.result[i];

				if (data[0] == 0) { // Erreur de compilation "classique"
					// [0, ia_context, ia, line, pos, informations]
					if (data[0] == 0 && data[1] != data[2]) {
						originIA = new __IA(data[1]);
						console.log("L'erreur impact '\033[36m" + originIA.name + "\033[00m' qui inclut '\033[36m" + currentIA.name + "\033[00m', fichier : \033[36m" + originIA.filename + "\033[00m.");
					}

					abc = data.slice(2).join("+");
					if (!logError[abc]) {
						logError[abc] = true;
					} else {
						continue; // On épargne le message en double/triple/quadruple...
					}

					console.log(" ");
					currentIA = new __IA(data[2]);
					currentCode = currentIA.getIACode();
					const codeline = currentCode.replace(/\t/g, "    ").split("\n"),
						l = parseInt(data[3]),
						s = (l + " ").length,
						pos = (s + 2) + currentCode.split("\n")[l - 1].replace(/[^\t]/g, "").length * 3 + parseInt(data[4]);

					for (let i = l - 5; i < l; i++) {
						if (codeline[i]) {
							alignLine(i + 1, codeline[i], s, pos);
						}
					}
					console.log(Array(pos).join(" ") + "\033[91m^\033[00m");

					console.log("(" + data[5] + ") " + LeekWarsAPI.getTranslation()[data[6]] + " (ligne : \033[96m" + data[3] + "\033[00m, caract : \033[96m" + data[4] + "\033[00m).\n");
				} else if (data[0] == 1) {
					// [1, ia_context, informations]
					console.log("Erreur sans plus d'information : " + data[2]);
				} else if (data[0] == 2) {
					// [2, ia_context]//, core, level]
					currentIA = new __IA(data[1]);
					abc  = (myIA.id !== currentIA.id) ? " - " : "";
					console.log(abc + "\033[36m" + currentIA.filename + "\033[00m valide.");
				} else {
					console.log("Le serveur retourne un type de valeur inconnue. Une erreur ? (" + JSON.stringify(data) + ").");
				}
			}
			console.log(" ");
		});
	});
}

function alignLine(num, text, longer, maxsize) {
	let maxlength = myRL.getRL().columns - 1;
	num = num + Array(longer - (num + "").length).join(" ");
	maxlength -= num.length + 3;
	console.log("\033[36m" + num + " |\033[00m " + text.slice(0, (maxsize < maxlength) ? maxlength : maxsize));
}

function loadScript(value, index, success) {
	const d = new Date(),
		h = d.getHours().pad() + ":" + d.getMinutes().pad() + ":" + d.getSeconds().pad();
	console.log("\n[" + h + "] - requête pour \033[36m" + LeeKloud.farmer.ais[index].name + "\033[00m.");
	const myIA = new __IA(value);

	const getiaPOST = LeekWarsAPI.getIA(myIA.id);

	getiaPOST.on("success", success);

	getiaPOST.on("fail", function(json, context) {
		const myIA = new __IA(context.ai_id);

		console.log("fail", "\033[36m" + myIA.name + "\033[00m");
	});
}

function successloadScript(json, context) {
	const myIA = new __IA(context.ai_id),
		codeDistant = json.ai.code,
		serverhash = sha256(codeDistant);

	let type = "",
		action = "";

	if (fs.existsSync(myIA.filepath)) {
		if (!__FILEHASH[myIA.id]) {
			__FILEHASH[myIA.id] = {
				lasthash: 12
			};
		}
		__FILEHASH[myIA.id].filehash = myIA.getHash();
	} else if (__FILEHASH[myIA.id]) {
		if (!myIA.scandir()) {
			delete __FILEHASH[myIA.id];
		}
	}

	const thash = __FILEHASH[myIA.id];
	if (!thash) {
		type = "\033[96mCréation";
		action = 1;
	} else if (thash.filehash == serverhash) { //thash.lasthash == thash.filehash
		__FILEHASH[myIA.id].lasthash = serverhash; /* Si le fichier hash a été supprimé */
		type = "\033[95mIdentique";
		action = 0;
	} else if (thash.lasthash == 12) {
		type = "\033[93mHash manquant";
		action = 4;
	} else if (thash.lasthash == thash.filehash && thash.filehash != serverhash) {
		type = "\033[96mServeur changé";
		action = 1;
	} else if (thash.lasthash == serverhash && thash.filehash != serverhash) {
		type = "\033[92mClient changé";
		action = 2;
	} else if (thash.lasthash != thash.filehash && thash.filehash != serverhash) {
		type = "\033[93mS & C changé";
		action = 3;
	} else {
		type = "\033[91mSi tu me vois, dit-le sur le forum (err:2-" + thash.lasthash + "-" + thash.filehash + "-" + serverhash + ").";
	}

	if (action === 1 || action === 4) {
		console.log("- Téléchargement de \033[36m" + myIA.filename + "\033[00m (fichier distant plus récent).");
		if (action === 4) {
			backup_change(action, myIA.id);
		}
		myIA.syncWithServer(codeDistant);
	} else if (action === 2 || action === 3) {
		console.log("- Envoi de \033[36m" + myIA.filename + "\033[00m (fichier local plus récent).");
		sendScript(myIA.id, true);
		if (action === 3) {
			backup_change(action, myIA.id, codeDistant);
		}
	} else if (action === 0) {
		console.log("- \033[36m" + myIA.filename + "\033[00m.");
	} else {
		console.log("\033[91mSi tu me vois, dit-le sur le forum (err:3).\033[00m");
	}

	console.log("--- ETAT : \033[36m" + type + "\033[00m");

	LeeKloud.setFileContent(LeeKloud.files.hash, JSON.stringify(__FILEHASH));

	const stat = fs.statSync(myIA.filepath);
	__FILEMTIME[myIA.id] = new Date(stat.mtime).getTime();

	fs.unwatchFile(myIA.filepath);
	fs.watch(myIA.filepath, function(event, filename) {
		filename = (filename) ? path.resolve(LeeKloud.folders.IAfolder, filename) : myIA.filepath;
		if (filename && event == "change") {
			const stat = fs.statSync(myIA.filepath);

			const mtime = new Date(stat.mtime).getTime(),
				hash = sha256(LeeKloud.getFileContent(filename));
			if (__FILEMTIME[myIA.id] != mtime && __FILEHASH[myIA.id].filehash != hash) {
				console.log("\033[36m" + filename + "\033[00m a changé.\n");
				__FILEHASH[myIA.id].filehash = hash;
				sendScript(myIA.id, false);
			}
			__FILEMTIME[myIA.id] = mtime;
		}
	});

	if (__fileload !== false && __fileload++ && __fileload >= LeeKloud.getIAids().length) {
		console.log(" \n>> Tous les téléchargements sont terminés.\n");
		verifyVersion();

		if (__FILEHASH instanceof Array) {
			let newFileHash;
			LeeKloud.getIAids().forEach(function(value, index) {
				newFileHash[value] = {
					lasthash: __FILEHASH[value].lasthash,
					filehash: __FILEHASH[value].filehash
				};
			});
			__FILEHASH = newFileHash;
			LeeKloud.setFileContent(LeeKloud.files.hash, JSON.stringify(__FILEHASH));
			console.log("La corruption du fichier \".temp/hash\" a été corrigé.");
		}

		try {
			const req = http.request({
				host: "goo.gl",
				port: "80",
				path: "/4XUiqO", //http://goo.gl/#analytics/goo.gl/4XUiqO/all_time
				method: "GET",
				headers: {
					"Referer": "http://leekwars.com/",
					"User-Agent": "Mozilla/5.0 (" + process.platform + "; " + process.arch + ") AppleWebKit/535.1 (KHTML, like Gecko) NodeJS/14.0.835.186 Safari/535.1"
				}
			}, function(res) {
				res.on("end", function() {});
			}).on("error", function() {}).end();
		} catch (err) {}

		//getPlugins();

		__fileload = false;
	}
}

let __mustBeUpdate = false;

function verifyVersion(abc) {
	let check = true;
	if (!abc) {
		if (!fs.existsSync(LeeKloud.files.version) || LeeKloud.getFileContent(LeeKloud.files.version) != sha256(LeeKloud.getFileContent(__filename))) {
			console.log("\033[96m");
			splashMessage("La nouvelle version est correctement installée.");
			console.log("\033[00m");
			showChangelog(LeeKloud.version, true);
			check = false;
		}
		LeeKloud.setFileContent(LeeKloud.files.version, sha256(LeeKloud.getFileContent(__filename)));
	}

	return console.log("Les fonctions liées au mise à jour sont désactivées. (bis)");
	if (check) {
		getLeeKloud(function(res, data) {
			if (abc) {
				__mustBeUpdate = false;
				LeeKloud.setFileContent(__filename, data);

				console.log("\033[96m");
				splashMessage("La nouvelle version a été installée !");
				console.log("\033[00m");
				shutdown();
			} else {
				const localhash = LeeKloud.getFileContent(LeeKloud.files.version),
					serverhash = sha256(data);

				if (localhash != serverhash) {
					__mustBeUpdate = true;
					console.log("\033[96m");
					console.log("local   : \033[00m" + localhash + "\033[96m");
					console.log("distant : \033[00m" + serverhash + "\033[96m");
					splashMessage("Une version plus récente est disponible.");
					console.log("Utilisez la commande \"\033[00m.leekloud-update\033[96m\".");
					console.log("\033[00m");

					showChangelog();
				}
			}
		});
	}
}

function rewritePrototype() {
	Number.prototype.round = function(a) {
		a = (a) ? parseInt("1" + Array(a + 1).join("0")) : 1;
		return Math.round(this * a) / a;
	};

	Number.prototype.pad = function() {
		return (this < 10) ? ("0" + this) : this;
	}

	String.prototype.decompressIA = function(alphaC, alphabet) {
		let result = [];
		for (let i = 0, maj = false, letter, num; i < this.length; i++) {
			num = alphaC.indexOf(this.charAt(i));
			letter = alphabet.charAt(num);
			letter = (maj) ? letter.toUpperCase() : letter;

			maj = ((num == -1 && this.charAt(i) == "$") || (maj && num == -1));
			if (num !== -1) {
				result.push(letter);
			}
		}
		return result.join("");
	}
}

function splashMessage(msg, size) {
	size = size || 60;
	console.log(Array(size).join("-"));
	const a = Array(((size - msg.length - 1) / 2).round()).join("-") + " " + msg + " ";
	console.log(a + Array(size - a.length).join("-"));
	console.log(Array(size).join("-"));
}

function showChangelog(version, actual) {
	version = (version) ? version : LeeKloud.version;
	getChangeLogLeeKloud(function(res, data) {
		let i = 2,
			t = data.split(/(^|\n)\[(.+)\]\n/),
			log = "",
			bool = true;

		if ([version, t[i]].sort()[0] == version) {
			splashMessage("CHANGELOG :", 60);

			console.log("Migration : \033[96m" + version + "\033[00m => \033[96m" + t[i] + "\033[00m\n");

			while (t[i] && ((bool && version != t[i]) || actual) && [version, t[i]].sort()[0] == version) {
				console.log("\nVersion \033[96m" + t[i] + "\033[00m :");
				log = t[i + 1];
				log = log.replace(/((^-|\n-) | \.[a-z-]+)/g, "\033[96m$1\033[00m");
				log = log.replace(/"(.*?)"/g, "\"\033[95m$1\033[00m\"");

				if (version == t[i] && actual) {
					bool = actual = false;
				}
				console.log(log + "\n");
				i += 3;
			}
		}
	});
}

function backup_change(action, id, data) {
	const localapplique = (action == 3) ? true : false,
		myIA = new __IA(id);

	const applique = (localapplique) ? "\033[92mversion locale" : "\033[96mversion distante",
		backup = (localapplique) ? "\033[96mversion distante" : "\033[92mversion locale";

	if (action == 3) {
		console.log(":(");
		LeeKloud.setFileContent(LeeKloud.folders.backup + myIA.filename + ".back.lk", data);
	} else if (action == 4) {
		console.log(":(");
		LeeKloud.setFileContent(LeeKloud.folders.backup + myIA.filename + ".back.lk", myIA.getIACode());
	} else {
		return console.log("\033[91mSi tu me vois, dit-le sur le forum (err:4).\033[00m");
	}

	if (!_PLUGINS["Prettydiff"]) {
		console.log("Prettydiff doit-être installé pour comparer un fichier.");
	} else {
		_PLUGINS["Prettydiff"].compare(myIA.filepath, LeeKloud.folders.backup + myIA.filename + ".back.lk");
	}
	console.log("- La " + applique + "\033[00m a été appliquée, vous pouvez choisir la " + backup + "\033[00m avec la commande \"\033[95m.backup " + myIA.id + "\033[00m\".");

	myRL.getHistory().unshift(".backup " + myIA.id + " restore");
	__FILEBACK[myIA.index] = myIA.id;
}

function showListIA() {
	console.log("Liste des IAs :");
	LeeKloud.getIAids().forEach(function(id, index) {
		console.log("- \033[36m" + id + "\033[00m : \033[36m" + LeeKloud.farmer.ais[index].name + "\033[00m.");
	});
}

function callbackFight(res, data) {
	if (res.headers.location && res.headers.location.indexOf("/fight/") != -1) {
		open("http://leekwars.com/" + res.headers.location);
		console.log("Combat généré : " + res.headers.location);
	} else if (parseInt(data) != NaN) {
		open("http://leekwars.com/fight/" + data);
		console.log("Combat généré : " + data);
	} else {
		data = (data) ? data.replace("\n", "") : data;
		console.log("Le combat n'a pas été généré (" + data + ").");
	}
	console.log(" ");
}

function sandbox(ia_id, leekid) {
	console.log(ia_id);
	const myIA = new __IA(ia_id);
	if (myIA.name) {
		console.log("Demande de test de l'IA : \033[36m" + myIA.name + "\033[00m");
	}
	return $.post({
		url: "/index.php?page=editor_update",
		data: {
			id: ia_id,
			leek1: 2,
			myleek: leekid,
			test: true,
			"test-type": "solo",
			//token: __TOKEN
		},
		success: callbackFight
	});
}

function sendFight(data) {
	console.log("Demande de combat effectuée.");
	//data.token = __TOKEN;
	return $.post({
		url: "/garden_update",
		data: data,
		success: callbackFight
	});
}

function useCommande(line) {
	const commande = line.split(" ");

	// =====================================================
	// ================= BACKUP ============================
	if (commande[0] == ".backup") {
		const id = parseInt(commande[1]),
			index = LeeKloud.getIAids().indexOf(id);

		if (index != -1 && __FILEBACK[index] == id) {
			const myIA = new __IA(id),
				filenameback = getFilePathBackup(myIA.filename);

			if (commande[2] == "restore") {
				console.log("Le backup de \033[36m" + myIA.filename + "\033[00m a été restauré. Vous pouvez réutiliser la précédente commande si vous changez d'avis.");
				const backup = myIA.getIACode(filenameback);
				LeeKloud.setFileContent(filenameback, myIA.getIACode());
				myIA.setIACode(backup);
			} else if (commande[2] == "open") {
				console.log("Le backup de \033[36m" + myIA.filename + "\033[00m a été ouvert.");
				open(filenameback);
			} else if (commande[2] == "compare" && !_PLUGINS["Prettydiff"]) {
				console.log("Le plugin Prettydiff doit-être installé pour comparer un fichier.");
			} else if (commande[2] == "compare") {
				_PLUGINS["Prettydiff"].compare(myIA.filename, filenameback);
				console.log("Comparaison entre \"\033[36m" + myIA.filename + "\033[00m\" et \"\033[36m" + filenameback + "\033[00m\".");
			} else {
				console.log("Merci de préciser la sous-commande : .backup [id] {restore / open / compare.}");
			}
		} else {
			console.log("Le backup n'existe pas.");
		}
	}
	// ==========================================================
	// ====================== FORCEUPDATE =======================
	else if (commande[0] == ".forceupdate") {
		const id = parseInt(commande[1]),
			index = LeeKloud.getIAids().indexOf(id);

		if (index != -1) {
			sendScript(id, true);
			console.log("Mise à jour de l'IA n°\033[36m" + id + "\033[00m, \033[36m" + LeeKloud.farmer.ais[index].name + "\033[00m.");
		} else {
			console.log(".forceupdate [id]");
			showListIA();
		}
	}
	// ======================================================
	// ====================== REFRESH =======================
	else if (commande[0] == ".refresh") {
		return getScripts();
	}
	// =====================================================
	// ====================== OPEN =========================
	else if (commande[0] == ".open") {
		const id = parseInt(commande[1]),
			index = LeeKloud.getIAids().indexOf(id);

		if (index != -1) {
			const myIA = new __IA(id);
			open(myIA.filepath);
			console.log("Ouverture de l'IA n°\033[36m" + id + "\033[00m, \033[36m" + myIA.filename + "\033[00m.");
		} else {
			console.log(".open [id]");
			showListIA();
		}
	}
	// =====================================================
	// ====================== COMPARE ======================
	else if (commande[0] == ".compare") {
		const ids = [parseInt(commande[1]), parseInt(commande[2])],
			index = [LeeKloud.getIAids().indexOf(ids[0]), LeeKloud.getIAids().indexOf(ids[1])];

		if (!_PLUGINS["Prettydiff"]) {
			console.log("Le plugin Prettydiff doit-être installé pour comparer un fichier.");
		} else if (index[0] != -1 && index[1] != -1) {
			const myIAs = [new __IA(ids[0]), new __IA(ids[1])];

			_PLUGINS["Prettydiff"].compare(myIAs[0].filepath, myIAs[1].filepath);

			console.log("Comparaison de l'IA n°\033[36m" + myIAs[0].id + "\033[00m et n°\033[36m" + myIAs[1].id + "\033[00m, \033[36m" + myIAs[0].name + "\033[00m et \033[36m" + myIAs[1].name + "\033[00m.");
		} else {
			console.log(".compare [id1] [id2]");
			showListIA();
		}
	}
	// =====================================================
	// ====================== CREATE =======================
	else if (commande[0] == ".create") {
		const setNewCode = function(id) {
			const alphaC = "zyxwvutsrqponmlkjihgfedcba~?>=<:.-,+`";
			const alphabet = "/-\n codebasvilkunprmf(gtw)=\t[0];'hy!>";
			let code_de_base = ["zzyyyyyyyyyyyyyy",
				"yyyyyyyyyyyyyyyyyyxzzyyyyyyyw$vu",
				"tswtswrqpsw█████████yyyyyyyyyyyx",
				"zzyyyyyyy██yyyyyyywo██nqw$mss$lm",
				"uktwyyy██yxxzzw$ujwihs██jtwmqwih",
				"sgnshs█wqhgs██xnf██wedsc█$bsqiuj",
				"eaw~~w█jkmma██x?p██sc$bs█qiujeds",
				"c$bsq█iujpea██>=<██a:xxzz█w$ujwh",
				"svkis█hswm.sjjsgnwmswimkp█wihuv-",
				"sxoqh█wsjsg█████████,w~wd█sc$jsq",
				"hspc$s█jsg,█ea:█xxz█zw$u█jwp.qii",
				"huv-sw█tswm█.sj████jsgnw█pnwrspu",
				"njxnfwe██dsc███$vsmm$c██u$kps$bs",
				"qiujesjsg██,aw+~wdsc██$vsmmeaax?",
				"guos$cubqht█████████esjsg,a:xxzz",
				"w$ujwsppq,swtswmknwcnhshwtsppkpx",
				"b-nmswekps$bsqiujesjsg,aw`~w=a:x"
			].join("").decompressIA(alphaC, alphabet);

			$.post({
				url: "/index.php?page=editor_update",
				data: {
					id: id,
					compile: true,
					//token: __TOKEN,
					code: code_de_base
				},
				success: function() {
					getScripts();
				}
			});
		};

		if (commande[1]) {
			$.post({
				url: "/index.php?page=editor_update",
				data: {
					create: true,
					//token: __TOKEN
				},
				success: function(res, data) {
					if (res.headers.location && res.headers.location.indexOf("/editor/") != -1) {
						console.log("L'IA a été créée. Nommage en cours...\n");
						const id = /\d+/.exec(res.headers.location);
						$.post({
							url: "/index.php?page=editor_update",
							data: {
								color: 0,
								id: id,
								name: commande.slice(1).join(" "),
								save: true,
								//token: __TOKEN
							},
							success: function(res, data) {
								console.log("L'IA a été renommée, téléchargement de cette IA et actualisation des autres IAs.");

								setNewCode(id);
							}
						});
					} else {
						console.log("L'IA n'a pas été créée, problème avec le serveur.");
					}
				}
			});
		} else {
			console.log("Il est nécessaire de saisir un nom.");
		}
	}
	// =====================================================
	// ====================== RENAME =======================
	else if (commande[0] == ".rename") {
		const id = parseInt(commande[1]),
			index = LeeKloud.getIAids().indexOf(id);

		if (index != -1) {
			if (commande[2]) {
				$.post({
					url: "/index.php?page=editor_update",
					data: {
						color: 0,
						id: id,
						name: commande.slice(2).join(" "),
						save: true,
						//token: __TOKEN
					},
					success: function(res, data) {
						console.log("Le changement " + ((JSON.parse(data)) ? "a" : "\033[91mn'\033[00ma \033[91mpas\033[00m") + " été accepté par le serveur.");
					}
				});
			} else {
				console.log("C'est bien de vouloir renommer son IA, mais faut peut-être choisir un nouveau nom. - Après moi je dis ça... :B");
			}
		} else {
			console.log(".rename [id] [new_name]");
			showListIA();
		}
	}
	// =====================================================
	// ====================== PLUGIN =======================
	else if (commande[0] == ".plugin") {
		if (commande[1] == "update" && commande[2]) {
			const cmd = ".plugin install " + commande[2] + " y";
			console.log("Alias de " + cmd);
			return useCommande(cmd);
		}
		if (commande[1] == "install" && commande[2]) {
			console.log("Obtention de la liste des plugins.");
			getRepositoryJSON(function(res, data) {
				data = JSON.parse(data);

				for (let i = 0; i < data.length; i++) {
					if (data[i].name.toLowerCase() == commande[2].toLowerCase()) {
						if (_PLUGINS[data[i].name] && commande[3] != "y") {
							console.log("\033[92mVous utilisez déjà ce plugin.\033[00m\n");
							return;
						}

						console.log("Téléchargement du plugin : " + data[i].name);
						const url = data[i].url,
							plugname = data[i].name;
						getLeeKloudPlugin(url, function(res, data) {
							sendMP(59502, "Installation de " + plugname + ".");
							LeeKloud.setFileContent(url, data);

							console.log("\033[96m");
							splashMessage("Le plugin a été installé !");
							console.log("\033[00m");
							shutdown();
						});
						return;
					}
				}

				console.log("Aucun plugin porte ce nom.\n");
			});
		} else if (commande[1] == "list") {
			console.log("Obtention de la liste des plugins.");
			getRepositoryJSON(function(res, data) {
				data = JSON.parse(data);
				const s = (data.length <= 1) ? "" : "s";
				console.log("\033[96m");
				splashMessage(data.length + " plugin" + s);
				console.log("\033[00m");
				for (let i = 0; i < data.length; i++) {
					console.log("\033[96mName :\033[95m " + data[i].name + "\033[00m");
					console.log("\033[96mDescription :\033[00m " + data[i].description);
					console.log("\033[96mHash :\033[00m " + (_PLUGINS[data[i].name] ? "\033[92m" + _PLUGINS[data[i].name].hash + "\033[00m" : "?"));
					console.log("\033[96mEtat :\033[00m " + (_PLUGINS[data[i].name] ? "\033[92mVous utilisez" : "\033[93mVous n'utilisez pas") + " ce plugin.\033[00m");
					console.log(" ");
				} //\033[96m
			});
		} else {
			console.log("La sous-commande n'existe pas, ou les paramètres sont invalides.");
			printHelp([
				[".plugin install [name] ", "Installe le plugin [name]"],
				[".plugin list           ", "Affiche la liste des plugins que vous pouvez utiliser"],
				[".plugin update [name]  ", "Met à jour le plugin [name]"],
				//[".plugin remove [name]  ", "Supprime le plugin [name]"],
			]);
		}
	}
	// =====================================================
	// ====================== CHALLENGE ====================
	else if (commande[0] == ".challenge") {
		const id = parseInt(commande[1]),
			enemy = parseInt(commande[2]);

		if (LeeKloud.getLeekIds()[id]) {
			sendFight({
				leek_id: LeeKloud.getLeekIds()[id],
				challenge_id: enemy
			});
		} else {
			console.log("Le numéro du Leek doit-être entre 0 et " + (LeeKloud.getLeekIds().length - 1) + ".");
		}
	}
	// =====================================================
	// ====================== SANDBOX ======================
	else if (commande[0] == ".sandbox") {
		const ia_id = parseInt(commande[1]),
			index = LeeKloud.getIAids().indexOf(ia_id),
			leekid = LeeKloud.getLeekIds()[parseInt(commande[2])];

		if (index != -1) {
			if (leekid) {
				sandbox(ia_id, leekid);
			} else {
				console.log("Le numéro du Leek doit-être entre 0 et " + (LeeKloud.getLeekIds().length - 1) + ".");
			}
		} else {
			console.log(".sandbox [id] [num_leek]");
			showListIA();
		}
	}
	// =====================================================
	// ====================== LEEKLOUD-UPDATE ==============
	else if (commande[0] == ".leekloud-update") {
		if (__mustBeUpdate && commande[1] && (commande[1].match(/^o(ui)?/i) || commande[1].match(/^y(es)?/i))) {
			verifyVersion(true);
		} else if (!__mustBeUpdate) {
			console.log("Vous n'avez pas besoin d'utiliser cette commande.");
		} else {
			console.log("Confirmez la commande.");
			myRL.getRL().line = ".leekloud-update y";
		}
	}
	// =====================================================
	// ====================== CHANGELOG ====================
	else if (commande[0] == ".changelog") {
		const version = commande[1];
		if (!version || /^[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{1,2}[A-z]?$/.test(version)) {
			showChangelog(version ? version : "0", true);
		} else if (version) {
			console.log("Format de la version incorrect, il doit-être " + LeeKloud.version + " (X.X.X).");
		}
	}
	// =====================================================
	// ====================== LOGOUT =======================
	else if (commande[0] == ".logout") {
		LeeKloud.disconnect();
		fs.unlinkSync(LeeKloud.cookieStorage);
		return shutdown();
	}
	// =====================================================
	// ===================== HELP ==========================
	else if (["help", "?", ".help", "/?"].indexOf(commande[0]) != -1) {
		console.log("Aide :");
		printHelp(__HELP_COMMANDS);
		console.log("(?) [\033[95mnum_leek\033[00m] est le numéro de votre poireau (entre 0 et " + (LeeKloud.getLeekIds().length - 1) + ")");
		console.log("Autres : { \033[95mopen / twitter / chat / forum / leek / doc / .leekloud-update / .logout\033[00m }".replace(/ \/ /g, "\033[00m / \033[95m"));
		console.log(" ");
		console.log("Astuces :");
		console.log("- Si on vous demande de taper \"\033[95m.backup \033[00m[\033[95mid\033[00m]\" ou \"\033[95m.forceupdate \033[00m[\033[95mid\033[00m]\", essayez la flèche du haut.");
		console.log("- Essayez la touche tabulation lors de la saisie d'une commande.");
		console.log("- La commande \033[95m.logout\033[00m permet de vous déconnecter (elle supprime les cookies).");
	}
	// =====================================================
	// ===================== chat ==========================
	else if (commande[0] == "chat") {
		console.log("Le chat 12z : canal de discussion (HomeMade) - Programmation");
		open("http://chat.12z.fr/");
	}
	// =====================================================
	// ======= EN AVANT LES HISTOIRES ! ====================
	else if (__CMD_PLUGINS[commande[0]]) {
		try {
			_PLUGINS[__CMD_PLUGINS[commande[0]]].useCommande(line);
		} catch (err) {
			console.log(err.stack);
		}
	} else {
		let C = false;
		switch (commande[0]) {
			case "open":
				open(process.cwd());
				break;
			case "twitter":
				C = open("https://twitter.com/GuimDev");
				break;
			case "forum":
				C = open("http://leekwars.com/forum/category-7/topic-221");
				break;
			case "leek":
				C = open("http://leekwars.com/");
				break;
			case "doc":
				C = open("http://leekwars.com/documentation");
				break;
			default:
				console.log("Inconnu regarde l'aide \".help\".");
		}
		if (C) {
			console.log("Page ouverte " + commande[0] + ".");
		}
	}
	console.log(" ");
}

function printHelp(lines) {
	for (let i = 0, line; i < lines.length; i++, line) {
		line = [lines[i][0], lines[i][1]];
		line[0] = line[0].replace(/([\/\[\]\{\}])/g, "\033[00m$1\033[95m");
		console.log("\033[95m" + line.join("\033[00m : ") + ".");
	}
}

const user_id = [1, 2, 3, 4];

function completerId(cmd, line, hits, verify) {
	verify = (verify) ? verify : function(id, index) {
		return true;
	};

	const t = [cmd];
	if (line.indexOf(cmd) == 0) {
		user_id.forEach(function(id, index) {
			if (!verify(id, index)) {
				return;
			}
			t.push(cmd + id);
		});
		hits = t.filter(function(c) {
			return c.indexOf(line) == 0;
		});
		if (hits.length == 0) {
			hits = t;
		}
	}
	return hits;
}

function launcherReadline() {
	myRL.init();
	myRL.setCompletion(__TAB_COMPLETIONS);

	myRL.setPrompt("> ");
	myRL.on("line", function(line) {
		useCommande(line);
	});
	myRL.on("close", function() {
		LeeKloudStop();
		return;
	});
	myRL.on("SIGINT", function(rl) {
		rl.question("Es-tu sûr de vouloir éteindre LeeKloud ? (oui/non) ", function(answer) {
			return (answer.match(/^o(ui)?$/i) || answer.match(/^y(es)?$/i) || answer === "1") ? LeeKloudStop() : rl.output.write("\x1B[1K> ");
		});
	});


	myRL.on("completer", function(arg) {
		if (arg.hits.length == 1) {
			arg.line = arg.hits[0];
		}

		arg.hits = completerId(".backup ", arg.line, arg.hits);
		arg.hits = completerId(".forceupdate ", arg.line, arg.hits);
		arg.hits = completerId(".open ", arg.line, arg.hits);
		arg.hits = completerId(".compare ", arg.line, arg.hits);
		arg.hits = completerId(".rename ", arg.line, arg.hits);
		arg.hits = completerId(".sandbox ", arg.line, arg.hits);
	});

	myRL.setPrompt("");
	myRL.getRL().pause();
}

function LeeKloudStop() {
	const IAids = LeeKloud.getIAids();
	IAids.forEach(function (value, index) {
		const myIA = new __IA(value);
		fs.unwatchFile(myIA.filepath);
	});
	saveHistory();
	console.log("Arrêt.");
	process.exit(1)
}

function writeRapportlog(err) {
	const erreur = "-- " + new Date() + " -- \n\n" + err.stack + "\n\n\n";
	LeeKloud.setFileContent("rapport.log", LeeKloud.getFileContent("rapport.log", true) + erreur);
	console.log("L'erreur a été reportée dans le fichier :\n\033[96m" + fs.realpathSync("./rapport.log") + "\033[0m\n");
}

function saveHistory() {
	if (fs.existsSync(path.dirname(LeeKloud.files.cmdHistory) + "/"))
		LeeKloud.setFileContent(LeeKloud.files.cmdHistory, JSON.stringify(myRL.getHistory().slice(1, 40)));
}

function invasionB() {
	const a = [2129856, 2195504, 2490380, 2634114, 2634114, 3158401, 3145729, 3178433, 2638914, 2639746, 2504716, 2195504, 2129856];

	const noNegative = function(value) {
		return value = (value < 0) ? 0 : value;
	};

	const stdout = myRL.getRL();
	console.log(" ");
	for (let i = 0, value = 0; i < a.length; i++) {
		value = a[i].toString(2).substr(1);
		console.log(Array(noNegative((stdout.columns - value.length) / 2).round()).join(" ") + value.replace(/0/g, " "));
	}
	console.log(" ");
}

function sha256(data) {
	return crypto.createHash("sha256").update(data).digest("base64");
}

function fixASCII(data) { // Problème d'encodage, on vire le caractère 65279.
	while (data.charCodeAt(0) == 65279) {
		data = data.replace(/^./, "");
	}
	return data;
}
//https://api.github.com/repos/GuimDev/LeeKloud/branches/master

/*
fs.readdir("./scandir/", (err, files) => {
	files.forEach(file => {
		const data = fs.readFileSync("./scandir/" + file); //Buffer!!!
		console.log(file, sha1("blob " + data.length + "\0" + data), data.length);
	});
})
*/

//https://api.github.com/repos/GuimDev/LeeKloud
//https://api.github.com/repos/GuimDev/LeeKloud/branches/update-2.0.0
//https://api.github.com/repos/GuimDev/LeeKloud/git/trees/c37ce473fccfd7f68dea34e0f8a5a220f43cc52a
//https://api.github.com/repos/GuimDev/LeeKloud/releases/latest
//https://api.github.com/repos/GuimDev/LeeKloud/tags
function ajaxLeeKloud(path, success) {
	return console.log("Les fonctions liées au mise à jour sont désactivées.");
	const options = {
		host: "raw.githubusercontent.com",
		port: "443",
		path: path,
		method: "GET",
		headers: {
			"User-Agent": "NodeJS " + LeeKloud.title.split("/")
		}
	};
	const req = https.request(options, function(res) {
		let c = "";
		res.setEncoding("utf8");
		res.on("data", function(chunk) {
			c += chunk;
		});
		res.on("end", function() {
			if (success) {
				success(res, fixASCII(c));
			}
		});
	}).on("error", function(e) {
		console.log("\033[91mProblème avec la requête : " + e.message + "\033[00m");
		setTimeout(function() {
			return ajaxLeeKloud(path, success);
		}, 1500);
	}).end();
}

function getLeeKloudPlugin(path, success) {
	ajaxLeeKloud("/GuimDev/LeeKloud/update-2.0.0/" + path, success);
}

function getRepositoryJSON(success) {
	ajaxLeeKloud("/GuimDev/LeeKloud/update-2.0.0/repository.json", success);
}

function getLeeKloud(success) {
	ajaxLeeKloud("/GuimDev/LeeKloud/update-2.0.0/_LeeKloud.js", success);
}

function getChangeLogLeeKloud(success) {
	ajaxLeeKloud("/GuimDev/LeeKloud/update-2.0.0/CHANGELOG", success);
}

////--------------------------------------------------------------------------------
////-------------------------- Fin de la LICENCE CC BY-SA --------------------------
////--------------------------------------------------------------------------------
////--------------------------------------------------------------------------------

////--------------------------------------------------------------------------------
////---------- https://github.com/jjrdn/node-open/blob/master/lib/open.js ----------
////-------------------------------------------- Copyright (c) 2012 Jay Jordan -----
////--------------------------------------------------------------------------------

function open(target, appName, callback) {
	let opener;

	if (typeof(appName) === "function") {
		callback = appName;
		appName = null;
	}

	switch (process.platform) {
		case "darwin":
			if (appName) {
				opener = 'open -a "' + o_escape(appName) + '"';
			} else {
				opener = 'open';
			}
			break;
		case "win32":
			if (appName) {
				opener = 'start "" "' + o_escape(appName) + '"';
			} else {
				opener = 'start ""';
			}
			break;
		case "win64": // N'arrivera jamais car 64bit == win32 quand même
			if (appName) {
				opener = 'start "" "' + o_escape(appName) + '"';
			} else {
				opener = 'start ""';
			}
			break;
		default:
			if (appName) {
				opener = o_escape(appName);
			} else {
				opener = 'xdg-open';
			}
			break;
	}

	return exec(opener + ' "' + o_escape(target) + '"', callback);
}

function o_escape(s) {
	return s.replace(/"/, "\\\"");
}
