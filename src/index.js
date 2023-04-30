// **********************************
// -----IMPORT DEPENDENCIES HERE-----
// **********************************
const url_concat = 'http://localhost:3000';
const express = require('express'); // To build an application server or API
const app = express();
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.

const test_json = {
  name: "test playlist",
  track_uris: ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh", 
  "spotify:track:1301WleyT98MSxVHPZCA6M", 
  "spotify:episode:512ojhOuo1ktJprKbVcKyQ"
  ]
}

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
app.get('/', (req, res) => {
  res.render('pages/home.ejs');
});

app.get('/home_img', (req, res) => {
  const options = {
      root: path.join(__dirname)
  };
  res.sendFile('/resources/img/home_page.jpg', options);
});

app.get('/login', (req, res) => {
res.render('pages/login')
});

app.get('/register', (req, res) => {
res.render('pages/register', {});
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

// Authentication middleware.
const auth = (req, res, next) => {
  if (req.path === '/getUserInfo' || req.path === '/getUserTopArtists' || req.path === '/getUserTopTracks' || req.path === '/createPlaylist' || req.path === '/addTracks') {
    return next();
  }

  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

app.use(auth);

//for the extras page
app.get('/extras', (req, res) => {
  if (req.session.user) {
    res.render('pages/extras.ejs', {
      name: 'test playlist',
      track_uris: '["spotify:track:4iV5W9uYEdYUVa79Axb7Rh", "spotify:track:1301WleyT98MSxVHPZCA6M", "spotify:episode:512ojhOuo1ktJprKbVcKyQ"]'
    });
  }
  else {
    res.redirect('/login');
  }
});

//for yourReport page
app.get('/yourReport', async (req, res) => {
  const user_response = await axios.get(url_concat + '/getUserInfo?key=' + req.session.user.access_token);
  if (user_response.status == 401) {
    res.redirect('/refresh?redirect=/yourReport');
  }
  else {
    const user_info = user_response.data;
    req.session.spotify_user = user_info;
    req.session.save();

    if (req.query.timeline == null) {
      res.render('pages/yourReport.ejs', {
        spotify_user: user_info,
        top_tracks: null,
        top_artists: null
      });
    }
    else {
      const top_tracks_response = await axios.get(url_concat + '/getUserTopTracks?key=' + req.session.user.access_token + '?time_range=' + req.query.timeline);
      const top_tracks = top_tracks_response.data;
      const top_artists_response = await axios.get(url_concat + '/getUserTopArtists?key=' + req.session.user.access_token + '?time_range=' + req.query.timeline);
      const top_artists = top_artists_response.data;
      res.render('pages/yourReport.ejs', {
        spotify_user: user_info,
        top_tracks: top_tracks,
        top_artists: top_artists
      });
    }
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
        method: 'POST',
        data: {
          code: code,
          redirect_uri: url_concat + '/authentication',
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

// call using a format like this where the text after redirect= is replaced with desired redirect address 
// res.redirect('/refresh?redirect=/');
app.get('/refresh', async (req, res) => {
  var update_query = `UPDATE users SET access_token = $1, refresh_token = $2 WHERE username = $3 RETURNING *;`;
  const redirect_path = req.query.redirect;

  await axios({
      url: `https://accounts.spotify.com/api/token`,
      method: 'POST',
      data: {
        refresh_token: req.session.user.refresh_token,
        grant_type: 'refresh_token'
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
      var set_refresh_token = response.data.refresh_token || req.session.user.refresh_token;
        db.any(update_query, [
          response.data.access_token,
          set_refresh_token,
          req.session.user.username
        ])
        .then(updated => {
          req.session.user = updated[0];
          req.session.save();
          res.redirect(redirect_path);
        })
        .catch(err => {
          console.log(err);
          res.redirect(redirect_path);
        });
    })
    .catch(error => {
      console.log(error);
      res.redirect(redirect_path);
    });
});

app.get('/getUserTopArtists', (req, res) => {
  let timeRange = '';
  if (req.query.time_range) {
    timeRange = '?time_range=' + req.query.time_range;
  }

  axios({
    url: `https://api.spotify.com/v1/me/top/artists` + timeRange,
    method: 'GET',
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer  ' + req.query.key
    },
  })
  .then(results => {
    res.send(results.data);
  })
  .catch(error => {
    const status = error.response.status;
    // If token is expired, call /refresh route to refresh the token, and then have this route call itself again.
    if (status == 401) {
      console.log("/getUserTopArtists: Status 401 received. Refreshing token and calling this route again...")
      res.status(status).send('Token refresh required');
    }

    else {
      console.log("/getUserTopArtists error: There was an error in retrieving API data. See detailed error below:");
      console.log(error.response.data);

      if (status == 400) {console.log('getUserTopArtists Error: Status 400 received');}
      if (status == 403) {console.log('/getUserTopArtists Error: Bad OAuth Request');}
      else if (status == 429) {console.log('/getUserTopArtists Error: Rate Limit Exceeded');}

      res.status(status).send('Error');
    }
  });
  
});

app.get('/getUserTopTracks', (req, res) => {
  let timeRange = '';
  if (req.query.time_range) {
    timeRange = '?time_range=' + req.query.time_range;
  }
  axios({
    url: `https://api.spotify.com/v1/me/top/tracks` + timeRange,
    method: 'GET',
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer  ' + req.query.key,
    },
  })
  .then(results => {
    res.send(results.data);
  })
  .catch(error => {
    const status = error.response.status;

    // If token is expired, call /refresh route to refresh the token, and then have this route call itself again.
    if (status == 401) {
      console.log("/getUserTopTracks: Status 401 received. Refreshing token and calling this route again...")
      res.status(status).send('Token refresh required');
    }

    else {
      console.log("/getUserTopTracks error: There was an error in retrieving API data. See detailed error below:");
      console.log(error.response.data);

      if (status == 400) {console.log('getUserTopTracks Error: Status 400 received');}
      if (status == 403) {console.log('/getUserTopTracks Error: Bad OAuth Request');}
      else if (status == 429) {console.log('/getUserTopTracks Error: Rate Limit Exceeded');}

      res.status(status).send('Error');
    }
  });

});

app.get('/getUserInfo', (req, res) => {
  axios({
    url: `https://api.spotify.com/v1/me`,
    method: 'GET',
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer  ' + req.query.key,
    },
  })
  .then(results => {
    res.send(results.data);
  })
  .catch(error => {
    const status = error.response.status;

    // If token is expired, call /refresh route to refresh the token, and then have this route call itself again.
    if (status == 401) {
      console.log("/getUserInfo: Status 401 received. Refreshing token...")
      res.status(status).send('Token refresh required');
    }

    else {
      console.log("/getUserInfo error: There was an error in retrieving API data. See detailed error below:");
      console.log(error.response.data);

      if (status == 400) {console.log('/getUserInfo Error: Status 400 received');}
      if (status == 403) {console.log('/getUserInfo Error: Bad OAuth Request');}
      else if (status == 429) {console.log('/getUserInfo Error: Rate Limit Exceeded');}
      res.status(status).send('Error');

    }
  });
});

app.post('/playlist', async (req, res) => {
  const track_uri_array = JSON.parse(req.body.track_uris);

  const create_playlist_response = await axios.post(url_concat + '/createPlaylist', {
    spotify_user_id: req.session.spotify_user.id,
    key: req.session.user.access_token,
    name: req.body.name
  });

  const create_playlist = create_playlist_response.data;

  const add_tracks_response = await axios.post(url_concat + '/addTracks', {
    playlist_id: create_playlist.id,
    key: req.session.user.access_token,
    track_uris: track_uri_array
  });

  res.send(create_playlist);

})

app.post('/createPlaylist', (req, res) => {
  axios({
    url: `https://api.spotify.com/v1/users/` + req.body.spotify_user_id + '/playlists',
    method: 'POST',
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer  ' + req.body.key,
      'Content-Type': 'application/json'
    },
    data : {
      name: req.body.name
    }
  })
  .then(results => {
    res.send(results.data);
  })

  .catch(error => {
    const status = error.response.status;

    // If token is expired, call /refresh route to refresh the token, and then have this route call itself again.
    if (status == 401) {
      console.log("/createPlaylist: Status 401 received. Refreshing token...")
      res.status(status).send('Token refresh required');
    }

    else {
      console.log("/createPlaylist error: There was an error in retrieving API data. See detailed error below:");
      console.log(error.response.data);

      if (status == 400) {console.log('/createPlaylist Error: Status 400 received');}
      if (status == 403) {console.log('/createPlaylist Error: Bad OAuth Request');}
      else if (status == 429) {console.log('/createPlaylist Error: Rate Limit Exceeded');}
      res.status(status).send('Error');

    }
  });
});

app.post('/addTracks', (req, res) => {
  axios({
    url: `https://api.spotify.com/v1/playlists/` + req.body.playlist_id + '/tracks',
    method: 'POST',
    dataType: 'json',
    headers: {
      'Authorization': 'Bearer  ' + req.body.key,
      'Content-Type': 'application/json'
    },
    data: {
      uris: req.body.track_uris
    }
  })
  .then(results => {
    res.status(200);
  })

  .catch(error => {
    const status = error.response.status;

    // If token is expired, call /refresh route to refresh the token, and then have this route call itself again.
    if (status == 401) {
      console.log("/addTracks: Status 401 received. Refreshing token...")
      res.status(status).send('Token refresh required');
    }

    else {
      console.log("/addTracks error: There was an error in retrieving API data. See detailed error below:");
      console.log(error.response.data);

      if (status == 400) {console.log('/addTracks Error: Status 400 received');}
      if (status == 403) {console.log('/addTracks Error: Bad OAuth Request');}
      else if (status == 429) {console.log('/addTracks Error: Rate Limit Exceeded');}
      res.status(status).send('Error');

    }
  });
});


// **********************************
// -----START SERVER-----
// **********************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');



// **********************************
// -----Authorization functions----
// **********************************
function requestAuthorization(){
  let url = 'https://accounts.spotify.com/authorize';
  url +=  "?client_id=" + process.env.CLIENT_ID + 
          "&response_type=code" +
          "&redirect_uri=" + url_concat + '/authentication' + 
          "&scope=ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private" +            // what premissions we want
          "&show_dialog=false" +
          "&state=aIler30Bwjxby4pp";    // useres only need to authorize once
  return url;
} //
