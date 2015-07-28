var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var util = require('../../lib/utility');

//how to encrypt password using bcrypt
var User = db.Model.extend({
  // on create, we need to set table name, maybe hasTimestamp
  tableName: 'users',

  // function to connect to its links as a one to many relationship
  links: function() {
    return this.hasMany(Link);
  },
  // initialize should somehow use bcrypt
  initialize: function() {
    this.on('creating', function(model, attr){
      // bcrypt should make a hash for the user's password attribute
      // set the user's password to this new encrypted hash
      model.set('password', util.passHash(model.get('password')));
    });
  },

  comparePass: function(pass) {
    bcrypt.compare(pass, this.get('password'), function(err, res) {
      if (err) {
        console.log(err);
      }
      return res;
    });
  }
});

module.exports = User;