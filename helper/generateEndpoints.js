const sortEndpoints = require("./sortEndpoints");

module.exports = function(routes) {
    let endpoints = [];
    for (let r=0; r<routes.length; r++) {
        let routeComponents = routes[r].split(/[\\|\/]/);
        let appGroup = routeComponents[2] + "/";
        let routeGroup = routeComponents[4];
        let router = routeComponents[5].substring(0, routeComponents[5].lastIndexOf("."));

        if (appGroup === "system/") {
            appGroup = "";
        }

        let prefix = "/" + routeGroup + "/";
        if (routeGroup === "api") {
            prefix = "/data/"
        } else if (routeGroup === "frontend") {
            prefix = "/";
        }

        if (router === routeGroup) {
            router = "";
        }

        endpoints.push({
            url: {
                prefix: prefix,
                appGroup: appGroup,
                router: router
            },
            router: {
                dir: routes[r],
                routeGroup: routeGroup,
                router: router
            }
        });
    }

    endpoints = sortEndpoints(endpoints);

    return endpoints;
};
