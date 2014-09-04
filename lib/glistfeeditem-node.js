var Util = require('cts/util');
var Model = require('cts/model');
var GSheetUtil = require('./gsheet-util');
var GListFeedPropertyNode = require('./glistfeedproperty-node');

/** A Google Spreadsheets "List Feed" Property Node.
 *
 * The LIST FEED represents the view of a Work Sheet that google considers to
 * be a list items, each with key-value pairs. This node represents one of
 * those ITEMS.
 *
 */

var GListFeedItemNode = function(value, spec, tree, opts) {
  opts = opts || {};
  this.initializeNodeBase(tree, opts);
  this.value = value;
  this.specDuringClone = null;
  this.spec = spec;
  this.ctsId = Util._.uniqueId().toString();
  this.kind = 'GListFeedItem';
  this.on('received-is', function() {
    this.value.trigger('cts-received-is');
  });
};

// ### Instance Methods
Util._.extend(GListFeedItemNode.prototype, Model.Node.Base, Util.Events, {

  debugName: function() {
    return "GListFeedItem";
  },

  // Find alreays returns empty on a leaf.
  find: function(spec, ret) {
    spec = GSheetUtil.fixSpec(spec);
    if (typeof ret == 'undefined') {
      ret = [];
    }

    if (spec.sheetSpec.col) {
      for (var i = 0; i < this.children.length; i++) {
        if (this.children[i].key == spec.sheetSpec.col) {
          ret.push(this.children[i]);
        }
      }
    }

    return ret;
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

  getItemId: function() {
    return this.spec.id;
  },

  getWorksheetKey: function() {
    if ((this.spec) && (this.spec.wskey)) {
      return this.spec.wskey;
    } else if ((this.specDuringClone) && (this.specDuringClone.wskey)) {
      return this.specDuringClone.wskey;
    } else {
     return this.parentNode.getWorksheetKey();
   }
  },

  getSpreadsheetKey: function() {
    if (this.spec && this.spec.sskey) {
      return this.spec.sskey;
    } else if (this.specDuringClone && this.specDuringClone.sskey) {
      return this.specDuringClone.sskey;
    } else {
      return this.parentNode.getSpreadsheetKey();
    }
  },

  _subclass_realizeChildren: function() {
     this.children = [];
     for (var key in this.spec.data) {
       var value = this.spec.data[key];
       var child = new GListFeedPropertyNode(key, value, this.tree, this.opts);
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

   _subclass_getInlineRelationSpecString: function() {
     return null;
   },

   _subclass_beginClone: function() {
     var d = Util.Promise.defer();
     var value = this.value;
     var clone = new GListFeedItemNode(this.value, this.spec, this.tree, this.opts);
     clone.realizeChildren().then(
       function() {
         console.log("Realized children");
         // Important: we use the spec to build out the clone, but then we have to 
         // remove it. Otherwise modifications to this node will save to the wrong row.
         // In the spreadsheet. The _endClone method will give this node its own spec.
         clone.specDuringClone = clone.spec;
         clone.spec = null;
         d.resolve(clone);
       },
       function(reason) {
         d.reject(reason);
       }
     );
     return d.promise;
   },

   _subclass_endClone: function() {
     var d = Util.Promise.defer();
     var value = this.value;
     var self = this;
     console.log("Cloning list feed item");
     GSheetUtil.cloneListItem(
       self.getSpreadsheetKey(), self.getWorksheetKey(), self).then(
         function(spec) {
           console.log("Got spec for new list feed item", spec);
           self.spec = spec;
           self.specDuringClone = null;
           d.resolve(self);
         },
         function(reason) {
           Util.Log.Error('could not clone', reason);
           d.reject(reason);
         }
    );
    return d.promise;
  },

  /************************************************************************
   **
   ** Required by Relation classes
   **
   ************************************************************************/

  getValue: function(opts) {
    var ret = {};
    Util._.each(this.children, function(child) {
      ret[child.key] = child.value;
    });
    return ret;
  },

  setValue: function(value, opts) {
    Util.Log.Error("You can't set the value of a ListFeedItem node");
  },

  _saveUpdates: function() {
    if (this.spec) {
      var sskey = this.getSpreadsheetKey();
      var wskey = this.getWorksheetKey();
      return GSheetUtil.modifyListItem(
        this.getSpreadsheetKey(),
        this.getWorksheetKey(),
        this);      
    } else {
      Util.Log.Info("No spec so fake saving");
      return Util.Promise.resolve();
    }
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

module.exports = GListFeedItemNode;
