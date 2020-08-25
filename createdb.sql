CREATE DATABASE users;
USE users;
CREATE TABLE appusers (username VARCHAR(255), password VARCHAR(255), firstname VARCHAR(255), lastname VARCHAR(255), address VARCHAR(255));
CREATE TABLE accounts (username VARCHAR(255), amount int, accountnumber int);
GRANT ALL PRIVILEGES ON users.* TO 'appaccount'@'localhost' IDENTIFIED BY 'apppass';
