var Util = require('cts/util');
var Model = require('cts/model');
var GSheetUtil = require('./gsheet-util');
var GWorksheetNode = require('./gworksheet-node');

var GSpreadsheetNode = function(spec, tree, opts) {
  opts = opts || {};
  this.initializeNodeBase(tree, opts);
  this.spec = spec;
  this.kind = "GSpreadsheet";
  this.value = null;
  this.ctsId = Util._.uniqueId().toString();
  this.on('received-is', function() {
    this.value.trigger('cts-received-is');
  });
};

// ### Instance Methods
Util._.extend(GSpreadsheetNode.prototype, Model.Node.Base, Util.Events, {

  debugName: function() {
    return "GSpreadsheet";
  },

  find: function(spec, ret) {
    spec = GSheetUtil.fixSpec(spec);
    if (typeof ret == 'undefined') {
      ret = [];
    }
    var kids = this.getChildren();
    for (var i = 0; i < kids.length; i++) {
      var kid = kids[i];
      if ((! spec.sheetSpec.worksheet) || (kid.name == spec.sheetSpec.worksheet)) {
        kid.find(spec, ret);
      }
    }
    return ret;
  },

  isDescendantOf: function(other) {
    false;
  },

  _subclass_realizeChildren: function() {
     var deferred = Util.Promise.defer();
     this.children = [];
     var self = this;
     GSheetUtil.getWorksheets(this.spec.sskey).then(
       function(gdata) {
         self.gdata = gdata;
         for (var i = 0; i < gdata.length; i++) {
           var item = gdata[i];
           var child = new GWorksheetNode(item, self.tree, self.opts);
           child.parentNode = self;
           self.children.push(child);
         }
         deferred.resolve();
       },
       function(reason) {
         deferred.reject(reason);
       }
     );
     return deferred.promise;
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

module.exports = GSpreadsheetNode;
