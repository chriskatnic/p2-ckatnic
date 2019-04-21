'use strict'
var cookieParser = require('cookie-parser');
var express = require('express');
var csp = require('helmet-csp');
var fs = require('fs');
var bodyParser = require("body-parser");
var expressSanitizer = require('express-sanitizer');
var session = require('client-sessions');

var app = express();

var errorMessage = "";

// Needed to parse the request body
//Note that in version 4 of express, express.bodyParser() was
//deprecated in favor of a separate 'body-parser' module.
app.use(bodyParser.urlencoded({ extended: true })); 

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
    imgSrc: ['img.com', 'data:'],
    //sandbox: ['allow-forms', 'allow-scripts'],
    //reportUri: '/report-violation',
    //objectSrc: ["'none'"],
    //upgradeInsecureRequests: true,
    //workerSrc: false  // This is not set.
  }}))

app.use(session({
	cookieName: 'session',
	secret: 'aJuq39pyyyKjLJuYfDE1qsdi6',
	duration: 3 * 60 * 1000, /* three minutes */
	activeDuration: 1 * 60 * 10,
	httpOnly: true,
	ephemeral: true
}));

// Parses a database of usernames and passwords
// @param dbFile - the database file
// @return - the list of user name and passwords
function parseDB(dbFile)
{
	// Read the file
	fs.readFile(dbFile, "utf8", function(error, data){
		console.log(data);
		data.split(";");
		
	});
}

function parseXMLDataForTag(xmlData, tagName)
{
	let xmlParsed = xmlParser.parseFromString(xmlData, "text/xml");
	let nodeValue = xmlParsed.getElementsByTagName(tagName).childNodes[0].nodeValue;
	return nodeValue;
}

// validation helper function - currently only first condition is used, can be extended
function validate(value, criteria) {
	if (criteria === "number")
		return !isNaN(value);
	if (criteria === "username")
		return false;
	
	return false;
}

// user checking helper function
function userExists(username) {
	// Read the file
	fs.readFile("db.txt", "utf8", function(error, data){
		
		console.log("read account data: " + data);
		
		// Split the data
		var tokenizedData = data.split("\n");
		console.log(tokenizedData);
		
		// Try to find the name
		for(let i = 0; i < tokenizedData.length; i++)
		{ 
			// Get the user name and password 
			let userNameFromDB = tokenizedData[i].split(";")[0];
			console.log(userNameFromDB + username);
			// Check the user name
			if(username === userNameFromDB)
			{
				console.log("returning true");
				return true;
			}
		}
		return false;
	});
}

// html 'template' function - updates login form with error message
function constructHTMLWithError(html) 
{
	// read file synchronously to ensure we don't continue on until it's read
	let editedHTML = fs.readFileSync(html, "utf8");
	
	// construct the HTML
	editedHTML = editedHTML.replace("<errorMessage>", errorMessage);
	
	//clear the error message internally
	errorMessage = "";
	
	return editedHTML;
}

function addToLog(message)
{
	// Append the entry to the text database	
	fs.appendFile("log.txt",Date.now() + " " + message + "\n", 
	function(err)
	{
		console.log("wrote message in log: " + message);
	});

}

// middleware for session checking
app.use(function(req, res, next) {
	if(req.session && req.session.user) {
		if(!userExists(req.session.user)) {
			req.user = req.session.user
			delete req.user.password;
			req.session.user = req.user;
			res.locals.user = req.user;
		}
		next();
	} else {
		next();
	}
});
			

// middleware for login required
function requireLogin ( req, res, next) {
	if(!req.user) {
		console.log("login required!");
		res.redirect('/'); 
	} else {
		console.log("login not required!");
		next(); 
	}
};


