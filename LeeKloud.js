const crypto = require("crypto"),
    https = require("https"),
    path = require("path"),
    {
        URL
    } = require("url"),
    fs = require("fs");

const $ = {
    post: post,
    get: get
};

const version = "v2",
    Launcher = {
        title: "Launcher LeeKloud " + version
    };

function raw2json(raw) {
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.log("ERREUR L21 : Parse data impossible");
        console.log(err.stack);
        console.log("\033[91mCa commence bien le Launcher plante...\033[00m");
        return process.exit();
    }
}

function getURL(url, success) {
    $.get({
        url: url,
        success: function(res, data) {
            const json = raw2json(data);

            if (success)
                success(json)
        }
    })
}

getURL("/repos/GuimDev/LeeKloud/branches/prod", function(json) {
    getURL((new URL(json.commit.commit.tree.url)).pathname, function(json) {
        for (let i = json.tree.length - 1, tree; i >= 0; i--) {
            tree = json.tree[i];

            if (tree.path === "LeeModule" && tree.type === "tree") {
                return getLeeModuleTree(tree.sha);
            }
        }
    });
});

function getLeeModuleTree(tree) {
    fs.readdir("./LeeModule/", (err, files) => {
        let text = "";

        files.forEach(file => {
            const data = Buffer.from(fs.readFileSync("./LeeModule/" + file), "binary").toString("binary"); //Buffer!!!
            let sha = Buffer.from(sha1("blob " + data.length + "\0" + data), "hex").toString("binary");
            text += "100644" + " " + file + "\0" + sha;
        });

        const pattern = "tree " + text.length + "\0" + text;
        console.log((tree !== sha1(pattern) ? "\x1B[91m" : "\x1B[92m") + sha1(pattern) + "\x1B[00m");
    });
}

function pad(num, length) {
    var pad = new Array(1 + length).join("0");
    return (pad + num).slice(-pad.length);
}

/*
const LeeKloudPlay = require("./LeeModule/main.js");

LeeKloudPlay.dirname = "LeeKloudData";

LeeKloudPlay.folders.__dirname = __dirname;

LeeKloudPlay.domain();
*/

function sha1(data) {
    return crypto.createHash("sha1").update(data, "binary").digest("hex");
}

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
        host: "api.github.com",
        port: "443",
        path: option.url,
        method: (option.method == "GET") ? "GET" : "POST",
        headers: {
            "User-Agent": "NodeJS " + Launcher.title,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Content-Length": data.length
        }
    };

    const req = https.request(options, function(res) {
        res.setEncoding("utf8");
        let content = "";

        res.on("data", function(chunk) {
            content += chunk;
        });

        res.on("end", function() {
            if (option.success) {
                option.success(res, content, context);
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
