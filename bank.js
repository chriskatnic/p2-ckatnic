
var express = require('express');
var fs = require('fs');
var bodyParser = require("body-parser");


var app = express();
app.set("view engine", "ejs");

// Needed to parse the request body
//Note that in version 4 of express, express.bodyParser() was
//deprecated in favor of a separate 'body-parser' module.
app.use(bodyParser.urlencoded({ extended: true })); 

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



// GET '/' 
// 
// Should return index.html
//
// req = the request
// resp = the response
app.get('/', function(req, resp) {

	console.log("Page requested: ", req.url);
	console.log(__dirname + "/index.html");
	resp.sendFile(__dirname + "/index.html");
});


// The handler for the request of the login page
// @param req - the request
// @param res - the response 
app.post("/login", function(req, res){
	
	console.log("Here!");
		
	// Read the file
	fs.readFile("db.txt", "utf8", function(error, data){
		

		console.log(data);
		
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
				
			// Check the user name and password 
			if(req.body.username_login == userName && req.body.password_login == password)
			{
				// We have a match!
				credMath = true;
			}
			
			console.log(tokenizedData[i]);
		}
		
		// Credentials did not match? Do not display the page	
		if(credMath ==  false)
		{
			//render template for failed login 
			resp.render("index", 
			{
				_scoreCPU: scoreCPU, 
				_scorePlayer: scoreUser, 
				_cpuChoice: cpuChoiceString, 
				_userChoice: userChoice,  
				_totalGames: ++totalGames, 
				_gameResult: gameResult
			});			
		}			
		
		//render template for correct login
		resp.render("index", 
		{
			_scoreCPU: scoreCPU, 
			_scorePlayer: scoreUser, 
			_cpuChoice: cpuChoiceString, 
			_userChoice: userChoice,  
			_totalGames: ++totalGames, 
			_gameResult: gameResult
		});	
		
	});	//close fs.readfile

}); //close /login endpoint

// The end-point for creating an account
app.post("/register", function(req, res){


	console.log(req.body);
	
	// Append the entry to the text database	
	fs.appendFile("db.txt", req.body.username_register + ";" + req.body.password_register + "\n", function(err){
			
		res.send("Thank you for registering!");
	});

	parseDB("db.txt");
});



app.listen(3000);
