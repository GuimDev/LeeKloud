const fs = require("fs"),
	path = require("path");

const version = "2.0.0",
	title = "LeeKloud " + version;

const LeeKloud = module.exports = {
	version: version,
	title: title,
	domain: null,

	currentLogin: null,
	farmer: null,
	dirname: ".LeeKloud",

	folders: {
		__dirname: null,
		parent: null, // cwd ou __dirname
		base: null, // parent + ./LeeKloud/
		plugins: "plugins/".replace(/\//g, path.sep),
		account: "account/".replace(/\//g, path.sep),
		tempLK: ".tempLK/".replace(/\//g, path.sep),
		// account/<login>/
		current: "./",
		IAfolder: "IA/",
		data: ".data/",
		backup: ".data/backup/"
	},
	cookieStorage: null, // ./account/<login>/.data/cookieStorage
	files: {
		lastLogin: ".tempLK/lastLogin".replace(/\//g, path.sep),
		lastMP: ".tempLK/lastMP".replace(/\//g, path.sep),
		version: ".tempLK/version".replace(/\//g, path.sep),
		// ./account/<login>/
		cmdHistory: ".data/cmdHistory",
		hash: ".data/hash",
		farmer: ".data/farmer"
	},

	//SUPPORT LK v1
	getIAids: function() {
		if (!LeeKloud.farmer || !LeeKloud.farmer.ais)
			return [];
		const arr = [];
		for (var i = 0; i < LeeKloud.farmer.ais.length; i++) {
			arr.push(LeeKloud.farmer.ais[i].id);
		}
		return arr;
	},
	getLeekIds: function() {
		if (!LeeKloud.farmer || !LeeKloud.farmer.leeks)
			return [];
		const arr = [];
		for (var index in LeeKloud.farmer.leeks) {
			if (object.hasOwnProperty(index)) {
				arr.push(index);
			}
		}
		return arr;
	},

	getFileContent: getFileContent,
	setFileContent: setFileContent
};


const __AI_IDS = undefined,
	__AI_NAMES = undefined,
	__LEEK_IDS = undefined,
	__FARMER_ID = undefined,
	__FARMER_NAME = undefined;

function getFileContent(filename, check) {
	if (check && !fs.existsSync(filename)) return "";
	return fs.readFileSync(filename).toString();
}

function setFileContent(filename, data) {
	return fs.writeFileSync(filename, data);
}