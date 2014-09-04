var Util = require('cts/util');
var Model = require('cts/model');
var GSheetUtil = require('./gsheet-util');
var GListFeedItemNode = require('./glistfeeditem-node');

/** A Google Spreadsheets "List Feed" Property Node.
 *
 * The LIST FEED represents the view of a Work Sheet that google considers to
 * be a list items, each with key-value pairs. This node represents one of
 * those ITEMS.
 */
var GListFeedNode = function(spec, tree, opts) {
  opts = opts || {};
  this.initializeNodeBase(tree, opts);
  this.spec = spec;
  this.ctsId = Util._.uniqueId().toString();
  this.kind = 'GListFeed';
  this.on('received-is', function() {
    this.value.trigger('cts-received-is');
  });
};

// ### Instance Methods
Util._.extend(GListFeedNode.prototype, Model.Node.Base, Util.Events, {

  debugName: function() {
    return this.kind;
  },

  // Find alreays returns empty on a leaf.
  find: function(spec, ret) {
    spec = GSheetUtil.fixSpec(spec);
    if (typeof ret == 'undefined') {
      ret = [];
    }
    if (spec.sheetSpec.col == null) {
      // They want the container!
      ret.push(this);
    } else {
      // They want a column for all rows
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].find(spec, ret);
      }
    }
    return ret;
  },

  getWorksheetKey: function() {
    return this.spec.wskey;
  },

  getSpreadsheetKey: function() {
    return this.spec.sskey;
  },

  isDescendantOf: function(other) {
    // This node is only below a worksheet or gsheet.
    var ret = false;
    if (this.parentNode != null) {
      if (other == this.parentNode) {
        ret =true;
      } else {
        ret = this.parentNode.isDescendantOf(other);
      }
    }
    return ret;
  },

  _subclass_realizeChildren: function() {
     var deferred = Util.Promise.defer();
     this.children = [];
     var self = this;
     GSheetUtil.getListFeed(this.spec.sskey, this.spec.wskey).then(
       function(gdata) {
         Util.Log.Debug("Got list feed worksheet", gdata);
         self.gdata = gdata;
         for (var i = 0; i < gdata.items.length; i++) {
           var item = gdata.items[i];
           var child = new GListFeedItemNode(item.title, item, self.tree, self.opts);
           child.parentNode = self;
           self.children.push(child);
         }
         Util.Log.Debug("Resolving Worksheet Kids");
         deferred.resolve();
       },
       function(reason) {
         Util.Log.Warn("ListFeed Load Rejected", reason);
         deferred.reject(reason);
       }
     );
     return deferred.promise;
   },

   _subclass_insertChild: function(child, afterIndex) {
     // Sure, no problem.
     // TODO: If the child has no spec, that means that we haven't inserted it yet.
     // Right now, this is because Graft will insert it with clone_after, but 
     // there might be other cases where we aren't in the middle of clone operation.
   },

   /*
    */
   _onChildInserted: function(child) {
     Util.Log.Error("onChildInserted called (impossibly) on GListFeed Node");
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
     var clone = new GListFeedNode(value, spec, this.tree, this.opts);
     // there are no children, so no need to do anything there.
     return Util.Promise.resolve(clone);
   },

  /************************************************************************
   **
   ** Required by Relation classes
   **
   ************************************************************************/

  getValue: function(opts) {
    // Returns the value as JSON.
    return Util._.map(this.children, function(child) {
      return child.getValue();
    });
  },

  setValue: function(value, opts) {
    Util.Log.Error("You can't set the value of a ListFeed node");
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

module.exports = GListFeedNode;