app.get('/home', requireLogin, function(req, res) {	
	
	// display the home page
	var homePageHTML = "";
	
	// begin constructing the view of accounts
	var homePageAccountTableHTML = "<table>";
	
	// get the username from the cookie
	var cookie = req.session.user;
	
	// validate the username exists and matches with the cookie
	let userNameXML = cookie;
	
	// get the accounts
	fs.readFile(userNameXML+".txt", "utf8", function(error, data){
	
		console.log(data);
	
		var tokenizedData = data.split(";");
		
		console.log(tokenizedData);
		
		console.log("constructing table");
		
		for(let i = 0; i < tokenizedData.length; i++) 
		{
			homePageAccountTableHTML += "<form action=\"/transaction\" method=\"POST\">" +
										"<tr><input type=\"hidden\" name=\"account\" value=\""+i+"\"\>";
			homePageAccountTableHTML += "<td>" + "Account " + i + "</td>" + 
										"<td>" + tokenizedData[i] + "</td>" + 
										"<td><input type=\"text\" name=\"amount\" pattern=\"^\\d+(?:,\\d{3})*\\.\\d{2}$\"></td>" + 
										"<td><input type=\"submit\" name=\"Transaction\" value=\"Deposit\" /></td>" + 
										"<td><input type=\"submit\" name=\"Transaction\" value=\"Withdraw\" /></td></tr>";
		}
		
		homePageAccountTableHTML += "</table>";
		
		homePageHTML = constructHTMLWithError("home.html");
		
		homePageHTML = homePageHTML.replace("<supertag>", homePageAccountTableHTML);
	
		console.log(homePageHTML);
		
		res.send(homePageHTML);
	});
	
});

app.get("/logout", function(req, res) {
	console.log("logging out");
	req.session.reset();
	res.redirect("/index");

});

// end-point for creating a new account
// @param req - the request
// @param res - the response
app.post("/createAccount", function(req, res){

	console.log("creating new account");
	
	let userName = req.session.user;
	
	console.log(userName);
	
	if(!userExists(userName)) 
	{
		// write a new 0.00 to the end of the file for the account
		fs.appendFile(userName+".txt", ";0.00", function(err){
			
			console.log("updated with new account");
		});
	} 
	else 
	{
		console.log("user already exists");
	}
	
	res.redirect("/home");
	
});

app.post("/transaction", function(req, res){
	
	console.log("updating account value");

	var cookie = req.session.user;
	
	let userNameXML = cookie;
	
	// get account name data from XML submission
	//let userNameXML = parseXMLDataForTag(req.body.xmlData, "account_name");
	
	console.log(userNameXML);

	// synchronous file read - we don't want to skip ahead until we've got the data loaded
	var data = fs.readFileSync(userNameXML+".txt", "utf8");
	
	console.log(data);
	
	var tokenizedData = data.split(";");
		
	console.log(tokenizedData);
		
	for(let i = 0; i < tokenizedData.length; i++) {
	
		if(req.body.amount[i] !== ""){
			// validation of account number
			var accountNumberXML = req.body.account[i];
			if(!validate(accountNumberXML, "number")){
				addToLog("ERROR: Account Number has been tampered with by man in middle: " + accountNumberXML);
				res.send("transaction error! account number invalid");
			}

			
			// validation of amount 
			// if amount isn't a number
			// 
			var amount = req.body.amount[i];
			if(!validate(amount, "number")){
				addToLog("ERROR: Transaction Amount has been tampered with by man in middle: " + amount);
				res.send("transaction error! amount invalid");
			}
		}
	}
	
	// get the account number to be changed
	//let accountNumberXML = parseInt(parseXMLDataForTag(req.body.xmlData, "account_number"));
	//let accountNumberXML = req.body.account;
	
	console.log("accout number from body");
	
	accountNumberXML = parseInt(accountNumberXML);	
		
	console.log("Account number: " + accountNumberXML);

	// get the amount of money to be 'deposited' into the account
	//let deposit = parseInt(parseXMLDataForTag(req.body.xmlData, "amount"));
	//let amount = req.body.amount;
	
	console.log(amount);
	
	amount = parseInt(amount);
	
	console.log(amount);
	
	// get the amount of money in the account
	let accountAmount = parseInt(tokenizedData[accountNumberXML]);
	
	console.log(accountAmount);
	console.log(req.body);
	
	// perform the transaction
	if(req.body.Transaction === 'Withdraw') {
		console.log('found withdraw');
		if (accountAmount < amount)
		{
			addToLog("ERROR: Account Withdrawal Exceeds Account Balance - " + userNameXML + " $"+amount);
			errorMessage = "Withdrawal request exceeds account balance - transaction declined!";
		} else {
			accountAmount -= amount;
			addToLog("INFO: Account Withdrawal - " + userNameXML + " $"+amount);
		}
	} else if(req.body.Transaction === 'Deposit') {
		console.log('found deposit');
		addToLog("INFO: Account Deposit - " + userNameXML + " $"+amount);
		accountAmount += amount;
	}
	
	// update the data
	tokenizedData[accountNumberXML] = accountAmount;
	
	// join the data to a single string to be written to the db
	let updatedAccountInfo = tokenizedData.join(";");
	
	console.log(updatedAccountInfo);
	
	//write the file back
	fs.writeFile(userNameXML+".txt", updatedAccountInfo, function(err) {
		console.log("made it to the write");
		res.redirect("/home");
	});	
	
	
});

