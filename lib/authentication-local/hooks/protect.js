'use strict';

var _require = require('lodash'),
    omit = _require.omit;

module.exports = function () {
  for (var _len = arguments.length, fields = Array(_len), _key = 0; _key < _len; _key++) {
    fields[_key] = arguments[_key];
  }

  return function protect(context) {
    var result = context.dispatch || context.result;
    var o = function o(current) {
      var data = typeof current.toJSON === 'function' ? current.toJSON() : current;
      return omit(data, fields);
    };

    if (!result) {
      return context;
    }

    if (Array.isArray(result)) {
      context.dispatch = result.map(o);
    } else if (result.data && context.method === 'find') {
      context.dispatch = Object.assign({}, result, {
        data: result.data.map(o)
      });
    } else {
      context.dispatch = o(result);
    }

    if (context.params && context.params.provider) {
      context.result = context.dispatch;
    }

    return context;
  };
};