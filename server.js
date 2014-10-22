var express = require('express');

var app = express();
app.set('view engine', 'ejs');
app.use(express.static("bower_components"));
app.use(express.static("public"));
app.use(express.bodyParser());

var port = process.env.PORT || 3000;

//load the routes
require('./app/routes')(app);

app.listen(port);
console.log("App listening on port:" + port);
