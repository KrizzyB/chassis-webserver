const express = require("express");
const http = require('http');
const https = require('https');
const readRoutesFromFileSystem = require("./helper/getRoutes");
const generateEndpoints = require("./helper/generateEndpoints");
const logModule = "chassis-webserver";

class WebServer {
    /**
     * @param {Number|String} [port]
     * @param {Object} [options]
     * @param {Array} [options.routes]
     * @param {Array} [options.staticDir]
     * @param {Array} [options.middleware]
     * @param {Object} [options.ssl]
     * @param {String} [options.ssl.key]
     * @param {String} [options.ssl.cert]
     */
    constructor(port = 80, options = {}) {
        const webserverConfig = config.getConfigByID("webserver");

        this.allowPrivate = false;
        this.app = express();
        this.config = webserverConfig ? webserverConfig.merge(getDefaultConfig()) : getDefaultConfig().data;
        this.port = port ? port : this.config.port;
        this.routes = this.getRoutes(options.routes ? options.routes : this.config.routes);
        this.staticDir = options.staticDir ? options.staticDir : this.config.staticDir;
        this.middleware = options.middleware ? options.middleware : this.config.middleware;
        this.plugins = {};
        this.ssl = options.ssl ? options.ssl : this.config.ssl;
        this.endpoints = generateEndpoints(this.routes);

        for (let i=0; i<this.staticDir.length; i++) {
            this.app.use(express.static(this.staticDir[i]));
        }

        for (let m=0; m<this.middleware.length; m++) {
            this.plugins[this.middleware[m].name] = require(this.middleware[m].path);
            this.app.use(eval("this.plugins." + this.middleware[m].exec));
        }

        for (let e=0; e<this.endpoints.length; e++) {
            let router = require(appRoot + this.endpoints[e].router.dir);
            if (typeof router !== "function") { //compatibility with routers prior to being able to make them private
                if (!router.private || this.allowPrivate) {
                    this.app.use(this.endpoints[e].url.prefix + this.endpoints[e].url.appGroup + this.endpoints[e].url.router, router.router);
                    Log.verbose("Endpoint created: " + this.endpoints[e].url.prefix + this.endpoints[e].url.appGroup + this.endpoints[e].url.router, logModule);
                }
            } else {
                this.app.use(this.endpoints[e].url.prefix + this.endpoints[e].url.appGroup + this.endpoints[e].url.router, router);
                Log.verbose("Endpoint created: " + this.endpoints[e].url.prefix + this.endpoints[e].url.appGroup + this.endpoints[e].url.router, logModule);
            }
        }

        if (this.ssl.cert && this.ssl.key) {
            let httpsServer = https.createServer({
                key: FileSystem.readFileSync(this.ssl.key),
                cert: FileSystem.readFileSync(this.ssl.cert)
            }, this.app);
            httpsServer.listen(this.port);
            Log.info("Server listening for HTTPS connections on port " + this.port + ".", logModule);
        } else {
            let httpServer = http.createServer(this.app);
            httpServer.listen(this.port);
            Log.info("Server listening for HTTP connections on port " + this.port + ".", logModule);
        }
    }

    getRoutes(routes) {
        let self = this;
        if (routes.length === 0) {
            routes = readRoutesFromFileSystem();
        } else {
            self.allowPrivate = true;
        }

        return routes;
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
    const Config = config.getConfigModel();
    return new Config({
        id: "webserver",
        data: {
            "port": 80,
            "routes" : [],
            "staticDir": ["html"],
            "middleware": [],
            "ssl": {}
        }
    });
}
