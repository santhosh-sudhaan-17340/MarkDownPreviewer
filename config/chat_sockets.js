module.exports.chatSockets = function(socketServer){
    let io = require('socket.io')(socketServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.sockets.on('connection', function(socket){
        console.log('New connection received', socket.id);

        socket.on('disconnect', function(){
            console.log('Socket disconnected!');
        });

        socket.on('join_room', function(data){
            console.log('Joining request received', data);
            socket.join(data.chatroom);
            io.in(data.chatroom).emit('user_joined', data);
        });

        // Detect send_message and broadcast to everyone in the room
        socket.on('send_message', function(data){
            io.in(data.chatroom).emit('receive_message', data);
        });
    });
};
