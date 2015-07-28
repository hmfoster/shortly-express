var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'preacalc wins',
  resave: false,
  saveUninitialized: true
}));

app.get('/', 
function(req, res) {
  res.render('index');
});

//takes you to link shortener--> How does this work?
app.get('/create', 
function(req, res) {
  res.render('index');
});

//dummy route for now
app.get('/login', 
  function(req, res){
    res.render('login');
  });

app.get('/signup', 
  function(req, res){
    res.render('signup');
  });

//renders a JSON array of shortened urls --> links.models
app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

//creates new shortened links
app.post('/links', 
function(req, res) {
  //gets the url attribute from body of request
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

//Connects link to link model, hooking up to the db
  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/login', function(req, res){
  //grab username and password from form field from request
  var username = req.body.username;
  var password = req.body.password;
  console.log("USERNAME", username);
  //check if username exists in users database
  if (util.isUserInDB(username)){ 
    //if yes, run entered password through bcrypt hash
    var hash = util.passHash(password);
    //check if that matches hashed password in db
    //select password column where username = username

    var userObj = Users.query(function(qb){
      qb.where('username','=',username).andWhere('password','=',hash);
    }).fetch();


    //yes? redirect to index page
    if (userObj){
        //start a new session
        req.session.regenerate(function(){
          req.session.user = userObj.username;
          res.redirect('index');
        });
        //grab links associated with that user to render to shortly page
    }
    else{
      //no? prompt that password is incorrect and redirect to login page
      console.log('Password rejected');
      res.redirect('login');
    }

  }else{
    //direct to signup page
    res.redirect('signup');
  }

});


app.post('/signup', function(req, res){
  //grab username and password from form field from request
  //check if username exists in users database
    //if exists:
      //return message that username is taken
      //redirect to sign-up
    //otherwise:
      //run password through hash
      //create new entry in users db with that username and hashed pw
      //redirect to login page
  
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
