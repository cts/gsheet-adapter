var Util = require('cts/util');
var GTree = require('./gsheet-tree');
var GSheetNode = require('./gspreadsheet-node');
var GSheetUtil = require('./gsheet-util');

var Factory = {
  GSpreadsheetTree: function(treespec, forrest) {
    var promise = Util.Promise.defer();
    // For the GSheet.
    // https://docs.google.com/spreadsheet/ccc?key=0Arj8lnBW4_tZdC1rVlAzQXFhWmFaLU1DY2RsMzVtUkE&usp=drive_web#gid=0
    if (treespec.url.indexOf('http') == 0) {
      var pat = "key=([^&]+)(&|$)";
      var match = treespec.url.match(pat);
      if (match && (match.length > 1)) {
        treespec.sskey = match[1];
      }
    } else {
      treespec.sskey = treespec.url;
    }

    Util.Log.Info("Trying to resolve GSheet Tree:", treespec.sskey);

    var buildOutTree = function() {
      var tree = new GTree(forrest, treespec);
      var ss = new GSheetNode(treespec, tree);
      var ws = false;
      if (typeof treespec.worksheet != 'undefined') {
        ws = true;
      }
      console.log("Trying to build out gsheet tree");
      ss.realizeChildren().then(
        function() {
          if (ws) {
            Util.Log.Info("Looking for worksheed named ", ws);
            var found = false;
            for (var i = 0; i < ss.children.length; i++) {
              var child = ss.children[i];
              if ((! found) && (child.name == treespec.worksheet)) {
                tree.root = child;
                found = true;
                if (treespec.receiveEvents) {
                  tree.toggleReceiveRelationEvents(true);
                }
                promise.resolve(tree);
              }
            }
            if (! found) {
              promise.reject("Couldn't find worksheet named: " + treespec.worksheet);
            }
          } else {
            tree.root = ss;
            promise.resolve(tree);
          }
        },
        function(reason) {
          console.log("couldn't realize");
          promise.reject(reason);
        }
      );
    };

    var maybeAutobind = function() {
      var d2 = Util.Promise.defer();
      if ((treespec.sskey == 'auto') && (treespec.name)) {
        GSheetUtil.autobindSheet(treespec.name).then(
          function(key) {
            console.log("Autobind: got", key);
            treespec.sskey = key;
            d2.resolve();
          },
          function(err) {
            d2.reject(err);
          }
        );
      } else {
        d2.resolve();
      }
      return d2;
    };

    if (GSheetUtil.specRequiresLogin(treespec)) {
      GSheetUtil.maybeLogin().then(
        function() {
          maybeAutobind().then(
            function() {
              buildOutTree();
            },
            function(err) {
              promise.reject(err);
            }
          );
        },
        function(reason) {
          Util.Log.Error("Couldn't Login to Google Spreadsheets", reason);
          promise.reject(reason);
        }
      );
    } else {
      console.log("GSheet don't log in");
      buildOutTree();
    }

    return promise;
  }
};

module.exports = Factory;

