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

server.get('/:id', function (req, res) {
    res.render('read', {room:req.params.id, user:req.query.user})
})

server.get('/book/:id', function(req, res) {
    var epub = new EPub('tmp/'+req.params.id+'.zip')
    epub.on('error', function(err) {
        console.log(err)
        throw err
    })
    epub.on('end', function(err) {
        if (req.query.ch == -1) {
            var chunks = ""
            console.log(chunks)
            function getAllChapters(currentChapter) {
                if (currentChapter == epub.spine.contents.length) {
                    res.end()
                } else {
                    epub.getChapter(epub.spine.contents[currentChapter].id, function(err, data) {
                        if (err) {
                            console.log(err)
                            return
                        }
                        res.write(data)
                        getAllChapters(currentChapter+1)
                    })
                }
            }
            getAllChapters(0)
        } else {
            console.log('test')
            epub.getChapter(epub.spine.contents[req.query.ch].id, function(err, data) {
                if (err) {
                    console.log(err)
                    return
                }
                res.write(data)
                res.end()
            })
        }
    })
    epub.parse()
})

server.post('/upload/', function(req, res) {
    res.write('Please enter a room name to upload to.')
    res.end()
})

server.post('/upload/:id', function(req, res) {
    if (userCounts[req.params.id] == null || userCounts[req.params.id] == 0) {
        var form = new formidable.IncomingForm()
        form.uploadDir = 'tmp'
        form.addListener('file', function(name, file) {
            fs.rename(file.path, 'tmp/'+req.params.id+'.zip')
        })
        form.addListener('end', function() {
            res.write('File uploaded.')
            res.end()
        })
        form.parse(req)
    } else {
        res.write('People are already reading something in this room!')
        res.end()
    }
})


var roomPages = {} // a dictionary of current page numbers, indexed by room
var userCounts = {} // a dictionary of current counts of users, indexed by room

var roomVideos = {} //dictionary of streams, indexed by room

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
        console.log('User '+data['user']+' ('+socket.id+') joined room '+data['room'])
    })

    socket.on('turnToPage', function(pageNumber) {
        socket.get('room', function(err, room) {
            if (pageNumber != roomPages[room]) {
                socket.broadcast.to(room).emit('turnToPage', pageNumber)
                roomPages[room] = pageNumber
            }
        })
        console.log('In room, user '+socket.id+' turned to page '+pageNumber)
    })

    socket.on('disconnect', function() {
        socket.get('room', function(err, room) {
            userCounts[room]--
            if (userCounts[room] == 0) {
                delete roomPages[room]
                delete userCounts[room]
            }
        })
    })

    socket.on('createdStream', function (roomAndStream) { //JSON with room and id
        console.log("MY CREATION")
        var room = roomAndStream.room
        var stream = roomAndStream.stream
        var myId = roomAndStream.myId
        console.log(myId)
        if (room in roomVideos) {
            if (roomVideos[room].indexOf(stream) == -1) {
                roomVideos[room].push(stream)
            }
        } else {
            roomVideos[room] = [stream]
        }
        socket.emit('subscribe', {"myid" : myId, "streams" : roomVideos[room]})
    });

    socket.on('subscribeToStream', function (roomAndId) {
        var room = roomAndId.room
        var id = roomAndId.id
        console.log("subscribing")
        if (room in roomVideos) {
            console.log("already exists")
            console.log(roomVideos[room])
            socket.emit('subscribe',{"myid" : id, "streams" : roomVideos[room]})
        } else {
            console.log("nothing")
        }
    });

})