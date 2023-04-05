# CSCI3308_Group_Project_tema-11-06
Const Int Team_Number = 6

Const String Team_Name = ???


DROP TABLE IF EXISTS Team_Members CASCADE;
CREATE TABLE users(
team_num INT PRIMARY KEY,   
name CHAR(60) NOT NULL
);
INSERT INTO Team_Members (Member_num, name) VALUES
(1,'Aaron Curtis-Johnston'),
(2,'Andrew Yonan'),
(3,'Berkley Larson'),
(4,'jamison Wilder'),
(5,'River Jordan');
