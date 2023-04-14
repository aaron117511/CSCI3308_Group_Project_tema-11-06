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
  //We are checking POST /login API by passing the user info in the correct order. This test case should pass and return a status 200 along with a "Success" message.
  it('positive : /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: 'John Doe', password: '1234', access_token: 'APIc00L717'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equals('Success');
        done();
      });
  });

  it('Negative : /login. Checking invalid name', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: "John Doe", password: '4321', access_token: 'APIc00L717'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equals('Authentication Failed');
        done();
      });
  });




    // it('positive : /register', done => {
    //     chai
    //       .request(server)
    //       .post('/register')
    //       .send({id: 5, name: 'John Doe', dob: '2020-02-20'})
    //       .end((err, res) => {
    //         expect(res).to.have.status(200);
    //         expect(res.body.message).to.equals('Success');
    //         done();
    //       });
    //   });
    //   it('Negative : /register. Checking invalid name', done => {
    //     chai
    //       .request(server)
    //       .post('/register')
    //       .send({id: '5', name: 10, dob: '2020-02-20'})
    //       .end((err, res) => {
    //         expect(res).to.have.status(200);
    //         expect(res.body.message).to.equals('Invalid input');
    //         done();
    //       });
    //   });
});