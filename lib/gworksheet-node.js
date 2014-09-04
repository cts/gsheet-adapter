var Util = require('cts/util');
var Model = require('cts/model');
var GSheetUtil = require('./gsheet-util');
var GListFeedNode = require('./glistfeed-node');
var GCellFeedNode = require('./gcellfeed-node');

var GWorksheetNode = function(spec, tree, opts) {
  Util.Log.Debug("GWorksheet Constructor");
  opts = opts || {};
  this.initializeNodeBase(tree, opts);
  this.spec = spec;
  this.kind = "GWorksheet";
  this.name = spec.title;
  this.value = null;
  this.ctsId = Util._.uniqueId().toString();
  this.on('received-is', function() {
    this.value.trigger('cts-received-is');
  });
};

// ### Instance Methods
Util._.extend(GWorksheetNode.prototype, Model.Node.Base, Util.Events, {

  debugName: function() {
    return "GWorkSheet";
  },

  find: function(spec, ret) {
    spec = GSheetUtil.fixSpec(spec);
    if (typeof ret == 'undefined') {
      ret = [];
    }
    if ((spec.sheetSpec.projection == "Rows") || (spec.sheetSpec.projection == "Cols")) {
      for (var i = 0; i < this.children.length; i++) {
        if (this.children[i].kind == "GListFeed") {
          this.children[i].find(spec, ret);
        }
      }
    } else if (spec.sheetSpec.projection == "Cells") {
      for (var i = 0; i < this.children.length; i++) {
        if (this.children[i].kind == "GCellFeed") {
          this.children[i].find(spec, ret);
        }
      }
    } else {
      Util.Log.Warn("Worksheet not sure how to process this spec", this, spec);
    }
    return ret;
  },

  isDescendantOf: function(other) {
    if ((this.parentNode != null) && (other == this.parentNode)) {
      return true;
    }
    return false;
  },

  _subclass_realizeChildren: function() {
    Util.Log.Debug("Worksheet realize kids", this.spec);
    var lf = new GListFeedNode(this.spec, this.tree, this.opts);
    lf.parentNode = this;
    var cf = new GCellFeedNode(this.spec, this.tree, this.opts);
    cf.parentNode = this;
    this.children = [lf, cf];
    return Util.Promise.resolve();
  },

   /*
    * Inserts this DOM node after the child at the specified index.
    * It must be a new row node.
    */
   _subclass_insertChild: function(child, afterIndex) {
     // TODO: Figure out what to do.
   },

   /*
    */
   _onChildInserted: function(child) {
     // TODO: Figure out what to do.
   },

   /*
    *  Removes this Workbook from the GSheet
    */
   _subclass_destroy: function() {
   },

   _subclass_getInlineRelationSpecString: function() {
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
    return null;
  },

  setValue: function(value, opts) {
    // noop.
  },

  _subclass_ensure_childless: function() {
    // noop.
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

module.exports = GWorksheetNode;
