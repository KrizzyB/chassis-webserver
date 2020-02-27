/**
 * Sorts the generated endpoints to ensure URLs with a prefix, groupName, or endpointName are declared before any
 * that are shortened to prevent endpoints being prematurely 404'd.
 *
 * @param {Object} endpoints
 * @retruns {Object} endpoints
 */

module.exports = function(endpoints) {
    //sort endpoints with a prefix
    let prefixedEndpoints = splitArrayByKey(endpoints, "prefix");
    prefixedEndpoints = sortEndpoints(prefixedEndpoints, "groupName");

    //sort endpoints with a prefix and a groupanme
    let prefixedGroupedEndpoints = splitArrayByKey(prefixedEndpoints, "groupName");
    prefixedGroupedEndpoints = sortEndpoints(prefixedGroupedEndpoints, "endpointName");

    //sort endpoints with a groupName
    let groupedEndpoints = splitArrayByKey(endpoints, "groupName");
    groupedEndpoints = sortEndpoints(groupedEndpoints, "endpointName");

    //sort endpoints with a groupName
    let namedEndpoints = splitArrayByKey(endpoints, "endpointName");

    let orderedEndpoints = prefixedGroupedEndpoints.concat(prefixedEndpoints, groupedEndpoints, namedEndpoints, endpoints);

    return orderedEndpoints;
};

function splitArrayByKey(endpoints, key) {
    let newArray = [];
    for (let e=0; e<endpoints.length; e++) {
        if (endpoints[e].url[key] === "" || endpoints[e].url[key] === "/") {
            //skip
        } else {
            newArray.push(endpoints[e]);
            endpoints.splice([e], 1);
            --e;
        }
    }

    return newArray;
}

function sortEndpoints(endpoints, key) {
    endpoints.sort(function(a, b) {
        let _return = 0;
        let x = a.url[key].toLowerCase();
        let y = b.url[key].toLowerCase();

        if (x < y) {_return = 1;}
        if (x > y) {_return = -1;}

        return _return;
    });

    return endpoints;
}
