var express = require('express')
var io = require('socket.io')
var fs = require('fs')
var formidable = require('formidable')
var EPub = require('epub')

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
    var form = new formidable.IncomingForm()
    form.parse(req)
    form.onPart = function(part) {
        part.on('data', function(data) {
            var fd = fs.openSync('tmp/'+req.params.id+'.zip', 'a')
            fs.writeSync(fd, data, 0, data.length, null)
            fs.closeSync(fd)
        })
        part.on('end', function() {
            res.render('index', {})
            res.end()
            var epub = new EPub('tmp/'+req.params.id+'.zip')
            console.log(epub)
            epub.on('error', function(err) {
                console.log(err)
                throw err
            })
            epub.on('end', function(err) {
                console.log('end')
                console.log('metadata: '+epub.metadata)
                console.log('spine: '+epub.flow)
                console.log('toc: '+epub.toc)
                epub.getChapter(epub.spine.contents[5].id, function(err, data) {
                    if (err) {
                        console.log(err)
                        return
                    }
                    console.log(data)
                })
            })
            epub.parse()
        })
    }

})


var roomPages = {} // a dictionary of current page numbers, indexed by room
var userCounts = {} // a dictionary of current counts of users, indexed by room

io.sockets.on('connection', function(socket) {
    
    socket.on('setRoomAndUser', function(data) {
        socket.set('room', data['room'])
        socket.set('user', data['user'])
        socket.join(data['room'])
        socket.emit('turnToPage', roomPages[data['room']])
        if (userCounts[data['room']] == null) {
            userCounts[data['room']] = 1
        } else {
            userCounts[data['room']]++
        }
        console.log('User '+data['user']+' ('socket.id+') joined room '+data['room'])
    })

    socket.on('turnToPage', function(pageNumber) {
        socket.get('room', function(err, room) {
            socket.broadcast.to(room).emit('turnToPage', pageNumber)
            roomPages[room] = pageNumber
        })
    })

    socketon('disconnect', function() {
        socket.get('room', function(err, room) {
            userCounts[room]--
            if (userCounts[room] == 0) {
                delete roomPages[room]
                delete userCounts[room]
            }
        }
    })

})