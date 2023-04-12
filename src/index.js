// **********************************
// -----IMPORT DEPENDENCIES HERE-----
// **********************************
const client_id = 'c982daaa2a9543e181f3411ed630bc43';
const client_secret = '1cac4bc9ab0b42259e9e33c66e771df4';
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

app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);

  db.any('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING * ;', [req.body.username, hash])
    .then(function (data) {
      res.status(201).json({
        status: 'success',
        data: data,
        message: 'account registered successfully'
      });
    })
    .catch(function (err) {
      res.status(500).json({
        status: 'failed',
        data: data,
        message: 'Account could not be registered.'
      })
      return console.log(err);
    });
});

// **********************************
// -----START SERVER-----
// **********************************

// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');