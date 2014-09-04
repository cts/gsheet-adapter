var Util = require('cts/util');
var Model = require('cts/model');
var GSheetUtil = require('./gsheet-util');
var GColumnCellNode = require('./gcolumncell-node');

/** A Google Spreadsheets "Cell Row" Node.
 *
 */

var GColumnNode = function(value, columns, tree, opts) {
  opts = opts || {};
  this.initializeNodeBase(tree, opts);
  this.value = value;
  this.columnNum = null;
  this.columns = columns;
  this.ctsId = Util._.uniqueId().toString();
  this.kind = 'GColumn';
};

// ### Instance Methods
Util._.extend(GColumnNode.prototype, Model.Node.Base, Util.Events, {

  debugName: function() {
    return "GColumn";
  },

  getColNum: function() {
    return this.columnNum;
  },

  getWorksheetKey: function() {
    return this.parentNode.getWorksheetKey();
  },

  // Find alreays returns empty on a leaf.
  find: function(spec, ret) {
    spec = GSheetUtil.fixSpec(spec);
    if (typeof ret == 'undefined') {
      ret = [];
    }
    var kids = this.getChildren();
    if (spec.sheetSpec.row) {
      var row = parseInt(spec.sheetSpec.row);
      if (! isNaN(row)) {
        for (var i = 0; i < kids.length; i++) {
          if (kids[i].row == row) {
            ret.push(kids[i]);
          }
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
      this.children[i].updateIfComputed();
    }
  },

  _subclass_realizeChildren: function() {
    Util.Log.Debug("GColumn Realize Children");
     this.children = [];
     for (var rowName in this.columns) {
       var spec = this.columns[rowName];
       var child = new GColumnCellNode(rowName, spec, this.tree, this.opts);
       child.parentNode = this;
       this.children.push(child);
     }
     return Util.Promise.resolve();
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
     return null;
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

module.exports = GColumnNode;