// **********************************
// -----IMPORT DEPENDENCIES HERE-----
// **********************************
const client_id = 'c982daaa2a9543e181f3411ed630bc43';
const client_secret = '1cac4bc9ab0b42259e9e33c66e771df4';
const redirect_uri = 'localhost:3000/home';
const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.

// **********************************
// -----CONNECT TO DATABASE (DB)-----
// **********************************

// database configuration
const dbConfig = {
    host: 'db', // the database server
    port: 5432, // the database port
    database: process.env.POSTGRES_DB, // the database name
    user: process.env.POSTGRES_USER, // the user account to connect with
    password: process.env.POSTGRES_PASSWORD, // the password of the user account
  };

const db = pgp(dbConfig);

// test your database
db.connect()
.then(obj => {
  console.log('Database connection successful'); // you can view this message in the docker compose logs
  obj.done(); // success, release the connection;
})
.catch(error => {
  console.log('ERROR:', error.message || error);
});


// **********************************
// -----APP SETTINGS-----
// **********************************

app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);


// **********************************
// -----API ROUTES-----
// **********************************
//the home and extras pages should only be displayed if the user is logged in
//to do this we need to check if the user is logged in before displaying the page

//for the home page
app.get('/home', (req, res) => {
  if (req.session.user) {
    res.render('pages/home.ejs');
  }
  else {
    res.redirect('/login');
  }
});

//for the extras page
app.get('/extras', (req, res) => {
  if (req.session.user) {
    res.render('pages/extras.ejs');
  }
  else {
    res.redirect('/login');
  }
});
    

app.get('/', (req, res) => {
    res.render('pages/home.ejs');
  });

app.get('/login', (req, res) => {
  res.render('pages/login')
});

app.get('/register', (req, res) => {
  res.render('pages/register', {});
});
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});
// Register
app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  const user = await db.any(`SELECT * FROM users WHERE username = '${req.body.username}';`);
  const hash = await bcrypt.hash(req.body.password, 10);
  console.log(user);

  // Ensure non-null data is entered as registration information
  if (!req.body.username || !req.body.password) {
    console.log('CONSOLE.LOG FROM INDEX.JS --- Account could not be registered: NULL was passed into API Route');
    res.status(400).render('pages/register');
  }

  // Ensure current user does not already exist in database
  else if (user != '') {
    console.log('CONSOLE.LOG FROM INDEX.JS --- Account could not be reigstered: User already exists in database');
    res.status(400).render('pages/register');
  }
  
  // After input validation, insert user into database
  else {
    db.any('INSERT INTO users (username, password) VALUES ($1, $2);', [req.body.username, hash])
      .then(function (data) {
        console.log('CONSOLE.LOG FROM INDEX.JS --- Account was registered successfully');
        res.status(201).render('pages/login');
      })
      .catch(function (err) {
        console.log('CONSOLE.LOG FROM INDEX.JS ---  Account could not be registered');
        console.log(err);
        res.status(500).render('pages/register');
      });
  }
});
  
// Login
app.post('/login', async (req, res) => {
  // check if password from request matches with password in DB
  const findQuery = `SELECT * FROM users WHERE username = '${req.body.username}';`;
  const data = await db.any(findQuery);
  const user = data[0];
  if (user != null) {
    const match = await bcrypt.compare(req.body.password, user.password);
    if (match) {
      req.session.user = user;
      req.session.save();
      console.log('CONSOLE.LOG FROM INDEX.JS --- User logged in successfully');
      res.status(200).redirect('/');
    }
    else {
      console.log('CONSOLE.LOG FROM INDEX.JS --- User could not log in - Incorrect Password');
      res.status(401).render('pages/login');
    }
  }
  else if (user == null) {
    console.log('CONSOLE.LOG FROM INDEX.JS --- User could not log in - User not found in database');
    res.status(404).render('pages/login');
  }
});


// **********************************
// -----START SERVER-----
// **********************************


// **********************************
// -----Authorization functions----
// **********************************
function requestAuthorization(){
  let url = 'https://accounts.spotify.com/authorize';
  url +=  "?client_id=" + client_id + 
          "&response_type=code" +
          "&redirect_uri=" + redirect_uri +
          "&scope=ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private" +            // what premissions we want
          "&show_dialog=false"    // useres only need to authorize once
} // gennerates this link: https://accounts.spotify.com/authorize?client_id=c982daaa2a9543e181f3411ed630bc43&response_type=code&redirect_uri=localhost:3000/home&scope=ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private&show_dialog=false

function getTokenCode(){
  var usercode = null;
  const url = window.location.search;
  if (url.length > 0){
      const parse_parameters = new URLSearchParams(window.location.search);
      usercode = parse_parameters.get('code')
  }
}

// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');