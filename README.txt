Project 2 - Banking App

Team Members - Chris Katnic

How to execute:

unzip the contents into a directory

install npm dependent packages using the following command:
npm install

then, execute the following command to run the application
nodemon bank.js


Security Countermeasures
Broken Authentication
- No default credentials are shipped with the application
- Password checks for registering passwords: front end form field validation pattern match requires 15 character minimum mix of chars
- Enumeration attack countermeasure: error messages for login and registration are generic and include no specific error message 
- Brute force attack countermeasure: failed login attempts are logged on the back end using the cookie session id

XSS Attacks
- Escaping and Sanitization: 
- username and password for login escaped when submitted before being compared against db
- any amount submitted for withdrawal/deposit escaped/sanitized before writing/reading to/from db
- regex pattern matching for front end field submissions help to disallow unacceptable submission formats for all contexts
	
