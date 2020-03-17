/**
 * Sorts the generated endpoints to ensure URLs with a prefix, groupName, or endpointName are declared before any
 * that are shortened to prevent endpoints being prematurely 404'd.
 *
 * @returns {Array} routes
 */

module.exports = function() {
    let routes = [];
    let appPath = "./app";
    let appGroups = FileSystem.readSync(appPath);

    for (let ag=0; ag<appGroups.length; ag++) {
        if (FileSystem.isDir(appPath + "/" + appGroups[ag])) {
            let appGroupItems = FileSystem.readSync(appPath + "/" + appGroups[ag]);
            let routesIndex = appGroupItems.indexOf("routes");
            if (routesIndex >=0) {
                let routeGroups = FileSystem.readSync(appPath + "/" + appGroups[ag] + "/" + appGroupItems[routesIndex]);
                for (let rg=0; rg<routeGroups.length; rg++) {
                    if (FileSystem.isDir(appPath + "/" + appGroups[ag] + "/" + appGroupItems[routesIndex] + "/" + routeGroups[rg])) {
                        let routers = FileSystem.readSync(appPath + "/" + appGroups[ag] + "/" + appGroupItems[routesIndex] + "/" + routeGroups[rg]);
                        for (let r=0; r<routers.length; r++) {
                            routes.push(appPath + "/" + appGroups[ag] + "/" + appGroupItems[routesIndex] + "/" + routeGroups[rg] + "/" + routers[r]);
                        }
                    }
                }
            }
        }
    }

    return routes;
};
