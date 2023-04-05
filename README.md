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


# Better Wrapped

Our application will be a Spotify Statistics and Recommendation App. The webpage will display some basic statistics based on users’ Spotify listening, using the Spotify API. Specifically, the main homepage will show users’ top artists / genres over a weekly period. This will build on Spotify’s current Wrapped software, which only provides yearly updates on these statistics.
Additional features will include song recommendations based on users’ most listened-to genres and songs. Users will be able to create new playlists based on these recommendations and add it to their account. 

# Team Members:
Aaron Curtis-Johnston
Andrew Yonan
Berkley Larson
Jamison Wilder
River Jordan

# Technology Stack

# Application Prerequisities

# How to run this application locally

# Test cases: How to run

# Link to deployed application
