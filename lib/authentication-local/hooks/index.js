'use strict';

var hashPassword = require('./hash-password');
var protect = require('./protect');

module.exports = {
  hashPassword: hashPassword,
  protect: protect
};