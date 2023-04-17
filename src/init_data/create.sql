DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE IF NOT EXISTS users(
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  access_token VARCHAR(350),
  refresh_token VARCHAR(150)
);