// The handler for the request of the login page
// @param req - the request
// @param res - the response 
app.post("/login", function(req, res){
	
	console.log("Logging in!");			
		// Read the file
		fs.readFile("db.txt", "utf8", function(error, data){
			
			console.log("read account data: " + data);
			
			// Split the data
			var tokenizedData = data.split("\n");
			console.log(tokenizedData);
			
			// Match the credentials 
			var credMath = false;
			
			// Add the HTML; match the password while you are at it
			for(let i = 0; i < tokenizedData.length; i++)
			{ 
				// Get the user name and password 
				let userName = tokenizedData[i].split(";")[0];
				let password = tokenizedData[i].split(";")[1];
				let numAccounts = tokenizedData[i].split(";")[2];
				let accounts = [];
				
				
				for(let j = 0; j < parseInt(numAccounts); j++)
				{
					accounts[j] = tokenizedData[i].split(";")[3+j];
				}
					
				// Check the user name and password 
				if(req.sanitize(req.body.username_login) == userName && req.sanitize(req.body.password_login) == password)
				{
					// We have a match!
					credMath = true;
					
					addToLog("INFO: Successful Login - " + userName);

					req.session.user = userName;
					addToLog("INFO: Login Cookie Set - " + userName);
				}
				
				console.log(tokenizedData[i]);
			}
			
			// Credentials did not match? Send the user to the login page with an error	
			if(credMath ==  false)
			{
				console.log("couldn't find match");
				
				addToLog("WARN: Login failed for " + req.body.userName);
				
				errorMessage = "Login attempt failed";
				
				var timeoutCounter = req.sanitize(req.cookies.timeoutCounter);
				
				console.log(timeoutCounter);
				
				if ( timeoutCounter === undefined ) 
				{
					timeoutCounter = 0;
				}
				
				timeoutCounter = parseInt(timeoutCounter);
				timeoutCounter += 1;
				
				addToLog("WARN: Timeout Counter Increased - " + req.body.userName);
				
				res.cookie("timeoutCounter", timeoutCounter);
			}
			
			res.redirect("/");
			
		});	//close fs.readfile
	
}); //close /login endpoint


// The end-point for creating an account
app.post("/register", function(req, res){

	console.log(req.body);
	
	var user = [];
	
	// escape the user submitted data
	user[0] = req.sanitize(req.body.username_register);
	user[1] = req.sanitize(req.body.password_register);
	user[2] = req.sanitize(req.body.firstname_register);
	user[3] = req.sanitize(req.body.lastname_register);
	user[4] = req.sanitize(req.body.address_register);
	
	// join registration data into single ; delimited string
	let userJoined = user.join(";");
	
	// Append the entry to the text database	
	fs.appendFile("db.txt", userJoined + "\n", 
	function(err)
	{
		fs.writeFile(user[0]+".txt", "0.00", function(err){
			console.log("new file registered and account created");
			res.redirect('/index');
		});
	});

	parseDB("db.txt");
});

// GET '/' 
// 
// Should return route request based on session cookie
//
// req = the request
// resp = the response
app.get('/', function(req, res) {
	
	// check for cookie
//	var cookie = req.cookies.loggedIn;
//	
//	if(cookie === undefined){
//		console.log("cookie undefined");
//		res.redirect('/index');
//	}else{
//		console.log("cookie defined");
//		res.redirect('/home');
//	}
	if(req.session && req.session.user){
			res.redirect('/home');
	} 
	else 
	{
		res.redirect('/index');
	}
});

// GET '/index' 
// 
// Should return index.html
//
// req = the request
// resp = the response
app.get('/index', function(req, res) {
	
	var htmlpage = constructHTMLWithError("index.html");
	
	res.send(htmlpage);
});

app.listen(3000);
