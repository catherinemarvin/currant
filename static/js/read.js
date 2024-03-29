$(document).ready(function() {
    var room = $('#room').val()
    console.log(room)
    var user = $('#user').val()
    history.replaceState({}, room, "/"+room+"?user="+user)
    var socket = io.connect('/')

    $.get("/book/"+room+"?ch=2", function (data) {
        //console.log(data)
        //console.log(data)
        //console.log(paragraphs)
        var div = document.createElement("div");
        div.innerHTML = data;
        //console.log(div)
        var paragraphs = div.getElementsByTagName("p")
        //console.log(paragraphs)

        var toReturn = []
        var toAppend = []
        var charCount = 0;
        var maxCount = 1500;
        for (var i=0;i <= paragraphs.length-1;i++) {
            toAppend.push("<p>")
            var paragraph = paragraphs[i]
            //console.log(paragraph)
            var text = paragraph.innerHTML
            //console.log(text)
            var wordsList = text.split(" ")
            //console.log(wordsList)
            for (var j=0; j <= wordsList.length-1;j++) {
                var word = wordsList[j]
                charCount += word.length + 1
                if (charCount > maxCount) {
                    toAppend.push("</p>")
                    toReturn.push(toAppend)
                    toAppend = ["<p>"]

                    toAppend.push(word)

                    charCount = word.length + 1
                } else {
                    toAppend.push(word)
                }
            }
            toAppend.push("</p>")
            charCount += 80
        }
        //console.log(toReturn)
        $("#magazineholder").append("<div id='magazine'></div>")
        for (var i = 0; i <= toReturn.length - 1; i++) {
            var lst = toReturn[i]
            //console.log(lst)

            var retString = ""
            for (var x = 0; x <= lst.length - 1 ; x++) {
                retString = retString + " " + lst[x]
            }

            $("#magazine").append("<div id='page"+i+"'><div id='page"+i+"content' class='page-content'>"+retString+"</div></div>")
            if ((i % 2) == 0) { //this means right hand side, aka odd numbered pages
                //$("#page"+i).css({"background-color" : "#B7B3BA"});
                //$("#page"+i).css({"background-color" : "#666"});

                $("#page"+i).css({"background" : "-webkit-gradient(linear, left top, right top, color-stop(0%,#f9f7e1), color-stop(100%,#efe0ba))"})
                $("#page"+i).css({"background" : "-webkit-linear-gradient(left, #f9f7e1 0%,#efe0ba 100%)"})
                $("#page"+i).css({"background" : "-o-linear-gradient(left, #f9f7e1 0%,#efe0ba 100%)"})
                $("#page"+i).css({"background" : "-ms-linear-gradient(left, #f9f7e1 0%,#efe0ba 100%)"})
                $("#page"+i).css({"background" : "linear-gradient(left, #f9f7e1 0%,#efe0ba 100%)"})
                

                
                //$("#page"+i).css({"background-image" : "-webkit-linear-gradient(left,  #E4E4E4 0%, #F7F7F7 100%)"})
                //$("#page"+i).css({"background-image" : "-moz-linear-gradient(left,  #E4E4E4 0%, #F7F7F7 100%)"})
            } else {
                $("#page"+i).css({"background" : "-webkit-gradient(linear, left top, right top, color-stop(0%,#f9f7e1), color-stop(100%,#efe0ba))"})
                $("#page"+i).css({"background" : "-webkit-linear-gradient(left, #f9f7e1 0%,#efe0ba 100%)"})
                $("#page"+i).css({"background" : "-o-linear-gradient(left, #f9f7e1 0%,#efe0ba 100%)"})
                $("#page"+i).css({"background" : "-ms-linear-gradient(left, #f9f7e1 0%,#efe0ba 100%)"})
                $("#page"+i).css({"background" : "linear-gradient(left, #f9f7e1 0%,#efe0ba 100%)"})
                //$("#page"+i).css({"background-color" : "#F0F0F0"});
            }
            $("#page"+i+"content").css({"font-size" : "40px"})
            
            retString = ""
        }

        $('#magazine').turn({page: 1, shadows: true, acceleration: true})

        $('#magazine').bind('turning', function(e,page) {
            centerMagazine(page)
        })

        $('#magazine').bind('turned', function(err, page, pageObj) {
            socket.emit('turnToPage', page)
        })
    })

    var centerMagazine = function (page) {

        var that = $('#magazine');
        var width = that.width();
        var pageWidth = width/2;
        var total = $('#magazine').data().totalPages;
        var leftc = ($(window).width()-width)/2;
        var leftr = ($(window).width()-pageWidth)/2;
        var leftd = (page == 1)? leftr - leftc - pageWidth : leftr - leftc;
        //console.log("INITIALIZE");
        
        if (page == total) {
            console.log("SHIFT TO END")
            $('#magazine').animate({left: 2 * leftd});
        }

        if (page == 1) {
            //console.log("SHIFT TO FRONT")
            //console.log(leftd)
            $('#magazine').animate({left: 0 });

        } else if (page == 2) {
            //console.log("SHIFT FROM 1")
            //console.log(leftd)
            $('#magazine').animate({left: leftd});
        } else if (page == total - 1) {
            $('#magazine').animate({left: leftd});
        }
    }

    socket.on('turnToPage', function(page) {
        if ($('#magazine').turn('page') != page) {
            $('#magazine').turn('page', page)
        }
    })

    socket.on('connect', function () {
        socket.emit('setRoomAndUser', {room:room, user:user})
    })

    var apiKey = '12002492';
    var sessionId = '2_MX4xMjMyMDgxfjcyLjUuMTY3LjE0OH4yMDEyLTAyLTE4IDE2OjA5OjM1LjkxNzkyMyswMDowMH4wLjkyNzExMjU4NDU5Nn4';
    var token = 'devtoken';

    TB.setLogLevel(TB.DEBUG);

    var session = TB.initSession(sessionId);

    session.addEventListener('sessionConnected', sessionConnectedHandler);
    session.addEventListener('streamCreated', streamCreatedHandler)
    session.connect(apiKey, token);

    var publisher;
    var connections = {}

    

    function sessionConnectedHandler(event) {
        console.log("connected")
        publisher = session.publish('video');
        socket.emit('subscribeToStream',{"room": room, "id" : session.connection.connectionId});
    }

    function streamCreatedHandler(event) {
        socket.emit('createdStream',{"room" : room, "stream" : event.streams[0], "myId" : session.connection.connectionId})
    }

    function addStream(stream) {
        var div = document.createElement('div');
        var divId = stream.streamId
        div.setAttribute('id', divId);
        document.getElementById("subscribers").appendChild(div)
        session.subscribe(stream,divId)
    }

    socket.on('subscribe', function (videoIdsIdStreams) {
        console.log("subscribing")
        var id = videoIdsIdStreams.myid;
        //var videoids = videoIdsIdStreams.videoIds
        var streams = videoIdsIdStreams.streams
        
        for (var i = 0; i < streams.length; i++) {
            var stream = streams[i]
            console.log(stream.connection.connectionId)
            console.log(session.connection.connectionId)
            console.log(stream.connection.connectionId != session.connection.connectionId)
            if ((stream.connection.connectionId != session.connection.connectionId) && ((stream in connections) == false)) {
                addStream(stream);
                console.log("addStream")
                connections[stream] = true
            }
        }     
    });
})
