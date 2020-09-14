'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Debug = require('debug');
var bcrypt = require('bcrypt');

var _require = require('lodash'),
    get = _require.get,
    omit = _require.omit;

var debug = Debug('@feathersjs/authentication-local:verify');

var LocalVerifier = function () {
  function LocalVerifier(app) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, LocalVerifier);

    this.app = app;
    this.options = options;
    this.service = typeof options.service === 'string' ? app.service(options.service) : options.service;

    if (!this.service) {
      throw new Error('options.service does not exist.\n\tMake sure you are passing a valid service path or service instance and it is initialized before @feathersjs/authentication-local.');
    }

    this._comparePassword = this._comparePassword.bind(this);
    this._normalizeResult = this._normalizeResult.bind(this);
    this.verify = this.verify.bind(this);
  }

  _createClass(LocalVerifier, [{
    key: '_comparePassword',
    value: function _comparePassword(entity, password) {
      // select entity password field - take entityPasswordField over passwordField
      var passwordField = this.options.entityPasswordField || this.options.passwordField;

      // find password in entity, this allows for dot notation
      var hash = get(entity, passwordField);

      if (!hash) {
        return Promise.reject(new Error('\'' + this.options.entity + '\' record in the database is missing a \'' + passwordField + '\''));
      }

      debug('Verifying password');

      return new Promise(function (resolve, reject) {
        bcrypt.compare(password, hash, function (error, result) {
          // Handle 500 server error.
          if (error) {
            return reject(error);
          }

          if (!result) {
            debug('Password incorrect');
            return reject(false); // eslint-disable-line
          }

          debug('Password correct');
          return resolve(entity);
        });
      });
    }
  }, {
    key: '_normalizeResult',
    value: function _normalizeResult(results) {
      // Paginated services return the array of results in the data attribute.
      var entities = results.data ? results.data : results;
      var entity = entities[0];

      // Handle bad username.
      if (!entity) {
        return Promise.reject(false); // eslint-disable-line
      }

      debug(this.options.entity + ' found');
      return Promise.resolve(entity);
    }
  }, {
    key: 'verify',
    value: function verify(req, username, password, done) {
      var _query,
          _this = this;

      debug('Checking credentials', username, password);

      var id = this.service.id;
      var usernameField = this.options.entityUsernameField || this.options.usernameField;
      var params = Object.assign({
        'query': (_query = {}, _defineProperty(_query, usernameField, username), _defineProperty(_query, '$limit', 1), _query)
      }, omit(req.params, 'query', 'provider', 'headers', 'session', 'cookies'));

      if (id === null || id === undefined) {
        debug('failed: the service.id was not set');
        return done(new Error('the `id` property must be set on the entity service for authentication'));
      }

      // Look up the entity
      this.service.find(params).then(function (response) {
        var results = response.data || response;
        if (!results.length) {
          debug('a record with ' + usernameField + ' of \'' + username + '\' did not exist');
        }
        return _this._normalizeResult(response);
      }).then(function (entity) {
        return _this._comparePassword(entity, password);
      }).then(function (entity) {
        var id = entity[_this.service.id];
        var payload = _defineProperty({}, _this.options.entity + 'Id', id);
        done(null, entity, payload);
      }).catch(function (error) {
        return error ? done(error) : done(null, error, { message: 'Invalid login' });
      });
    }
  }]);

  return LocalVerifier;
}();

module.exports = LocalVerifier;