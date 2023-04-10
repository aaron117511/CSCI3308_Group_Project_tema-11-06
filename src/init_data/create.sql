CREATE TABLE users(
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  access_token CHAR(60)
);