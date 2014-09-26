var express = require('express');
var wait = require('wait.for');
var bodyParser = require('body-parser');
var app = express();

app.set('view engine', 'ejs');
app.use(express.static("bower_components"));
app.use(express.static("public"));
app.use(express.bodyParser());

var async = require("async"), request = require("request"), email = "mark.kelly@docusign.com", password = "password8", integratorKey = "DOCU-0d0ffcb8-b8a4-4fb2-a42b-8a7e29f561fc", templateId = "21B46E9C-A3C0-44E1-8B29-4FC23109864F", templateRoleName = "Signer", baseUrl = "https://demo.docusign.net/restapi/v2/accounts/378107";

app.get('/', function(req, res) {

	res.render('index');
});

app.post('/', function(req, res) {

	var signingUrl;

	console.dir(req.body);

	var fullname = req.body.fullname;
	var signerEmail = req.body.signeremail;
	var mobilePhone = req.body.mobilephone;
	var requireIdLookup = false;

	if (mobilePhone !== "") {
		requireIdLookup = true;
	}

	async.series([

	// ////////////////////////////////////////////////////////////////////
	// Step 1 - Send envelope with one Embedded
	// recipient (using clientUserId property)
	// ////////////////////////////////////////////////////////////////////
	function(next) {
		var url = baseUrl + "/envelopes";
		var body = JSON.stringify({
			"emailSubject" : "DocuSign API call - Embedded Sending Example",
			"emailBlurb" : "Please sign...thanks!",
			"compositeTemplates" : [ {
				"serverTemplates" : [ {
					"sequence" : 1,
					"templateId" : templateId

				} ],
				"inlineTemplates" : [ {
					"sequence" : 2,
					"recipients" : {
						"signers" : [ {
							"email" : signerEmail,
							"name" : fullname,
							"recipientId" : "1",
							"clientUserId" : "1001",
							"roleName" : templateRoleName,
							"requireIdLookup" : requireIdLookup,
							"idCheckConfigurationName" : "SMS Auth $",
							"smsAuthentication" : {
								"senderProvidedNumbers" : [ mobilePhone ]
							}
						} ]
					}
				} ]
			} ],
			"status" : "sent"
		});

		// set request url, method, body, and
		// headers
		var options = initializeRequest(url, "POST", body, email, password);

		// send the request...
		console.dir(options);
		request(options, function(err, res, body) {
			if (!parseResponseBody(err, res, body)) {
				return;
			}
			// parse the envelopeId
			// value from the response
			envelopeId = JSON.parse(body).envelopeId;
			next(null); // call next
			// function
		});
	},

	// ////////////////////////////////////////////////////////////////////
	// Step 2 - Get the Embedded Signing View
	// (aka the recipient view)
	// ////////////////////////////////////////////////////////////////////
	function(next) {
		var url = baseUrl + "/envelopes/" + envelopeId + "/views/recipient";
		var method = "POST";
		var body = JSON.stringify({
			"returnUrl" : "http://www.docusign.com/devcenter",
			"authenticationMethod" : "email",
			"email" : signerEmail,
			"userName" : fullname,
			"clientUserId" : "1001",
		});

		// set request url, method, body, and
		// headers
		var options = initializeRequest(url, "POST", body, email, password);

		// send the request...
		request(options, function(err, res, body) {
			if (!parseResponseBody(err, res, body))
				return;
			else
				signingUrl = JSON.parse(body).url;
			console.log(signingUrl);
			next(null);
		});
	},

	// ////////////////////////////////////////////////////////////////////
	// Step 3 - Redirect to Signing View
	// ////////////////////////////////////////////////////////////////////
	function(err) {
		res.redirect(signingUrl);
	} ]);
});

// ***********************************************************************************************
// --- HELPER FUNCTIONS ---
// ***********************************************************************************************

function initializeRequest(url, method, body, email, password) {
	var options = {
		"method" : method,
		"uri" : url,
		"body" : body,
		"headers" : {}
	};
	addRequestHeaders(options, email, password);
	return options;
}

// /////////////////////////////////////////////////////////////////////////////////////////////
function addRequestHeaders(options, email, password) {
	// JSON formatted authentication header (XML format allowed as well)
	dsAuthHeader = JSON.stringify({
		"Username" : email,
		"Password" : password,
		"IntegratorKey" : integratorKey
	// global
	});
	// DocuSign authorization header
	options.headers["X-DocuSign-Authentication"] = dsAuthHeader;
}

// /////////////////////////////////////////////////////////////////////////////////////////////
function parseResponseBody(err, res, body) {
	console.log("\r\nAPI Call Result: \r\n", JSON.parse(body));
	if (res.statusCode != 200 && res.statusCode != 201) { // success statuses
		console.log("Error calling webservice, status is: ", res.statusCode);
		console.log("\r\n", err);
		return false;
	}
	return true;
}

app.listen(4000);