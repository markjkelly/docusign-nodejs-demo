var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.set('view engine', 'ejs');
app.use(express.static("bower_components"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
	extended : true
}));

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 3000;

// load the routes
require('./app/routes')(app);

app.listen(port);
console.log("App listening on port:" + port);
