const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const fileUpload = require("express-fileupload");
const http = require('http');
const https = require('https');
const sortEndpoints = require("./helper/sortEndpoints");
let app = express();

let logModule = "chassis-webserver";

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
        this.endpoints = [];

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
            Log.info("Webserver listening for HTTPS connections on port " + this.port + ".", logModule);
        } else {
            let httpServer = http.createServer(app);
            httpServer.listen(this.port);
            Log.info("Webserver listening for HTTP connections on port " + this.port + ".", logModule);
        }
    }

    getRoutes() {
        let endpoints = [];
        let currentPath = [];
        function readDirectory(dir) {
            let items = FileSystem.readSync(dir);
            function checkItem(i) {
                if (FileSystem.isDir(dir + items[i])) {

                    if (items[i] === "routes") {
                        let dirs = FileSystem.readSync(dir + items[i]);

                        if (dirs.includes("api")) {
                            endpoints = endpoints.concat(createEndpoint("api", dir, items[i]));
                        }

                        if (dirs.includes("frontend")) {
                            endpoints = endpoints.concat(createEndpoint("frontend", dir, items[i]));
                        }

                    } else {
                        currentPath.push(items[i]);
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

            currentPath.pop();
        }

        readDirectory("./app/");

        endpoints = sortEndpoints(endpoints);

        for (let e=0; e<endpoints.length; e++) {
            this.endpoints.push(app.use(endpoints[e].url.prefix + endpoints[e].url.groupName + endpoints[e].url.endpointName, require(appRoot + endpoints[e].router.dir + endpoints[e].router.item + "/" + endpoints[e].router.type + "/" + endpoints[e].router.endpoint)));
            Log.verbose("Endpoint created: " + endpoints[e].url.prefix + endpoints[e].url.groupName + endpoints[e].url.endpointName, logModule);
        }

        function createEndpoint(type, dir, item) {
            let endpoints = FileSystem.readSync(dir + item + "/" + type);
            for (let e=0; e < endpoints.length; e++) {
                let prefix = type === "api" ? "/data/" : "/";

                let groupName = currentPath[currentPath.length-1] + "/";
                if (groupName === "system/") {
                    groupName = "";
                }

                let endpointName = endpoints[e].substring(0, endpoints[e].lastIndexOf("."));
                if (endpointName === type) {
                    endpointName = "";
                }

                endpoints[e] = {
                    url: {
                        prefix: prefix,
                        groupName: groupName,
                        endpointName: endpointName
                    },
                    router: {
                        dir: dir,
                        item: item,
                        type: type,
                        endpoint: endpoints[e]
                    }
                };
            }

            return endpoints;
        }
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
            "staticDir": ["html"],
            "ssl": {}
        }
    });
}
