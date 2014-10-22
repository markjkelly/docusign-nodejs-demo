//
// to run this sample
//  1. copy the file in your own directory - say, example.js
//  2. change "***" to appropriate values
//  3. install async and request packages
//     npm install async
//     npm install request
//     npm install fs
//  4. execute
//     node example.js 
//
 
var async = require("async"),			// async module
	request = require("request"),		// request module
	fs = require("fs"),			// fs module
	email = "mark.kelly@docusign.com",				// your account email
	password = "password8",			// your account password
	integratorKey = "DOCU-0d0ffcb8-b8a4-4fb2-a42b-8a7e29f561fc",			// your account Integrator Key (found on Preferences -> API page)
	envelopeId =  "fba62ab9-bc3d-4052-b373-b183d7c59ef9",			// valid envelopeId of an existing envelope in your account
	baseUrl = "";				// we will retrieve this
 
async.waterfall(
[
	//////////////////////////////////////////////////////////////////////
	// Step 1 - Login (used to retrieve accountId and baseUrl)
	//////////////////////////////////////////////////////////////////////
	function(next) {
		var url = "https://demo.docusign.net/restapi/v2/login_information";
		var body = "";	// no request body for login api call
		
		// set request url, method, body, and headers
		var options = initializeRequest(url, "GET", body, email, password);
		
		// send the request...
		request(options, function(err, res, body) {
			if(!parseResponseBody(err, res, body)) {
				return;
			}
			baseUrl = JSON.parse(body).loginAccounts[0].baseUrl;
			next(null); // call next function
		});
	},
	
	//////////////////////////////////////////////////////////////////////
	// Step 2 - Get Envelope Document List
	//////////////////////////////////////////////////////////////////////
	function(next) {
		var url = baseUrl + "/envelopes/" + envelopeId + "/documents";
		var body = "";
 
		// set request url, method, body, and headers
		var options = initializeRequest(url, "GET", body, email, password);
		
		// send the request...
		request(options, function(err, res, body) {
			if(!parseResponseBody(err, res, body)) {
				return;
			}
			// call next function, pass response body that was returned in last call
			next(null, body); 
		});
	},
 
    	//////////////////////////////////////////////////////////////////////
	// Step 3 - Download each envelope document to local file system
	//////////////////////////////////////////////////////////////////////
	function(body, next) {
		var uriList = JSON.parse(body).envelopeDocuments;
		var uris = [], docNames = [], i;
 
		function downloadEnvelopeDoc(id, body) {
			// grab each document's local uri and use for URL
			uris.push(JSON.parse(body).envelopeDocuments[id].uri);	
			docNames.push(JSON.parse(body).envelopeDocuments[id].name);	
			
			var url = baseUrl + uris[id];	
			var body = "";	// no request body for this call
			
			// set request url, method, body, and headers
			var options = initializeRequest(url, "GET", body, email, password);
 
        		// http headers needed for this call
			options.headers["Accept"] = "application/pdf";
			options.headers["Content-Transfer-Encoding"] = "base64";			
			
			request(options, function(err, res, body) {
				if( res.statusCode != 200 )	// successful GET returns code 200
				{
					console.log("\nError downloading document, status is: ", res.statusCode);
					return;
				}
				console.log("Writing local file", docNames[id],"from uri", uris[id]);
				// we use Node 'fs' module to write to a local file.  Note that files
				// are base64 encoded in the DocuSign system
				var buffer = new Buffer(body, "base64");
				fs.writeFile(docNames[id], buffer, function(err) {
					if( err ) {
						console.log(err);
						return;
					}
				})
			})
		}
		
		// loop through and download each document, including the envelope certificate
		for( i = 0; i < uriList.length; i++ )
		{
			downloadEnvelopeDoc(i, body);
		} 
    }]
);
 
//***********************************************************************************************
// --- HELPER FUNCTIONS ---
//***********************************************************************************************
function initializeRequest(url, method, body, email, password) {	
	var options = {
		"method": method,
		"uri": url,
		"body": body,
		"headers": {}
	};
	addRequestHeaders(options, email, password);
	return options;
}
 
///////////////////////////////////////////////////////////////////////////////////////////////
function addRequestHeaders(options, email, password) {	
	// JSON formatted authentication header (XML format allowed as well)
	dsAuthHeader = JSON.stringify({
		"Username": email,
		"Password": password, 
		"IntegratorKey": integratorKey	// global
	});
	// DocuSign authorization header
	options.headers["X-DocuSign-Authentication"] = dsAuthHeader;
}
 
///////////////////////////////////////////////////////////////////////////////////////////////
function parseResponseBody(err, res, body) {
	console.log("\r\nAPI Call Result: \r\n", JSON.parse(body));
	if( res.statusCode != 200 && res.statusCode != 201)	{ // success statuses
		console.log("Error calling webservice, status is: ", res.statusCode);
		console.log("\r\n", err);
		return false;
	}
	return true;
}