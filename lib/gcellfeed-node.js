var Util = require('cts/util');
var Model = require('cts/model');
var GSheetUtil = require('./gsheet-util');
var GColumnNode = require('./gcolumn-node');

/** A Google Spreadsheets "List Feed" Property Node.
 *
 * The LIST FEED represents the view of a Work Sheet that google considers to
 * be a list items, each with key-value pairs. This node represents one of
 * those ITEMS.
 */
var GCellFeedNode = function(spec, tree, opts) {
  opts = opts || {};
  this.initializeNodeBase(tree, opts);
  this.spec = spec;
  this.ctsId = Util._.uniqueId().toString();
  this.kind = 'GCellFeed';
  this.on('received-is', function() {
    this.value.trigger('cts-received-is');
  });
};

// ### Instance Methods
Util._.extend(GCellFeedNode.prototype, Model.Node.Base, Util.Events, {

  debugName: function() {
    return this.kind;
  },

  getWorksheetKey: function() {
    return this.spec.wskey;
  },

  getSpreadsheetKey: function() {
    return this.spec.sskey;
  },

  // Find alreays returns empty on a leaf.
  find: function(spec, ret) {
    spec = GSheetUtil.fixSpec(spec);
    if (typeof ret == 'undefined') {
      ret = [];
    }
    var kids = this.getChildren();
    if (spec.sheetSpec.row && spec.sheetSpec.col) {
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].value == spec.sheetSpec.col) {
          kids[i].find(spec, ret);
        }
      }
    }
    return ret;
  },

  isDescendantOf: function(other) {
    // This node is only below a worksheet or gsheet.
    if (this.parentNode != null) {
      if (other == this.parentNode) {
        return true;
      } else {
        return this.parentNode.isDescendantOf(other);
      }
    }
    return false;
  },

  updateComputedNodes: function() {
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].updateComputedNodes();
    }
  },

  _subclass_realizeChildren: function() {
     var deferred = Util.Promise.defer();
     this.children = [];
     var self = this;
     GSheetUtil.getCellFeed(this.spec.sskey, this.spec.wskey).then(
       function(gdata) {
         Util.Log.Debug("Got cell feed worksheet", gdata);
         self.gdata = gdata;

         for (var rowName in gdata.rows) {
           var columns = gdata.rows[rowName];
           var child = new GColumnNode(rowName, columns, self.tree, self.opts);
           child.parentNode = self;
           self.children.push(child);
         }
         Util.Log.Debug("Resolving Worksheet Kids");
         deferred.resolve();
       },
       function(reason) {
         Util.Log.Warn("CellFeed Load Rejected", reason);
         deferred.reject(reason);
       }
     );
     return deferred.promise;
   },

   _subclass_insertChild: function(child, afterIndex) {
     Util.Log.Error("insertChild called (impossibly) on GListFeedItem");
   },

   /*
    */
   _onChildInserted: function(child) {
     Util.Log.Error("onChildInserted called (impossibly) on GListFeedItem Node");
   },

   /*
    *  Removes this Workbook from the GSheet
    */
   _subclass_destroy: function() {
     // TODO: Delete item from sheet
   },

   _subclass_getInlineRelationSpecString: function() {a
     return null;
   },

   _subclass_beginClone: function(node) {
     var value = this.value;
     // TODO: Need to generate a NEW id for insertion. And beginClone here
     // will neeed to be deferred!
     var spec = this.spec;
     var clone = new GCellFeedNode(spec, this.tree, this.opts);
     // there are no children, so no need to do anything there.
     return Util.Promise.resolve(clone);
   },

  /************************************************************************
   **
   ** Required by Relation classes
   **
   ************************************************************************/

  getValue: function(opts) {
    return null; // no value.
  },

  setValue: function(value, opts) {
    // noop.
  },

  _subclass_ensure_childless: function() {
  },

  /************************************************************************
   **
   ** Utility Helpers
   **
   ************************************************************************/

  _subclass_onDataEvent: function(eventName, handler) {
  },

  _subclass_offDataEvent: function(eventName, handler) {
  },

  _subclass_valueChangedListener: function(evt) {
  }

});

module.exports = GCellFeedNode;
