'use strict';

var Debug = require('debug');

var _require = require('lodash'),
    merge = _require.merge,
    omit = _require.omit,
    pick = _require.pick;

var hooks = require('./hooks');
var DefaultVerifier = require('./verifier');

var passportLocal = require('passport-local');

var debug = Debug('@feathersjs/authentication-local');
var defaults = {
  name: 'local',
  usernameField: 'email',
  passwordField: 'password'
};

var KEYS = ['entity', 'service', 'passReqToCallback', 'session'];

function init() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  return function localAuth() {
    var app = this;
    var _super = app.setup;

    if (!app.passport) {
      throw new Error('Can not find app.passport. Did you initialize feathers-authentication before @feathersjs/authentication-local?');
    }

    var name = options.name || defaults.name;
    var authOptions = app.get('authentication') || {};
    var localOptions = authOptions[name] || {};

    // NOTE (EK): Pull from global auth config to support legacy auth for an easier transition.
    var localSettings = merge({}, defaults, pick(authOptions, KEYS), localOptions, omit(options, ['Verifier']));
    var Verifier = DefaultVerifier;

    if (options.Verifier) {
      Verifier = options.Verifier;
    }

    app.setup = function () {
      var result = _super.apply(this, arguments);
      var verifier = new Verifier(app, localSettings);

      if (!verifier.verify) {
        throw new Error('Your verifier must implement a \'verify\' function. It should have the same signature as a local passport verify callback.');
      }

      // Register 'local' strategy with passport
      debug('Registering local authentication strategy with options:', localSettings);
      app.passport.use(localSettings.name, new passportLocal.Strategy(localSettings, verifier.verify.bind(verifier)));
      app.passport.options(localSettings.name, localSettings);

      return result;
    };
  };
}

module.exports = init;

// Exposed Modules
Object.assign(module.exports, {
  default: init,
  defaults: defaults,
  hooks: hooks,
  Verifier: DefaultVerifier
});