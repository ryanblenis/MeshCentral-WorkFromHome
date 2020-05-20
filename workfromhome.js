/** 
* @description MeshCentral WorkFromHome Plugin
* @author Ryan Blenis
* @copyright 
* @license Apache-2.0
*/

"use strict";

module.exports.workfromhome = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.meshServer = parent.parent;
    obj.debug = obj.meshServer.debug;
    obj.onlineNodes = [];
    obj.VIEWS = __dirname + '/views/';
    obj.intervalTimer = null;
    obj.exports = [
      'mapUpdate',
      'resizeContent',
      'onDeviceRefreshEnd'
    ];
    
    obj.resetQueueTimer = function() {
        clearTimeout(obj.intervalTimer);
        obj.intervalTimer = setInterval(obj.queueRun, 3 * 60 * 60 * 1000); // every 3 hours (cookies are good for 4)
    };
    
    obj.server_startup = function() {
        obj.meshServer.pluginHandler.workfromhome_db = require (__dirname + '/db.js').CreateDB(obj.meshServer);
        obj.db = obj.meshServer.pluginHandler.workfromhome_db;
        obj.resetQueueTimer();
    };
    
    obj.queueRun = function() {
        var onlineAgents = Object.keys(obj.meshServer.webserver.wsagents);
        obj.db.getAllMaps(onlineAgents)
        .then((maps) => {
            if (maps.length) {
                var uinfo = maps[0].user.split('/');
                var rcookie = parent.parent.encodeCookie({ userid: maps[0].user, domainid: uinfo[1] }, obj.meshServer.loginCookieEncryptionKey);
                maps.forEach(function(map) {
                    obj.updateAuthCookie(map.fromNode, map, rcookie);
                });
            }
        })
    };
    
    obj.onDeviceRefreshEnd = function() {
        pluginHandler.registerPluginTab({
            tabTitle: 'Work From Home',
            tabId: 'pluginWorkFromHome'
        });
        QA('pluginWorkFromHome', '<iframe id="pluginIframeWorkFromHome" style="width: 100%; height: 800px;" scrolling="no" frameBorder=0 src="/pluginadmin.ashx?pin=workfromhome&user=1&node='+ currentNode._id +'" />');
    };
    
    obj.hook_agentCoreIsStable = function(myparent, gp) { // check for remaps when an agent logs in
        obj.db.getMaps(myparent.dbNodeKey)
        .then((maps) => {
            if (maps.length) {
                var uinfo = maps[0].user.split('/');
                var rcookie = parent.parent.encodeCookie({ userid: maps[0].user, domainid: uinfo[1] }, obj.meshServer.loginCookieEncryptionKey);
                maps.forEach(function(map) {
                    obj.startRoute(map.fromNode, map, rcookie);
                });
            }
        })
        .catch(e => console.log('PLUGIN: WorkFromHome: Error adding routes to agent on checkin 1: ', e));
    };
    
    obj.startRoute = function(comp, map, rcookie) {
        const command = {
            action: 'plugin',
            plugin: 'workfromhome',
            pluginaction: 'startRoute',
            mid: map._id,
            rauth: rcookie,
            nodeid: map.toNode,
            remoteport: map.port,
            localport: map.localport,
            rdplabel: map.rdplabel || "Work_Computer",
            aadcompat: map.aadcompat || false
        };
        
        try { 
            obj.debug('PLUGIN', 'WorkFromHome', 'Starting route ' + map._id + ' to ' + comp);
            obj.meshServer.webserver.wsagents[comp].send(JSON.stringify(command)); 
        } catch (e) { 
            obj.debug('PLUGIN', 'WorkFromHome', 'Could not send map to ' + comp); 
        }
    };
    obj.updateAuthCookie = function(comp, map, rcookie) {
        const command = {
            action: 'plugin',
            plugin: 'workfromhome',
            pluginaction: 'updateCookie',
            rauth: rcookie
        };
        
        try { 
            obj.debug('PLUGIN', 'WorkFromHome', 'Updating auth cookie for ' + map._id + ' to ' + comp);
            obj.meshServer.webserver.wsagents[comp].send(JSON.stringify(command)); 
        } catch (e) { 
            obj.debug('PLUGIN', 'WorkFromHome', 'Could not update auth cookie for ' + comp); 
        }
    };
    
    obj.mapUpdate = function() {
        // placeholder. If settings is never opened, updates sent to user throw console error.
    };
    
    obj.resizeContent = function() {
        var iFrame = document.getElementById('pluginIframeWorkFromHome');
        var newHeight = 800;
        var sHeight = iFrame.contentWindow.document.body.scrollHeight;
        if (sHeight > newHeight) newHeight = sHeight;
        iFrame.style.height = newHeight + 'px';
    };
    
    obj.handleAdminReq = function(req, res, user) {
        if ((user.siteadmin & 0xFFFFFFFF) == 1 && req.query.admin == 1) 
        {
            // admin wants admin, grant
            var vars = {};
            res.render(obj.VIEWS + 'admin', vars);
            return;
        } else if (req.query.dlrdpfile == 1) {
            res.setHeader('Content-disposition', 'attachment; filename=' + decodeURIComponent(req.query.name) + '.rdp');
            res.setHeader('Content-type', 'text/plain');
            //var fs = require('fs');
            res.send('full address:s:127.0.0.1:' + req.query.port);
            return;
        } else if (req.query.pickNode == 1) {
            res.render(obj.VIEWS + 'pickNode', vars);
            return;
        } else {
            var vars = {};
            obj.db.getMaps(req.query.node)
            .then(maps => {
                if (maps.length) vars.mappings = JSON.stringify(maps);
                else vars.mappings = 'null';
                return Promise.resolve();
            })
            .then(() => {
                res.render(obj.VIEWS + 'user', vars);
            })
            .catch(e => console.log('PLUGIN: WorkFromHome: Error parsing user options. ', e));
            
            return;
        }
        res.sendStatus(401); 
        return;
    };
    
    obj.removeMapFromComp = function(id) {
        var fromNode = null;
        obj.endRoute(id)
        .then(() => {
            return obj.db.get(id);
        })
        .then((maps) => {
            if (maps.length) {
                fromNode = maps[0].fromNode;
            }
            return obj.db.delete(id);
        })
        .then(() => {
            obj.updateFrontEnd({ fromNode: fromNode });
            return Promise.resolve();
        })
        .catch(e => console.log('PLUGIN: WorkFromHome: Error removing map: ', e));
    };
    obj.endRoute = function (mapId) {
        return obj.db.get(mapId)
            .then((maps) => {
                var mapRef = maps[0];
                // destroy the user map
                const cmd = {
                    action: 'plugin',
                    plugin: 'workfromhome',
                    pluginaction: 'endRoute',
                    mid: mapId
                };
                try { 
                    obj.debug('PLUGIN', 'WorkFromHome', 'Ending route for ID ' + mapId); 
                    obj.meshServer.webserver.wsagents[mapRef.fromNode].send(JSON.stringify(cmd));
                } catch (e) { 
                    obj.debug('PLUGIN', 'WorkFromHome', 'Could not end map for ' + mapRef.fromNode + ' (agent offline)'); 
                }
            });
    };
    obj.updateFrontEnd = function(ids) {
        /*if (obj.meshServer.webserver.wssessions[user] != null) {
            obj.meshServer.webserver.wssessions[user].forEach(function(sess) {
                obj.meshServer.webserver.wssessions2[sess.sessionId].send(JSON.stringify(msg));
            });
        }*/
        if (ids.fromNode != null) {
            obj.db.getMaps(ids.fromNode)
            .then((nodeMaps) => {
                var targets = ['*', 'server-users'];
                obj.meshServer.DispatchEvent(targets, obj, { nolog: true, action: 'plugin', plugin: 'workfromhome', pluginaction: 'updateMapData', nodeId: ids.fromNode, mapData: nodeMaps });
            });
        }
    };
    obj.serveraction = function(command, myparent, grandparent) {
        switch (command.pluginaction) {
            case 'addMap':
                var newMapId = null, myComp = null;
                obj.db.addMap(command.user, command.fromNode, command.toNode, command.rdplabel, command.aadcompat)
                .then((newMapInfo) => {
                    newMapId = newMapInfo.insertedId;
                    return obj.db.getMaps(command.fromNode);
                })
                .then(maps => {
                    var x = { action: "plugin", plugin: "workfromhome", method: "mapUpdate", data: maps};
                    myparent.ws.send(JSON.stringify(x));
                    return obj.db.get(newMapId);
                })
                .then((maps) => {
                    var uinfo = command.user.split('/');
                    var rcookie = parent.parent.encodeCookie({  userid: command.user, domainid: uinfo[1] }, obj.meshServer.loginCookieEncryptionKey);

                    obj.startRoute(maps[0].fromNode, maps[0], rcookie);
                })
                .catch(e => console.log('PLUGIN: WorkFromHome: Error adding a map: ', e));
            break;
            case 'removeMap':
                obj.removeMapFromComp(command.id);
            break;
            case 'updateMapPort':
                obj.debug('PLUGIN', 'WorkFromHome', 'Updating mapped port for ' + command.mid + ' to ' + command.port);
                obj.db.update(command.mid, { localport: command.port })
                .then(() => {
                    return obj.db.get(command.mid);
                })
                .then((mObj) => {
                    mObj = mObj[0];
                    obj.updateFrontEnd({ fromNode: mObj.fromNode });
                    return obj.db.getMaps(mObj.fromNode);
                })
                .catch(e => console.log('PLUGIN: WorkFromHome: Error updating mapped port: ', e));
            break;
            case 'updateMapLabel':
                obj.db.update(command.mid, { rdplabel: command.rdplabel })
                .then(() => {
                    return obj.db.get(command.mid);
                })
                .then((mObj) => {
                    mObj = mObj[0];
                    obj.updateFrontEnd({ fromNode: mObj.fromNode });
                    
                    var uinfo = mObj.user.split('/');
                    var rcookie = parent.parent.encodeCookie({  userid: mObj.user, domainid: uinfo[1] }, obj.meshServer.loginCookieEncryptionKey);
                    obj.startRoute(mObj.fromNode, mObj, rcookie);
                    return Promise.resolve();
                })
                .catch(e => console.log('PLUGIN: WorkFromHome: Error updating RDP Label: ', e));
            break;
            case 'updateAadCompat':
                obj.db.update(command.mid, { aadcompat: command.aadcompat })
                .then(() => {
                    return obj.db.get(command.mid);
                })
                .then((mObj) => {
                    mObj = mObj[0];
                    obj.updateFrontEnd({ fromNode: mObj.fromNode });
                    
                    var uinfo = mObj.user.split('/');
                    var rcookie = parent.parent.encodeCookie({  userid: mObj.user, domainid: uinfo[1] }, obj.meshServer.loginCookieEncryptionKey);
                    obj.startRoute(mObj.fromNode, mObj, rcookie);
                    return Promise.resolve();
                })
                .catch(e => console.log('PLUGIN: WorkFromHome: Error updating RDP Label: ', e));
            break;
            default:
                console.log('PLUGIN: WorkFromHome: unknown action');
            break;
        }
    };
    
    return obj;
}