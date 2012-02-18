window.onload = function() {
	var room = $('#room').val()
	var user = $('#user').val()
	history.replaceState({}, room, "/"+room+"?user="+user)
	var socket = io.connect('/')

	$('#magazine').bind('turned', function(err, page) {
		socket.emit('turnToPage', page)
	})

	socket.on('connect', function() {
		socket.emit('setRoomAndUser', {room:room, user:user})
	})

	socket.on('turnToPage', function(page) {
		$('#magazine').turn('page', page)
	})
}
