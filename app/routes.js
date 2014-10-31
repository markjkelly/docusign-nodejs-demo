var bodyParser = require('body-parser');
var randomstring = require("randomstring");
var async = require("async");
var request = require("request");
var fs = require("fs");

var config = require('./../config.json');

var email = process.env.DS_EMAIL;
var password = process.env.DS_PASSWORD;
var integratorKey = process.env.DS_INT_KEY;

module.exports = function(app) {

	app.get('/', function(req, res) {

		res.render(' tryDocuSignDocument');
	});
	
	app.get('/documentDemo', function(req, res) {

		res.render(' tryDocuSignDocument');
	});

	app.get('/templateDemo', function(req, res) {

		res.render('tryDocuSignTemplate');
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
					'/template',
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
														"emailSubject" : "Embedded Signing from Template",
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
													url, "POST", body, email,
													password);

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
													url, "POST", body, email,
													password);

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
			.post(
					'/document',
					function(req, res) {

						var signingUrl;
						var envelopeId;
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

										function(next) {

											console
													.dir("Step 1 - Send envelope");

											var url = config.baseUrl
													+ "/envelopes";

											var body = {
												"recipients" : {
													"signers" : [ {
														"email" : signerEmail,
														"name" : fullname,
														"recipientId" : 1,
														"clientUserId" : clientUserId,
														"accessCode" : "",
														"requireIdLookup" : requireIdLookup,
														"idCheckConfigurationName" : "SMS Auth $",
														"smsAuthentication" : {
															"senderProvidedNumbers" : [ mobilePhone ]
														},
														"tabs" : {
															"signHereTabs" : [ {
																"anchorString" : "/S1Sign/",
																"anchorXOffset" : "-20",
																"anchorYOffset" : "120"
															} ],
															"initialHereTabs" : [ {
																"anchorString" : "/S1Initial/",
																"anchorXOffset" : "10",
																"anchorYOffset" : "120"
															} ],
															"fullNameTabs" : [ {
																"anchorString" : "/S1FullName/",
																"anchorXOffset" : "-20",
																"anchorYOffset" : "120"
															} ],
															"dateSignedTabs" : [ {
																"anchorString" : "/S1Date/",
																"anchorXOffset" : "0",
																"anchorYOffset" : "120"
															} ]
														}
													} ]
												},
												"emailSubject" : 'Embedded Signing from document',
												"documents" : [ {
													"name" : "Try DocuSigning.docx",
													"documentId" : 1,
												} ],
												"status" : "sent",
											};

											var options = initializeRequest(
													url, "POST", body, email,
													password);

											options.headers["Content-Type"] = "multipart/form-data";

											options.multipart = [
													{
														"Content-Type" : "application/json",
														"Content-Disposition" : "form-data",
														"body" : JSON
																.stringify(body),
													},
													{
														"Content-Type" : "application/pdf",
														'Content-Disposition' : 'file; filename="'
																+ "Try DocuSigning.docx"
																+ '"; documentId=1',
														"body" : fs
																.readFileSync("resources/Try DocuSigning.docx"),
													} ];

											request(
													options,
													function(err, res, body) {
														if (!parseResponseBody(
																err, res, body))
															return;
														else
															envelopeId = JSON
																	.parse(body).envelopeId;
														console.log(signingUrl);
														next(null);
													});
										},

										// ////////////////////////////////////////////////////////////////////
										// Step 2 - Get the Embedded Signing
										// View
										// (aka the recipient view)
										// ////////////////////////////////////////////////////////////////////
										function(next) {

											console
													.dir("Step 2 - Get the Embedded Signing View");
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

											var options = initializeRequest(
													url, "POST", body, email,
													password);

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
													url, "GET", body, email,
													password);

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
													url, "GET", body, email,
													password);

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
