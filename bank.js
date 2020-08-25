/* global require */
var cookieParser = require('cookie-parser');
var express = require('express');
var csp = require('helmet-csp');

var bodyParser = require("body-parser");
var expressSanitizer = require('express-sanitizer');
var session = require('client-sessions');
// https packages
var https = require('https');
var fs = require('fs');

var app = express();

var numAccounts = 0;

// sql
var mysql = require('mysql');

// bcrypt for hash
var bcrypt = require('bcrypt');

var conn = mysql.createConnection({
    host: "localhost",
    user: "appaccount",
    password: "apppass",
    multipleStatements: true

});


var errorMessage = "";

// Needed to parse the request body
//Note that in version 4 of express, express.bodyParser() was
//deprecated in favor of a separate 'body-parser' module.
app.use(bodyParser.urlencoded({
    extended: true
}));

// Needed to parse cookies
app.use(cookieParser());

// Needed for sanitization of input from requests
app.use(expressSanitizer());
// Needed to enforce content security policies
// taken from defenses code samples
app.use(csp({
    // Specify directives as normal.
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'http://localhost:3000/styles.css'],
        fontSrc: ["'self'", 'http://localhost:3000/styles.css'],
        imgSrc: ['img.com', 'data:']
        //sandbox: ['allow-forms', 'allow-scripts'],
        //reportUri: '/report-violation',
        //objectSrc: ["'none'"],
        //upgradeInsecureRequests: true,
        //workerSrc: false  // This is not set.
    }
}));

app.use(session({
    cookieName: 'session',
    secret: 'aJuq39pyyyKjLJuYfDE1qsdi6',
    duration: 3 * 60 * 1000,
    /* three minutes */
    activeDuration: 60 * 10,
    httpOnly: true,
    ephemeral: true
}));


// validation helper function - currently only first condition is used, can be extended
function validate(value, criteria) {
    'use strict';
    if (criteria === "number") {
        return !isNaN(value);
    }

    if (criteria === "username") {
        return false;
    }


    return false;
}


// html 'template' function - updates login form with error message
function constructHTMLWithError(html) {
    'use strict';
    // read file synchronously to ensure we don't continue on until it's read
    let editedHTML = fs.readFileSync(html, "utf8");

    // construct the HTML
    editedHTML = editedHTML.replace("<errorMessage>", errorMessage);

    //clear the error message internally
    errorMessage = "";

    return editedHTML;
}

function addToLog(message) {
    'use strict';
    // Append the entry to the text database	
    fs.appendFile("logs/log.txt", Date.now() + " " + message + "\n",
        function (err) {
            console.log("wrote message in log: " + message);
        });

}

// middleware for session checking
app.use(function (req, res, next) {
    if (req.session.username) {
        req.user = req.session.username
        delete req.user.password;
        req.session.username = req.user;
        res.locals.user = req.user;
        next();
    } else {
        next();
    }
});


// middleware for login required
function requireLogin(req, res, next) {
    if (!req.user) {
        console.log("login required!");
        res.redirect('/');
    } else {
        console.log("login not required!");
        next();
    }
};


app.get('/home', requireLogin, function (req, res) {

    // display the home page
    var homePageHTML = "";

    // begin constructing the view of accounts
    var homePageAccountTableHTML = "<table>";

    var query = "USE users; SELECT accountnumber, amount FROM accounts WHERE username = ?";

    query = mysql.format(query, [req.session.username]);

    console.log(query);

    conn.query(query, (err, result) => {

        if (err) throw err;

        console.log(result[1])

        console.log("constructing table");

        // find the username
        result[1].forEach(function (account) {

            numAccounts++;

            homePageAccountTableHTML += "<form action=\"/transaction\" method=\"POST\">" +
                "<tr><input type=\"hidden\" name=\"account\" value=\"" + account['accountnumber'] + "\"\>";
            homePageAccountTableHTML += "<td>" + "Account " + account['accountnumber'] + "</td>" +
                "<td>" + account['amount'] + "</td>" +
                "<td><input type=\"text\" name=\"amount\" pattern=\"^\\d+(?:,\\d{3})*\\.\\d{2}$\"></td>" +
                "<td><input type=\"submit\" name=\"Transaction\" value=\"Deposit\" /></td>" +
                "<td><input type=\"submit\" name=\"Transaction\" value=\"Withdraw\" /></td></tr>";
        });

        homePageAccountTableHTML += "</table>";

        homePageHTML = constructHTMLWithError("home.html");

        homePageHTML = homePageHTML.replace("<supertag>", homePageAccountTableHTML);

        res.send(homePageHTML);

    });

});

