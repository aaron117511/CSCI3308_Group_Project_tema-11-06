// Imports the index.js file to be tested.
const server = require('../index'); //TO-DO Make sure the path to your index.js is correctly added
// Importing libraries

// Chai HTTP provides an interface for live integration testing of the API's.
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });

  // ===========================================================================
  // TO-DO: Part A Login unit test case
  // ===========================================================================
  // NOTE -- John Doe must be a user in the database for this test to pass. Check insert.sql to ensure this is true
  //We are checking POST /login API by passing the user info in the correct order.
  it('positive : /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: 'John Doe', password: '1234'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });

  it('Negative : /login. Checking invalid password', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: "John Doe", password: '4321'})
      .end((err, res) => {
        expect(res).to.have.status(401);
        done();
      });
  });

  it('Negative : /login. Checking invalid username', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: "Johnny Doe", password: '1234'})
      .end((err, res) => {
        expect(res).to.have.status(404);
        done();
      });
  });

  it('positive : /register. Checking successful registration', done => {
      chai
        .request(server)
        .post('/register')
        .send({username: 'Register Man', password: '5678'})
        .end((err, res) => {
          expect(res).to.have.status(201);
          done();
        });
    });
    it('Negative : /register. Checking failed registration', done => {
      chai
        .request(server)
        .post('/register')
        .send({username: '', password: ''})
        .end((err, res) => {
          expect(res).to.have.status(500);
          done();
        });
    });
});