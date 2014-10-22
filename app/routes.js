var bodyParser = require('body-parser');
var randomstring = require("randomstring");
var async = require("async");
var request = require("request");
var fs = require("fs");

var config = require('./../config.json');

module.exports = function(app) {

	app.get('/demo', function(req, res) {

		res.render('index');
	});

	app.get('/complete', function(req, res) {

		var envelopeId = req.param("envelopeId");
		console.log("envelopeId: [" + envelopeId + "]");


		res.render('signingcomplete', {
			envelopeId : envelopeId
		});

	});

	app
			.post(
					'/',
					function(req, res) {

						var signingUrl;
						var currentUrl = req.get('host');
						console.dir("currentUrl: [" + currentUrl + "]");
						var returnUrl = "http://" + currentUrl + "/complete";
						console.dir("returnUrl: [" + returnUrl + "]");

						var clientUserId = randomstring.generate(20);
						console.dir("clientUserId: [" + clientUserId + "]");
						console.dir(req.body);

						var fullname = req.body.fullname;
						var signerEmail = req.body.signeremail;
						var mobilePhone = req.body.mobilephone;
						var requireIdLookup = false;

						if (mobilePhone !== "") {
							requireIdLookup = true;
							console.dir("requireIdLookup: [" + requireIdLookup
									+ "]");
						}

						async
								.series([

										// ////////////////////////////////////////////////////////////////////
										// Step 1 - Send envelope with one
										// Embedded
										// recipient (using clientUserId
										// property)
										// ////////////////////////////////////////////////////////////////////
										function(next) {
											var url = config.baseUrl
													+ "/envelopes";
											var body = JSON
													.stringify({
														"emailSubject" : "Embedded Signing",
														"emailBlurb" : "Please sign...thanks!",
														"compositeTemplates" : [ {
															"serverTemplates" : [ {
																"sequence" : 1,
																"templateId" : config.templateId

															} ],
															"inlineTemplates" : [ {
																"sequence" : 2,
																"recipients" : {
																	"signers" : [ {
																		"email" : signerEmail,
																		"name" : fullname,
																		"recipientId" : "1",
																		"clientUserId" : clientUserId,
																		"roleName" : config.templateRoleName,
																		"requireIdLookup" : requireIdLookup,
																		"idCheckConfigurationName" : "Phone Auth $",
																		"phoneAuthentication" : {
																			"recipMayProvideNumber" : true,
																			"validateRecipProvidedNumber" : true,
																			"recordVoicePrint" : false,
																			"senderProvidedNumbers" : [ mobilePhone ]
																		}
																	} ]
																}
															} ]
														} ],
														"status" : "sent"
													});

											// set request url, method, body,
											// and
											// headers
											var options = initializeRequest(
													url, "POST", body,
													config.email,
													config.password);

											// send the request...
											console.dir(options);
											request(
													options,
													function(err, res, body) {
														if (!parseResponseBody(
																err, res, body)) {
															return;
														}
														// parse the envelopeId
														// value from the
														// response
														envelopeId = JSON
																.parse(body).envelopeId;
														next(null); // call next
														// function
													});
										},

										// ////////////////////////////////////////////////////////////////////
										// Step 2 - Get the Embedded Signing
										// View
										// (aka the recipient view)
										// ////////////////////////////////////////////////////////////////////
										function(next) {
											var url = config.baseUrl
													+ "/envelopes/"
													+ envelopeId
													+ "/views/recipient";
											var method = "POST";
											var body = JSON
													.stringify({
														"returnUrl" : returnUrl
																+ "?envelopeId="
																+ envelopeId,
														"authenticationMethod" : "email",
														"email" : signerEmail,
														"userName" : fullname,
														"clientUserId" : clientUserId,
													});

											// set request url, method, body,
											// and
											// headers
											var options = initializeRequest(
													url, "POST", body,
													config.email,
													config.password);

											console.dir(options);

											// send the request...
											request(options, function(err, res,
													body) {
												if (!parseResponseBody(err,
														res, body))
													return;
												else
													signingUrl = JSON
															.parse(body).url;
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

	app
			.get(
					'/downloadDocument',
					function(req, res) {

						var envelopeId = req.param("envelopeId");
						console.log("envelopeId: [" + envelopeId + "]");

						async
								.waterfall([

										function(next) {

											var url = config.baseUrl
													+ "/envelopes/"
													+ envelopeId
													+ "/documents/1";

											var body = "";

											// set request url, method,
											// body, and headers
											var options = initializeRequest(
													url, "GET", body,
													config.email,
													config.password);

											// http headers needed for this
											// call
											options.headers["Accept"] = "application/pdf";
											options.headers["Content-Transfer-Encoding"] = "base64";

											request(
													options,
													function(err, res, body) {
														if (res.statusCode != 200) {
															console
																	.log(
																			"\nError downloading document, status is: ",
																			res.statusCode);
															return;
														}

														var buffer = new Buffer(
																body, "base64");

														console
																.log("body.length: ["
																		+ body.length
																		+ "]");
														console
																.log("buffer.length: ["
																		+ buffer.length
																		+ "]");
														next(null, body);

													});

										},

										function(body, next) {

											var buffer = new Buffer(body,
													"base64");

											res
													.writeHead(
															200,
															{
																'Content-Type' : 'application/pdf',
																'Content-Length' : buffer.length
															});
											res.end(buffer);
										}

								]);
					});

	app
			.get(
					'/downloadCertificate',
					function(req, res) {

						var envelopeId = req.param("envelopeId");
						console.log("envelopeId: [" + envelopeId + "]");

						async
								.waterfall([

										function(next) {

											var url = config.baseUrl
													+ "/envelopes/"
													+ envelopeId
													+ "/documents/certificate";

											var body = "";

											// set request url, method,
											// body, and headers
											var options = initializeRequest(
													url, "GET", body,
													config.email,
													config.password);

											// http headers needed for this
											// call
											options.headers["Accept"] = "application/pdf";
											options.headers["Content-Transfer-Encoding"] = "base64";

											request(
													options,
													function(err, res, body) {
														if (res.statusCode != 200) {
															console
																	.log(
																			"\nError downloading document, status is: ",
																			res.statusCode);
															return;
														}

														var buffer = new Buffer(
																body, "base64");

														console
																.log("body.length: ["
																		+ body.length
																		+ "]");
														console
																.log("buffer.length: ["
																		+ buffer.length
																		+ "]");
														next(null, body);

													});

										},

										function(body, next) {

											var buffer = new Buffer(body,
													"base64");

											res
													.writeHead(
															200,
															{
																'Content-Type' : 'application/pdf',
																'Content-Length' : buffer.length
															});
											res.end(buffer);
										}

								]);
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
			"Username" : config.email,
			"Password" : config.password,
			"IntegratorKey" : config.integratorKey
		// global
		});
		// DocuSign authorization header
		options.headers["X-DocuSign-Authentication"] = dsAuthHeader;
	}

	// /////////////////////////////////////////////////////////////////////////////////////////////
	function parseResponseBody(err, res, body) {
		console.log("\r\nAPI Call Result: \r\n", JSON.parse(body));
		if (res.statusCode != 200 && res.statusCode != 201) { // success
			// statuses
			console
					.log("Error calling webservice, status is: ",
							res.statusCode);
			console.log("\r\n", err);
			return false;
		}
		return true;
	}

};
