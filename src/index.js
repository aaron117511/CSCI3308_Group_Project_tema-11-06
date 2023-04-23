// **********************************
// -----IMPORT DEPENDENCIES HERE-----
// **********************************
const redirect_uri = 'http://localhost:3000/authentication';
const apiUrl = "https://api.spotify.com/v1/me"
const express = require('express'); // To build an application server or API
const app = express();
const path = require('path');
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
  res.render('pages/home.ejs');
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

//for yourReport page
app.get('/yourReport', (req, res) => {
  if (req.session.user) {
    res.render('pages/yourReport.ejs');
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

app.get('/home_img', (req, res) => {
  const options = {
      root: path.join(__dirname)
  };
  res.sendFile('/resources/img/home_page.jpg', options);
});

// Register
app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  const user_returned = await db.any(`SELECT * FROM users WHERE username = '${req.body.username}';`);
  const user = user_returned[0];
  const hash = await bcrypt.hash(req.body.password, 10);
  const insertQuery = 'INSERT INTO users (username, password, access_token, refresh_token) VALUES ($1, $2, NULL, NULL) RETURNING *;';

  // Ensure non-null data is entered as registration information
  if (!req.body.username || !req.body.password) {
    console.log('CONSOLE.LOG FROM INDEX.JS --- Account could not be registered: NULL was passed into API Route');
    res.status(400).render('pages/register');
  }

  // After input validation, insert user into database
  else if (user == null) {
    db.any(insertQuery, [req.body.username, hash])
    .then((response) => {
      console.log('CONSOLE.LOG FROM INDEX.JS --- Account was registered successfully');
      req.session.user = response[0];
      req.session.save();
      res.status(201);
      res.redirect(requestAuthorization());
    })
    .catch((err) => {
      console.log('CONSOLE.LOG FROM INDEX.JS ---  Account could not be registered');
      console.log(err);
      res.status(500).render('pages/register');
    });
  }

  // Ensure current user does not already exist in database
  else {
    console.log('CONSOLE.LOG FROM INDEX.JS --- Account could not be registered: User already exists in database');
    res.status(400).render('pages/register');
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

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('pages/login.ejs');
  console.log("Logged out successfully");
})

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
          username: process.env.CLIENT_ID,
          password: process.env.CLIENT_SECRET
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


function RefreshToken(){
  const xhr = new XMLHttpRequest();

  xhr.open("POST", "https://accounts.spotify.com/api/token", true);              // create api call
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');     // add a header to the api call
  xhr.setRequestHeader('Authorization', 'Basic ' + btoa(process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET));   
  xhr.send("grant_type=refresh_token" + "&refresh_token=" + session.refresh_token + "&client_id=" + process.env.CLIENT_ID); // send the api call
    // once we get the request back from spotify update the access_token
  xhr.onload = () =>{
          var data = JSON.parse(this.responseText);
          /* i think the following should update the data base but im unsure
          var update_query = `UPDATE users SET access_token = $1 WHERE username = $3 RETURNING *;`;          
          db.any(update_query, [
                                data.access_token,
                                session.user.username
                              ]);
          */
        };
}


function requestData(endpoint, callType, body) {
  const xhr = new XMLHttpRequest();
  xhr.open(callType, endpoint);
  xhr.setRequestHeader('Authorization', 'Bearer ' + session.user.access_token);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.responseType = 'json'
  xhr.onload = callApi(endpoint, callType, body) 
  if(body) xhr.send(JSON.stringify(body));
  else xhr.send();
}


// call this function when you want to make an api call
//    endpoint is the url given to you by spotify
//    callType is the type of api call you're making as a string ie: <"POST">
//            note: must be in all capps!
//    body is the extra parameters that spotify asks you to include
//            note: this doesnt have to be used and can be passed entirley in the enpoint varible 
//                  this is more of here for ease of use and flexability while you imlementing api calls to spotify
function callApi(endpoint, callType, body){
  requestData(endpoint, callType, body);
  if(this.status == 200){
  return xhr.responseXML;
  }
  if (this.status == 401) {
    RefreshToken();
    requestData(endpoint, callType, body);``
  }
}



// **********************************
// -----START SERVER-----
// **********************************


// **********************************
// -----Authorization functions----
// **********************************
function requestAuthorization(){
  let url = 'https://accounts.spotify.com/authorize';
  url +=  "?client_id=" + process.env.CLIENT_ID + 
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
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');