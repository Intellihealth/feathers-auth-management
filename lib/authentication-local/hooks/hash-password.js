'use strict';

var hasher = require('../utils/hash');

var _require = require('lodash'),
    merge = _require.merge,
    get = _require.get,
    set = _require.set,
    cloneDeep = _require.cloneDeep;

var Debug = require('debug');

var debug = Debug('@feathersjs/authentication-local:hooks:hash-password');

module.exports = function hashPassword() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  return function (context) {
    if (context.type !== 'before') {
      return Promise.reject(new Error('The \'hashPassword\' hook should only be used as a \'before\' hook.'));
    }

    var app = context.app;
    var authOptions = app.get('authentication') || {};

    options = merge({ passwordField: 'password' }, authOptions.local, options);

    debug('Running hashPassword hook with options:', options);

    var field = options.passwordField;
    var hashPw = options.hash || hasher;

    if (typeof field !== 'string') {
      return Promise.reject(new Error('You must provide a \'passwordField\' in your authentication configuration or pass one explicitly'));
    }

    if (typeof hashPw !== 'function') {
      return Promise.reject(new Error('\'hash\' must be a function that takes a password and returns Promise that resolves with a hashed password.'));
    }

    if (context.data === undefined) {
      debug('hook.data is undefined. Skipping hashPassword hook.');
      return Promise.resolve(context);
    }

    var dataIsArray = Array.isArray(context.data);
    var data = dataIsArray ? context.data : [context.data];

    return Promise.all(data.map(function (item) {
      var password = get(item, field);
      if (password) {
        return hashPw(password).then(function (hashedPassword) {
          return set(cloneDeep(item), field, hashedPassword);
        });
      }

      return item;
    })).then(function (results) {
      context.data = dataIsArray ? results : results[0];

      return context;
    });
  };
};