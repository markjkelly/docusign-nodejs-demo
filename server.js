var express = require('express.io');
var app = require('express.io')();
app.http().io();
var bodyParser = require('body-parser');

app.set('view engine', 'ejs');
app.use(express.static("bower_components"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended : true
}));

var server = require('http').Server(app);
var io = require('socket.io')(server);

// load the routes
var routes = require('./app/routes');
routes(app, io);

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 3000;
var ipaddr = process.env.OPENSHIFT_NODEJS_IP;

server.listen(port, ipaddr, function() {
    console.log('Express server listening on ' + ipaddr + ':' + port);
});
