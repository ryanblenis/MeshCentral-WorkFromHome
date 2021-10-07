/** 
* @description MeshCentral-WorkFromHome database module
* @author Ryan Blenis
* @copyright Ryan Blenis 2020
* @license Apache-2.0
*/

"use strict";
require('promise');
var Datastore = null;
var formatId = null;

module.exports.CreateDB = function(meshserver) {
    var obj = {};
    var NEMongo = require(__dirname + '/nemongo.js');
    obj.dbVersion = 1;
    
    obj.initFunctions = function () {
        obj.updateDBVersion = function(new_version) {
          return obj.file.updateOne({type: "db_version"}, { $set: {version: new_version} }, {upsert: true});
        };
        
        obj.getDBVersion = function() {
            return new Promise(function(resolve, reject) {
                obj.file.find( { type: "db_version" } ).project( { _id: 0, version: 1 } ).toArray(function(err, vers){
                    if (vers.length == 0) resolve(1);
                    else resolve(vers[0]['version']);
                });
            });
        };

        obj.update = function(id, args) {
            id = formatId(id);
            return obj.file.updateOne( { _id: id }, { $set: args } );
        };
        obj.delete = function(id) {
            id = formatId(id);
            return obj.file.deleteOne( { _id: id } );
        };
        obj.get = function(id) {
            if (id == null || id == 'null') return new Promise(function(resolve, reject) { resolve([]); });
            id = formatId(id);
            return obj.file.find( { _id: id } ).toArray();
        };
        obj.getMaps = function(nodeId) {
            return obj.file.find( { fromNode: nodeId, type: 'portMap' } ).toArray();
        };
        obj.addMap = function(user, fromNode, toNode, rdplabel, aadcompat) {
            return obj.file.insertOne( {
                type: 'portMap',
                fromNode: fromNode,
                toNode: toNode,
                port: 3389,
                localport: 0,
                auto: false,
                user: user,
                rdplabel: rdplabel,
                aadcompat: aadcompat
            });
        };
        obj.getAllMaps = function (nodeScope) {
            return obj.file.find( { fromNode: { $in: nodeScope }, type: 'portMap' } ).toArray();
        };
        obj.getRdpLinksForUser = function(userId) {
            return obj.file.find({ type: 'portMap', user: userId, rdplink: true }).toArray();
        };

    };
    
    if (meshserver.args.mongodb) { // use MongDB
      require('mongodb').MongoClient.connect(meshserver.args.mongodb, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {
          if (err != null) { console.log("Unable to connect to database: " + err); process.exit(); return; }
          
          var dbname = 'meshcentral';
          if (meshserver.args.mongodbname) { dbname = meshserver.args.mongodbname; }
          const db = client.db(dbname);
          
          obj.file = db.collection('plugin_workfromhome');
          obj.file.indexes(function (err, indexes) {
              // Check if we need to reset indexes
              var indexesByName = {}, indexCount = 0;
              for (var i in indexes) { indexesByName[indexes[i].name] = indexes[i]; indexCount++; }
              if ((indexCount != 1)) { // || (indexesByName['User1'] == null)) {
                  // Reset all indexes
                  console.log('Resetting plugin (WorkFromHome) indexes...');
                  obj.file.dropIndexes(function (err) {
                      //obj.file.createIndex({ user: 1 }, { name: 'User1' });
                  }); 
              }
          });
          
          if (typeof require('mongodb').ObjectID == 'function') {
              formatId = require('mongodb').ObjectID;
          } else {
              formatId = require('mongodb').ObjectId;
          }
          obj.initFunctions();
    });  
    } else { // use NeDb
        Datastore = require('nedb');
        if (obj.filex == null) {
            obj.filex = new Datastore({ filename: meshserver.getConfigFilePath('plugin-workfromhome.db'), autoload: true });
            obj.filex.persistence.setAutocompactionInterval(40000);
            //obj.filex.ensureIndex({ fieldName: 'user' });
        }
        obj.file = new NEMongo(obj.filex);
        formatId = function(id) { return id; };
        obj.initFunctions();
    }
    
    return obj;
}