// database libraries
var mysql = require('mysql');
var dbconfig = require('../config/database');

// set database to be used


module.exports = function(app, passport) {

  // app parameter functions

  app.param('mealid', function(req, res, next, id){

    var connection = mysql.createConnection(dbconfig.connection);
    connection.query('USE ' + dbconfig.database);
    connection.query("SELECT * FROM meals WHERE id = ?", [id], function(err, result){
      if(err) throw err;

      var meal = {};

      meal = result[0];

      req.meal = meal;
    });

    connection.end(function(err){
      if(err) throw err;
      next();
    })
  });


  // Home Page
  app.get('/', function(req, res) {
    res.render('index');
  });

  // Initial login page
  app.get('/login', function(req, res) {
    //render the page and pass any existing flash data
    res.render('login', { message: req.flash('loginMessage')});
  });

  // process the login form
  // note app.post, not app.get
  app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/profile',
    failureRedirect : '/login',
    failureFlash    : true
  }),
      function(req, res) {
        console.log("wow we made it this far");

        if (req.body.remember) {
          req.session.cookie.maxAge = 1000 * 60 * 10;
        } else {
          req.session.cookie.expires = false;
        }
      res.redirect('/');
  });

  app.get('/signup', function(req, res) {
    res.render('signup', { message: req.flash('signupMessage') });
  });

  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }));

  app.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile', {
      user : req.user
    });
  });

  app.get('/cook', isLoggedIn, function(req, res) {
    res.render('cook');
  });

  app.post('/cook', isLoggedIn, function(req, res) {

    var connection = mysql.createConnection(dbconfig.connection);
    connection.query('USE ' + dbconfig.database);

    var title = req.body.title;
    var price = req.body.price;
    var address = req.body.address;
    var datetime = req.body.mealdate + " " + req.body.mealtime + ":00";
    var userid  = req.user.id;

    if(title.length > 0 && title.length <= 30) {
      if(price > 0 && price < 1000) {
        if(address.length > 0 && address.length < 121) {
          var newMeal = {
            chefid: userid,
            price:  price,
            location: address,
            title:  title,
            eatby:  datetime
          }

          var insertQuery = "INSERT INTO " + dbconfig.meals_table + "(chefid, price, title, location, eatby) values (?,?,?,?,?)";
          var inserts = [ newMeal.chefid, newMeal.price, newMeal.title, newMeal.location, newMeal.eatby ];

          connection.query(insertQuery, inserts, function(err, result) {
            if(err) throw err;
          });
        }
      }
    }
    connection.end(function(err) {
      if(err) throw err;
      res.redirect('/myorders');
    });

  });

  // menu views, show available meals
  app.get('/menu', function(req, res) {

    var connection = mysql.createConnection(dbconfig.connection);
    connection.query('USE ' + dbconfig.database);

    var meals = {};

    connection.query("SELECT * FROM meals", function(err, result){
        if(err) throw err;

        for(var i = 0; i < result.length; i++){
          meals[result[i].id] = result[i];
        }
      });

    connection.end(function(err){
      if(err) throw err;
      res.render('menu', {meals: meals});
    })
  });

  app.get('/menu/:mealid', function(req, res) {
    res.render('meal', {meal: req.meal, user: req.user});
  });

  app.get('/myorders', isLoggedIn, function(req, res) {

    var connection = mysql.createConnection(dbconfig.connection);
    connection.query('USE ' + dbconfig.database);

    var userorders = {};

    var ordersQuery = "SELECT * FROM " + dbconfig.orders_table + " WHERE custid = ?";
    var mealsQuery = "SELECT * FROM " + dbconfig.meals_table + " WHERE mealid = ?";
    var userinsert = [req.user.id];
    var mealsarr = [];
    var meals = {};

    connection.query(ordersQuery, userinsert, function(err, result) {
      if(result){
        var lim = result.length;
        for(var i = 0; i < lim; i++){

          userorders[result[i].id] = {
            orderid: result[i].id,
            mealid: result[i].mealid,
            placed: result[i].placed,
          }
          mealsarr.pop(result[i].mealid);
        }
       }
    });

    connection.query("SELECT * FROM " + dbconfig.meals, function(err, result){
      if(result){
        for(var i = 0; i < result.length; i++){
          meals[result[i].id] = result[i];
        }
      }
    });

    connection.end(function(err){
      if(err) throw err;
      console.log('closing connection, about to log userorders and meals');
      console.log(userorders);
      console.log(meals);
      res.render('orders', {userorders: userorders, meals: meals});
    })
  });

  app.post('/myorders', isLoggedIn, function(req, res) {

    var connection = mysql.createConnection(dbconfig.connection);
    connection.query('USE ' + dbconfig.database);

    var mealid = parseInt(req.body.mealid);
    var custid = parseInt(req.body.custid);

    var insertQuery = "INSERT INTO " + dbconfig.orders_table +"(mealid, custid) values (?,?)";
    var checkQuery = "SELECT * FROM " + dbconfig.orders_table + " WHERE mealid = ? AND custid = ?";

    var inserts = [mealid, custid];

    console.log(mealid);
    console.log(custid);

    connection.query(insertQuery, inserts, function(err, results) {
      if(err) throw err;
      console.log('subquery ran');
    });

    connection.end(function(err){
      if(err) throw err;
      res.redirect('/myorders');
    });
  });


  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });


};

function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/login');
}
