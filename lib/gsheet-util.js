var Util = require('cts/util');
var Parser = require('cts/parser');
var SheetParser = require("./parser");

var GSheetUtil = {

  fixSpec: function(spec) {
    if (typeof spec == 'string') {
      specString = spec;
      spec = new Parser.SelectionSpec('', specString);
    }

    // Now parse
    if (typeof spec.sheetSpec == 'undefined') {
      spec.sheetSpec = SheetParser.parseSelectionSpec(spec.selectorString);
      // worksheet, projection, row, col
    }

    return spec;
  },

  /*
   * Args:
   *   feed: list (objects) | cells (table)
   *   key: spreadsheet key
   *   worksheet: worksheet name or identifier
   *   security: public | private
   *   mode: full | basic
   *   json: false | true
   *   accessToken: false | true
   *
   *  "od6" is the worksheet id for the default.
   */
  _gSheetUrl: function(feed, key, worksheet, security, mode, cell, jsonCallback, accessToken) {
    var url = "https://spreadsheets.google.com/feeds/";
    if (feed != null) {
      url = (url + feed + "/");
    }
    if (key != null) {
      if (key == 'autobind') {
        url = (url + key + "/");
      } else {
        url = (url + key + "/");        
      }
    }
    if (worksheet != null) {
      url += (worksheet + "/")
    }
    url += security + "/" + mode;
    if (cell != null) {
      url += ('/' + cell)
    }
    if (jsonCallback) {
      url += "?alt=json-in-script&callback=CALLBACK";
    }
    return url;
  },

  specRequiresLogin: function(spec) {
    if (spec.mock) {
      return false;
    }
    if ((spec.opts.read && (spec.opts.read != 'public')) ||
        (spec.opts.write && (spec.opts.write != 'public'))) {
      Util.Log.Info('GSheet Spec requires login', spec);
      return true;
    } else {
      if (spec.sskey == 'auto') {
        Util.Log.Info('GSheet Spec requires login because of autobind', spec);
        return true;
      } else {
        Util.Log.Info('GSheet Spec does not require login', spec);
        return false;        
      }
    }
  },

  cellAddressRegex: /^([A-Z]+)([0-9]+)$/,

  getCellAddressParts: function(s) {
    var matched = s.trim().match(GSheetUtil.cellAddressRegex);
    if ((! matched) || (matched.length < 3)) {
      return null;
    }
    return [matched[1], matched[2]];
  },

  maybeLogin: function() {
    if (this._currentToken == null) {
      return CTS.engine.server.login();
    } else {
      return CTS.engine.server._loginDeferred.promise;
    }
  },

  createSpreadsheet: function(title) {
    var url = "https://www.googleapis.com/drive/v2/files";
    var promise = Util.Promise.defer;
    var boundary = '-------314159265358979323846';
    var delimiter = "\r\n--" + boundary + "\r\n";
    var close_delim = "\r\n--" + boundary + "--";
    var contentType = 'application/vnd.google-apps.spreadsheet';
    var metadata = {
      'title': title,
      'mimeType': contentType
    };
    var csvBody = '';
    var base64Data = btoa(csvBody);
    var multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + contentType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n' +
      '\r\n' +
      base64Data +
      close_delim;

    var request = gapi.client.request({
      'path': '/upload/drive/v2/files',
      'method': 'POST',
      'params': {'uploadType': 'multipart'},
      'headers': {
        'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
      },
      'body': multipartRequestBody});
    request.execute(function(resp) {
      if (typeof resp.error != 'undefined') {
        Util.Log.Error('create error', resp.error);
        promise.reject(resp.error);
      } else {
        promise.resolve(resp);
      }
    });
    return promise;
  },

  makeProxyUrl: function(url) {
    return 'api/gdoc/' + url;
  },

  autobindSheet: function(label) {
    var promise = Util.Promise.defer();
    var request = CTS.engine.server.request('api/app/autobind', {
      dataType: 'json',
      type: 'POST',
      data: {
        label: label
      }
    });
    request.done(function(json) {
      if (json.error) {
        promise.reject(deferred.error);
      } else {
        promise.resolve(json.key);
      }
    });
    request.fail(function(jqxhr, textstatus) {
      promise.reject(textstatus);
    });
    return promise;
  },

  getSpreadsheets: function() {
    var promise = Util.Promise.defer();
    var url = GSheetUtil._gSheetUrl(
        'spreadsheets', null, null, GSheetUtil.getSecurityLevel(), 'full', null, true, true);
    var request = CTS.engine.server.request('api/app/gsheet', {
      dataType: "json",
      type: 'POST',
      data: {
        verb: 'GET',
        url: url
      }
    });

    request.done(function(json) {
      var ret = [];
      for (var i = 0; i < json.feed.entry.length; i++) {
        var sheet = json.feed.entry[i];
        var title = GSheetUtil._parseGItem(sheet.title);
        var id = GSheetUtil._parseGItem(sheet.id);
        var spec = {
          title: title,
          id: id
        };
        var parts = spec.id.split('/');
        spec['key'] = parts[parts.length - 1];
        ret.push(spec);
      }
      promise.resolve(ret);
    });
    request.fail(function(jqxhr, textStatus) {
      promise.reject(textStatus);
    });

    return promise;
  },

  getWorksheets: function(key) {
    var promise = Util.Promise.defer();
    var url = GSheetUtil._gSheetUrl('worksheets', key, null, GSheetUtil.getSecurityLevel(), 'full', null, true, true);
    var request = CTS.engine.server.request('api/app/gsheet', {
      dataType: "json",
      type: 'POST',
      data: {
        verb: 'GET',
        url: url
      }
    });

    request.done(function(json) {
      var ret = [];
      if (json.feed && json.feed.entry) {
        for (var i = 0; i < json.feed.entry.length; i++) {
          var worksheet = json.feed.entry[i];
          var spec = {
            kind: 'worksheet',
            title: GSheetUtil._parseGItem(worksheet.title),
            id: GSheetUtil._parseGItem(worksheet.id),
            colCount: parseInt(GSheetUtil._parseGItem(worksheet['gs$colCount'])),
            rowCount: parseInt(GSheetUtil._parseGItem(worksheet['gs$rowCount'])),
            updated: GSheetUtil._parseGItem(worksheet.updated)
          };
          var parts = spec.id.split('/');
          spec['wskey'] = parts[parts.length - 1];
          spec['sskey'] = key;
          ret.push(spec);
        }
      }
      promise.resolve(ret);
    });

    request.fail(function(jqxhr, textStatus) {
      promise.reject([jqxhr, textStatus]);
    });

    return promise;
  },

  _parseGItem: function(item) {
    return item['$t'];
  },

  _getItemData: function(entry) {
    var data = {};
    for (var key in entry) {
      if ((key.length > 4) && (key.substring(0,4) == 'gsx$')) {
        var k = key.substring(4);
        data[k] = GSheetUtil._parseGItem(entry[key]);
      }
    }
    return data;
  },

  _getItemSpec: function(entry, sskey, wskey) {
    var itemSpec = {
      title: GSheetUtil._parseGItem(entry.title),
      id: GSheetUtil._parseGItem(entry.id),
      data: GSheetUtil._getItemData(entry),
      editLink: entry.link[1].href,
      json: entry
    };
    if (sskey) {
      itemSpec.sskey = sskey;
    }
    if (wskey) {
      itemSpec.wskey = wskey;
    }

    // Fix the edit link to remove the trailing version, which appears to be
    // causing problems.
    if (itemSpec.editLink.indexOf(itemSpec.id) != -1) {
      itemSpec.editLink = itemSpec.id;
    }
    return itemSpec;
  },

  getListFeed: function(spreadsheetKey, worksheetKey) {
    var promise = Util.Promise.defer();
    var url = GSheetUtil._gSheetUrl('list', spreadsheetKey, worksheetKey, GSheetUtil.getSecurityLevel(), 'full', null, true, true);
    var request = CTS.engine.server.request('api/app/gsheet', {
      dataType: "json",
      type: 'POST',
      data: {
        verb: 'GET',
        url: url
      }
    });

    request.done(function(json) {
      if (typeof json == 'string') {
        json = JSON.parse(json);
      }
      var spec = {};
      spec.title = GSheetUtil._parseGItem(json.feed.title);
      spec.updated = GSheetUtil._parseGItem(json.feed.updated);
      spec.id = GSheetUtil._parseGItem(json.feed.id);
      spec.items = [];
      if (typeof json.feed.entry != 'undefined') {
        for (var i = 0; i < json.feed.entry.length; i++) {
          var itemSpec = GSheetUtil._getItemSpec(json.feed.entry[i]);
          spec.items.push(itemSpec);
        }
      }
      promise.resolve(spec);
    });

    request.fail(function(jqxhr, textStatus) {
      Util.Log.Error(jqxhr, textStatus);
      promise.reject(textStatus);
    });

    return promise;
  },

  getCellFeed: function(spreadsheetKey, worksheetKey) {
    var promise = Util.Promise.defer();
    var url = GSheetUtil._gSheetUrl('cells', spreadsheetKey, worksheetKey, GSheetUtil.getSecurityLevel(), 'full', null, true, true);
    var request = CTS.engine.server.request('api/app/gsheet', {
      dataType: "json",
      type: 'POST',
      data: {
        verb: 'GET',
        url: url
      }
    });

    request.done(function(json) {
      if (typeof json == 'string') {
        json = JSON.parse(json);
      }
      var spec = {};
      spec.title = GSheetUtil._parseGItem(json.feed.title);
      spec.updated = GSheetUtil._parseGItem(json.feed.updated);
      spec.id = GSheetUtil._parseGItem(json.feed.id);
      spec.rows = {};

      if (json.feed.entry) {
        for (var i = 0; i < json.feed.entry.length; i++) {
          var cell = GSheetUtil._parseGItem(json.feed.entry[i].title);
          var content = GSheetUtil._parseGItem(json.feed.entry[i].content);
          var letterIdx = 0;
          // This might be a formula!
          var inputValue = json.feed.entry[i]['gs$cell'].inputValue;
          while (isNaN(parseInt(cell[letterIdx]))) {
            letterIdx++;
          }
          var row = cell.slice(0, letterIdx);
          var col = parseInt(cell.slice(letterIdx));
          var colNum = parseInt(json.feed.entry[i]['gs$cell']['col'])

          if (typeof spec.rows[row] == "undefined") {
            spec.rows[row] = {};
          }
          spec.rows[row][col] = {
            content: content,
            colNum: colNum,
            inputValue: inputValue,
            isComputed: (inputValue != content)
          };
        }
      }
      promise.resolve(spec);
    });

    request.fail(function(jqxhr, textStatus) {
      Util.Log.Error(jqxhr, textStatus);
      promise.reject(textStatus);
    });

    return promise;
  },

  getCell: function(spreadsheetKey, worksheetKey, row, col) {
    var promise = Util.Promise.defer();
    var url = GSheetUtil._gSheetUrl('cells', spreadsheetKey, worksheetKey, GSheetUtil.getSecurityLevel(), 'full', null, true, true);
    url = url + '&min-row=' + row + '&max-row=' + row + '&min-col=' + col + '&max-col=' + col;
    var request = CTS.engine.server.request('api/app/gsheet', {
      dataType: "json",
      type: 'POST',
      data: {
        verb: 'GET',
        url: url
      }
    });

    request.done(function(json) {
      if (typeof json == 'string') {
        json = JSON.parse(json);
      }
      if ((typeof json.feed.entry != 'undefined') && (json.feed.entry.length == 1)) {
        promise.resolve(GSheetUtil._parseGItem(json.feed.entry[0].content));
      } else {
        promise.reject("Cell entry didn't return");
      }
    });
    request.fail(function(jqxhr, textStatus) {
      Util.Log.Error(jqxhr, textStatus);
      promise.reject(textStatus);
    });

    return promise;
  },

  modifyCell: function(ssKey, wsKey, rowNum, colNum, value) {
    var promise = Util.Promise.defer();

    var cell = 'R' + rowNum + 'C' + colNum;
    var url = GSheetUtil._gSheetUrl('cells', ssKey, wsKey, GSheetUtil.getSecurityLevel(), 'full', cell, false, true);
    url = url + '?alt=json';
    var cellurl = "https://spreadsheets.google.com/feeds/cells/" +
      ssKey + "/" + wsKey + "/" + GSheetUtil.getSecurityLevel() + "/full/" + cell;

    var xmlBody = "<?xml version='1.0' ?>";
    xmlBody += '<entry xmlns="http://www.w3.org/2005/Atom"';
    xmlBody += ' xmlns:gs="http://schemas.google.com/spreadsheets/2006">\n';
    xmlBody += '\t<id>' + cellurl + '</id>\n';
    xmlBody += '\t<link rel="edit" type="application/atom+xml" ';
    xmlBody += 'href="' + cellurl + '" />\n';
    xmlBody += '\t<gs:cell row="' + rowNum + '" col="' + colNum + '" ';
    xmlBody += 'inputValue="' + value + '"/>\n</entry>';

    var request = CTS.engine.server.request('api/app/gsheet', {
      type: 'POST',
      dataType: "json",
      // headers: {
      //   'GData-Version': '3.0',
      //   'If-Match': '*'
      // },
      data: {
        verb: 'PUT',
        contentType: 'application/atom+xml',
        ifMatch: '*',
        url: url,
        body: xmlBody
      }
    });

    request.done(function(json) {
      if (typeof json == 'string') {
        json = JSON.parse(json);
      }
      promise.resolve();
    });
    request.fail(function(jqxhr, textStatus) {
      Util.Log.Error(jqxhr, textStatus);
      promise.reject(textStatus);
    });

    return promise;
  },

  modifyListItem: function(ssKey, wsKey, itemNode) {
    console.log("Modify List Item");
    var promise = Util.Promise.defer();
    var url = itemNode.spec.editLink + '?alt=json';

    var xmlBody = "<?xml version='1.0' ?>";
    xmlBody += '<entry xmlns="http://www.w3.org/2005/Atom"';
    xmlBody += ' xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">\n';
    xmlBody += '\t<link rel="edit" type="application/atom+xml" ';
    xmlBody += 'href="' + itemNode.spec.editLink + '" />\n';
    xmlBody += '\t<id>' + itemNode.getItemId() + '</id>\n';
    for (var i = 0; i < itemNode.children.length; i++) {
      var child = itemNode.children[i];
      xmlBody += '\t<gsx:' + child.key + '>' + child.value + '</gsx:' + child.key + '>\n'
    }
    xmlBody += '</entry>';

    var request = CTS.engine.server.request('api/app/gsheet', {
      type: 'POST',
      // headers: {
      //   'GData-Version': '3.0',
      //   'If-Match': '*'
      // },
      data: {
        verb: 'PUT',
        url: url,
        contentType: 'application/atom+xml',
        ifMatch: '*',
        body: xmlBody
      }
    });

    request.done(function(json) {
      if (typeof json == 'string') {
        json = JSON.parse(json);
      }
      promise.resolve();
    });
    request.fail(function(jqxhr, textStatus) {
      Util.Log.Error(jqxhr, textStatus);
      promise.reject(textStatus);
    });

    return promise;
  },

  getSecurityLevel: function() {
    return 'private';
  },

  cloneListItem: function(ssKey, wsKey, itemNode) {
    var promise = Util.Promise.defer();

    var url = "https://spreadsheets.google.com/feeds/list/" + ssKey +
          "/" + wsKey + "/" + GSheetUtil.getSecurityLevel() + "/full?alt=json";

    var xmlBody = "<?xml version='1.0' ?>";
    xmlBody += '<entry xmlns="http://www.w3.org/2005/Atom"';
    xmlBody += ' xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">\n';
    for (var i = 0; i < itemNode.children.length; i++) {
      var child = itemNode.children[i];
      var value = child.value;
      var key = child.key;

      // XXX TEMPORARY FIX FOR BOOLEAN DEFAULTING!
      if ((value == true) || (value == "TRUE") || (value == "True") || (value == "true")) {
        key = false;
      }

      xmlBody += '\t<gsx:' + child.key + '>' + child.value + '</gsx:' + child.key + '>\n'
    }
    xmlBody += '</entry>';

    var request = CTS.engine.server.request('api/app/gsheet', {
      type: 'POST',
      headers: {
        'GData-Version': '3.0'
      },
      data: {
        verb: 'POST',
        contentType: 'application/atom+xml',
        url: url,
        body: xmlBody
      }
    }); 

    request.done(function(json) {
      console.log("Clone push success");
      if (typeof json == 'string') {
        json = JSON.parse(json);
      }
      var itemSpec = GSheetUtil._getItemSpec(json.entry, ssKey, wsKey);
      promise.resolve(itemSpec);
    });
    request.fail(function(jqxhr, textStatus) {
      console.log("Clone push fail");
      Util.Log.Error(jqxhr, textStatus);
      promise.reject(textStatus);
    });

    return promise;
  }
};

module.exports = GSheetUtil;