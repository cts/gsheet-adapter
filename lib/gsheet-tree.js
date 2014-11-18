var Util = require('cts/util');
var Model = require('cts/model');

// Constructor
// -----------
var GSpreadsheetTree = function(forrest, spec) {
  this.forrest = forrest;
  this.spec = spec;
  this.kind = 'gsheet';
  this.root = null;
  this.insertionListener = null;
};

// Instance Methods
// ----------------
Util._.extend(GSpreadsheetTree.prototype, Model.Tree.Base, {
  setRoot: function(node) {
    this.root = node;
    this.root.setProvenance(this);
  },

  find: function(spec) {
    if (spec.inline) {
      return [spec.inlineObject];
    } else {
      // This passes in the SPEC rather than the selector.
      var results = this.root.find(spec);
      return results;
    }
  },

  listenForNodeInsertions: function(new_val) {
  },

  open: function() {
    var base = 'https://docs.google.com/spreadsheets/d/';
    var url = base + this.spec.sskey;
    window.open(url);
  }
});

module.exports = GSpreadsheetTree;
