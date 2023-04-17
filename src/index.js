// **********************************
// -----IMPORT DEPENDENCIES HERE-----
// **********************************
const client_id = 'c982daaa2a9543e181f3411ed630bc43';
const client_secret = '1cac4bc9ab0b42259e9e33c66e771df4';
const redirect_uri = 'http://localhost:3000/authentication';
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

app.get('/', (req, res) => {
    res.render('pages/home.ejs');
  });

app.get('/login', (req, res) => {
  res.render('pages/login')
});

app.get('/register', (req, res) => {
  res.render('pages/register', {});
});
  
// Register
app.post('/register', async (req, res) => {
  // hash the password using the bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);
  const insertQuery = 'INSERT INTO users (username, password, access_token, refresh_token) VALUES ($1, $2, NULL, NULL) RETURNING *;';
  db.any(insertQuery, [req.body.username, hash])
    .then((response) => {
      req.session.user = response[0];
      req.session.save();
      res.redirect(requestAuthorization());
    })
    .catch((err) => {
      res.redirect('/register');
    });
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
      res.redirect('/');
    }
    else {
      res.render('pages/login', {
        message: 'Incorrect username or password',
        error: true,
      });
    }
  }
  else if (user == null) {
    res.redirect('/register');
  }
});


app.get('/authentication', async (req, res) => {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var update_query = `UPDATE users SET access_token = $1, refresh_token = $2 WHERE username = $3 RETURNING *;`;

  if (state === null) {
    res.redirect('/');
  } 
  else {
    await axios({
        url: `https://accounts.spotify.com/api/token`,
        method: 'post',
        data: {
          code: code,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: client_id,
          password: client_secret
        }
      })
      .then(response => {
        db.any(update_query, [
          response.data.access_token, 
          response.data.refresh_token, 
          req.session.user.username
        ])
          .then(updated => {
            req.session.user = updated[0];
            req.session.save();
            res.redirect('/');
          })
          .catch(err => {
            console.log(err);
            res.redirect('/');
          });
      })
      .catch(error => {
        console.log(error);
        res.redirect('/');
      });
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
          "&show_dialog=false" +
          "&state=aIler30Bwjxby4pp";    // useres only need to authorize once
  return url;
} //

function getTokenCode(){
  var usercode = null;
  const url = window.location.search;
  if (url.length > 0){
      const parse_parameters = new URLSearchParams(window.location.search);
      usercode = parse_parameters.get('code')
  }
}

// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');