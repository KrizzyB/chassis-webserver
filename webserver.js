const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const fileUpload = require("express-fileupload");
const http = require('http');
const https = require('https');
const Config = config.getConfigModel();
let app = express();

class WebServer {
    /**
     * @param {Number|String} [port]
     * @param {Array} [staticDir]
     * @param {Object} [ssl]
     */
    constructor(port, staticDir, ssl ) {
        let webserverConfig = config.getConfigByID("webserver");
        this.config = webserverConfig ? webserverConfig.merge(getDefaultConfig()) : getDefaultConfig().data;
        this.port = port ? port : this.config.port;
        this.staticDir = staticDir ? staticDir : this.config.staticDir;
        this.ssl = ssl ? ssl : this.config.ssl;

        for (let i=0; i<this.staticDir.length; i++) {
            app.use(express.static(this.staticDir[i]));
        }
        app.use(bodyParser.json());
        app.use(cookieParser());
        app.use(fileUpload());

        this.getRoutes();

        if (this.ssl.cert && this.ssl.key) {
            let httpsServer = https.createServer({
                key: FileSystem.readFileSync(this.ssl.key),
                cert: FileSystem.readFileSync(this.ssl.cert)
            }, app);
            httpsServer.listen(this.port);
            Log.info("Webserver listening for HTTPS connections on port " + this.port + ".");
        } else {
            let httpServer = http.createServer(app);
            httpServer.listen(this.port);
            Log.info("Webserver listening for HTTP connections on port " + this.port + ".");
        }
    }

    getRoutes() {
        function readDirectory(dir) {
            let items = FileSystem.readSync(dir);
            function checkItem(i) {
                if (FileSystem.isDir(dir + items[i])) {

                    if (items[i] === "routes") {
                        let dirs = FileSystem.readSync(dir + items[i]);

                        if (dirs.includes("api")) {
                            let api = FileSystem.readSync(dir + items[i] + "/api");
                            for (let a=0; a < api.length; a++) {
                                let name = api[a].substring(0, api[a].lastIndexOf("."));

                                if (name === "system") {
                                    name = "";
                                }

                                app.use("/data/" + name, require(appRoot + dir + items[i] + "/api/" + api[a]));
                            }
                        }

                        if (dirs.includes("frontend")) {
                            let frontend = FileSystem.readSync(dir + items[i] + "/frontend");
                            for (let f=0; f < frontend.length; f++) {
                                let name = frontend[f].substring(0, frontend[f].lastIndexOf("."));

                                if (name === "system") {
                                    name = "";
                                }

                                app.use("/" + name, require(appRoot + dir + items[i] + "/frontend/" + frontend[f]));
                            }
                        }

                    } else {
                        readDirectory(dir + items[i] + "/");
                    }

                }

                if (i+1 < items.length) {
                    checkItem(i+1);
                }
            }

            if (items.length) {
                checkItem(0);
            }
        }

        readDirectory("./app/");
    }

    static getParams(req) {
        let params = Object.keys(req.query);
        let output = {};

        for (let p=0; p<params.length; p++) {
            switch(params[p]) {
                case "limit":
                case "page":
                    output[params[p]] = Number(req.query[params[p]]);
                    break;
                case "fields":
                    if (!output.fields) {
                        output.fields = {};
                    }
                    let fields = req.query[params[p]].split(" ");
                    for (let f=0; f<fields.length; f++) {
                        if (fields[f] === "_id") {
                            output.fields["_id"] = 0;
                        } else {
                            output.fields[fields[f]] = 1;
                        }
                    }
                    break;
                default:
                    if (!output.query) {
                        output.query = {};
                    }
                    output.query[params[p]] = req.query[params[p]];
            }
        }

        return output;
    }

    static getExpress() {
        return express;
    }
}

module.exports = WebServer;

/**
 *
 * @returns {Config}
 */
function getDefaultConfig() {
    return new Config({
        id: "webserver",
        data: {
            "port": 80,
            "staticDir": ["html"],
            "ssl": {}
        }
    });
}