app.get("/logout", function (req, res) {
    console.log("logging out");
    req.session.reset();
    res.redirect("/index");
    numAccounts = 0;

});

// end-point for creating a new account
// @param req - the request
// @param res - the response
app.post("/createAccount", function (req, res) {

    console.log("creating new account");

    var query = "USE users; INSERT INTO accounts (username, accountnumber, amount) VALUES (?, ?, ?)";

    query = mysql.format(query, [req.session.username, numAccounts, 0]);

    console.log(query);

    conn.query(query, (err2, result) => {

        if (err2) throw err2;

        console.log(result[1])

    });

    res.redirect("/home");

});

app.post("/transaction", function (req, res) {

    var amount;
    var count = 0;
    var index = 0;

    req.body.amount.forEach(function (amountNum) {
        count++;
        if (!isNaN(amountNum)) {
            amount = amountNum;
            index = count;
        }
    });

    var accountnum = req.body.account[index - 1];

    console.log("index: " + index + " account: " + req.body.account[index - 1]);

    // perform the transaction
    if (req.body.Transaction === 'Withdraw') {

        var query = "USE users; UPDATE accounts SET amount=amount-? WHERE username=? AND accountnumber=?;";

        query = mysql.format(query, [amount, req.session.username, accountnum]);

        console.log(query);

        conn.query(query, (err2, result) => {

            if (err2) throw err2;

            console.log(result[1])

            res.redirect("/home");

        });

    } else if (req.body.Transaction === 'Deposit') {

        var query = "USE users; UPDATE accounts SET amount=amount+? WHERE username=? AND accountnumber=?;";

        console.log(parseInt(req.body.amount));


        query = mysql.format(query, [amount, req.session.username, accountnum]);

        console.log(query);

        conn.query(query, (err2, result) => {

            if (err2) throw err2;

            console.log(result[1])

            res.redirect("/home");

        });


    }
});

// The handler for the request of the login page
// @param req - the request
// @param res - the response 
app.post("/login", function (req, res) {

    console.log("Logging in!");

    var match;

    // Get the username and password data from the form
    var userName = req.body.username_login;
    var password = req.body.password_login;

    // construct sql statement
    var query = "USE users; SELECT username, password FROM appusers WHERE username=?";

    // edit sql statement with user input
    query = mysql.format(query, [userName]);

    console.log(query);

    // execute sql statement
    conn.query(query, (err, result) => {
    	
    	if (err) throw err;
      	
    	
        console.log(result[1].length);

        var hash;
        
        if (result[1].length > 0) {
        	result[1].forEach(function (account) {

                if (account['username'] == userName) {
                    // check password
                    console.log("matched username...");

                    match = true;

                    // store the hashed password from the db
                    hash = account['password'];

                    if (match) {
                        // compare stored hash with plaintext password using bcrypt	
                        bcrypt.compare(password, hash, (err2, res2) => {

                            console.log("plaintext match: " + res2);

                            if (err2) throw err2;

                            // store comparison results
                            match = res2;

                            // store session information
                            req.session.username = userName;

                            res.redirect("/home");

                        });
                    } else {
                        console.log("couldn't find match");

                        addToLog("WARN: Login failed for " + req.body.userName);

                        errorMessage = "Login attempt failed";

                        var timeoutCounter = req.sanitize(req.cookies.timeoutCounter);

                        console.log(timeoutCounter);

                        if (timeoutCounter === undefined) {
                            timeoutCounter = 0;
                        }

                        timeoutCounter = parseInt(timeoutCounter);
                        timeoutCounter += 1;

                        addToLog("WARN: Timeout Counter Increased - " + req.body.userName);

                        res.cookie("timeoutCounter", timeoutCounter);
                        res.send("invalid info");

                    }
                }
            });
        } else {
        	console.log("couldn't find match");

            addToLog("WARN: Login failed for " + req.body.userName);

            errorMessage = "Login attempt failed";

            var timeoutCounter = req.sanitize(req.cookies.timeoutCounter);

            console.log(timeoutCounter);

            if (timeoutCounter === undefined) {
                timeoutCounter = 0;
            }

            timeoutCounter = parseInt(timeoutCounter);
            timeoutCounter += 1;

            addToLog("WARN: Timeout Counter Increased - " + req.body.userName);

            res.cookie("timeoutCounter", timeoutCounter);
            res.send("invalid info");
        }
        

    });

}); //close /login endpoint


