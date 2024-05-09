var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors')

var indexRouter = require('./routes/index');

var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const server = require('http').createServer(app);
module.exports.io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
require('./public/javascripts/sockets/socket');


app.use('/', indexRouter); // Use the index router for the root path


//public path
const publicPath = path.join(__dirname, 'public');//path to public folder
app.use(express.static(publicPath));//use public folder

server.listen(2000, (err) => {
    if (err) throw new Error(err); // If there is an error, throw it
    console.log('Server started on port'+ 2000); // If there is no error, log that the server has started
}); // Start express server

module.exports = app;
