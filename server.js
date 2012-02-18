var express = require('express')
var io = require('socket.io')
var fs = require('fs')

var server = express.createServer()
server.set('view engine', 'ejs')
server.set('view options', {
    layout: false
})
server.set('views', __dirname + "/views")
server.set('tmp', __dirname + "/tmp")
server.use("/static", express.static(__dirname + "/static"))
server.listen(80)

var io = io.listen(server)
io.set('log level', 1)



server.get('/', function(req, res) {
	res.render('index', {})
})

server.post('/upload/:id', function(req, res) {
	var form = new formidable.IncomingForm();
            form.parse(req))
            form.onPart = function(part) {
                part.on('data', function(data) {
                    fs.open('tmp/'+req.params.id, 'w', function(err, fd) {
						fs.write(fd, data, undefined, undefined, function(err, written) {
							console.log('written '+written+' bytes to file '+req.params.id)
							fs.close(fd)
						})
					})
                })
                part.on('end', function() {
                    res.write("File received.")
                    res.end()
                })
            }

})