// The end-point for creating an account
app.post("/register", function (req, res) {

    console.log(req.body);

    var user = [];

    // escape the user submitted data
    user[0] = req.sanitize(req.body.username_register);
    user[1] = req.sanitize(req.body.password_register);
    user[2] = req.sanitize(req.body.firstname_register);
    user[3] = req.sanitize(req.body.lastname_register);
    user[4] = req.sanitize(req.body.address_register);

    bcrypt.hash(user[1], 10, function (err, hash) {

        if (err) throw err;

        var query = "USE users; INSERT INTO appusers (username, password, firstname, lastname, address) VALUES (?, ?, ?, ?, ?)";

        query = mysql.format(query, [user[0], hash, user[2], user[3], user[4]]);

        console.log(query);

        conn.query(query, (err2, result) => {

            if (err2) throw err2;

            console.log(result[1])

            res.redirect("/home");

        });

    });


});

// GET '/' 
// 
// Should return route request based on session cookie
//
// req = the request
// resp = the response
app.get('/', function (req, res) {


    if (req.session && req.session.username) {
        res.redirect('/home');
    } else {
        res.redirect('/index');
    }
});

// GET '/index' 
// 
// Should return index.html
//
// req = the request
// resp = the response
app.get('/index', function (req, res) {

    var htmlpage = constructHTMLWithError("index.html");

    res.send(htmlpage);
});

// create https server
// app.listen(3000);
https.createServer({
    key: fs.readFileSync('certificates/MyKey.key'),
    cert: fs.readFileSync('certificates/MyCertificate.crt')
}, app).listen(3000, () => {

    console.log('listening... be sure to use "https://"!');
});









// OLD CODE


//// Parses a database of usernames and passwords
//// @param dbFile - the database file
//// @return - the list of user name and passwords
//function parseDB(dbFile) {
//    'use strict';
//    // Read the file
//    fs.readFile(dbFile, "utf8", function (error, data) {
//        console.log(data);
//        data.split(";");
//
//    });
//}
//
//function parseXMLDataForTag(xmlData, tagName) {
//    'use strict';
//    var xmlParsed = xmlParser.parseFromString(xmlData, "text/xml");
//    var nodeValue = xmlParsed.getElementsByTagName(tagName).childNodes[0].nodeValue;
//    return nodeValue;
//}

////user checking helper function
//function userExists(username) {
//  'use strict';
//  // Read the file
//  fs.readFile("db.txt", "utf8", function (error, data) {
//
//      console.log("read account data: " + data);
//
//      // Split the data
//      var tokenizedData = data.split("\n");
//      console.log(tokenizedData);
//
//      // Try to find the name
//      for (let i = 0; i < tokenizedData.length; i++) {
//          // Get the user name and password 
//          let userNameFromDB = tokenizedData[i].split(";")[0];
//          console.log(userNameFromDB + username);
//          // Check the user name
//          if (username === userNameFromDB) {
//              console.log("returning true");
//              return true;
//          }
//      }
//      return false;
//  });
//}
