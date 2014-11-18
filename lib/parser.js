var _rTree = /^\s*([A-Za-z0-9_\-])+\s*\|(.*)$/;
var _rWorksheet = /^\s*([a-zA-Z0-9_-]+)\s*\!(.*)$/;
var _rRows = /^\s*[Rr][Oo][Ww][Ss]\s*$/;
var _rCols = /^\s*[Cc][Oo][Ll][Ss]\s*$/;
var _rRow = /^\s*[Rr][Oo][Ww]\(([a-zA-Z0-9_\- \.:;,]+)\)\s*$/;
var _rCol = /^\s*[Cc][Oo][Ll]\(([a-zA-Z0-9_\- \.:;,]+)\)\s*$/;
var _rCell = /^\s*([A-Za-z]+)([0-9]+)\s*$/;

var Parser = {

  parseSelectionSpec: function(selectorString) {
    var s = selectorString.trim();
    var ret = {
      tree: null,
      worksheet: null,
      projection: null,
      row: null,
      col: null
    };
    var match;

    if (match = _rTree.exec(s)) {
      ret.tree = match[1];
      s = match[2];
    }

    // WORKSHEET PREFIX
    if (match = _rWorksheet.exec(s)) {
      // There's a worksheet string
      ret.worksheet = match[1];
      s = match[2];
    }

    if (match = _rRows.exec(s)) {
      ret.projection = 'Rows';
    } else if (match = _rCols.exec(s)) {
      ret.projection = 'Cols';
    } else if (match = _rRow.exec(s)) {
      ret.projection = "Rows";
      ret.row = match[1];
    } else if (match = _rCol.exec(s)) {
      ret.projection = "Cols";
      ret.col = match[1];
    } else if (match = _rCell.exec(s)) {
      ret.projection = "Cells";
      ret.col = match[1]; // A
      ret.row = match[2]; // 1
    }
    return ret;
  }

};

module.exports = Parser;