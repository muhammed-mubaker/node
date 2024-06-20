const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const router = express.Router();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // Allow requests from this origin
        methods: ['GET', 'POST'],
        credentials: true
    }
});
let onlineUsers = [];

app.use(bodyParser.json());
app.use(cors({
    origin: '*', // Allow requests from this origin
}));

app.use(express.static('client/build'));
// app.use('/api', api);
// app.use('/api/channels', channelsRoutes);
app.post('/socket', async (req, res) => {

    const { type, channel_id, message, receiver_channel } = req.body[0];
    const { key, from } = req.headers;
    if (key !== "dg_MiOGsulfNyfdD8") {
        res.send({ code: 0, message: "You\'re not allowed to do this action" });
    }

    if (message) {
        io.to(channel_id).emit('message', message);
    } 
    console.log(receiver_channel);
    if (receiver_channel) {
        io.to(receiver_channel).emit('notification', message);
    } 

     



    //send notification to reviver
    res.send({ code: 1, message: channel_id });


});
// Handle a new connection
io.on('connection', (socket) => {
    console.log('New client connected');
    io.emit("online_users", onlineUsers);

    socket.on("add_new_user", (user_id) => {
        !onlineUsers.some((user) => user.user_id === user_id && user.socket_id === socket.id) &&
            onlineUsers.push({
                user_id,
                socket_id: socket.id
            });
        console.log("onlineUsers", onlineUsers);
        io.emit("online_users", onlineUsers);

    });



    // Handle joining a channel
    socket.on('joinChannel', ({ channel_id }) => {
        // Join the user to the specific channel room
        console.log("channel_id", channel_id);
        socket.join(`${channel_id}`);

    });

    socket.on('notification', ({ channel_id, message }) => {
        // Join the user to the specific channel room
        console.log("channel_idddd", channel_id);
        io.to(`channel-${channel_id}`).emit('notification', { type: 1, message: "new message" });
    });



    socket.on('disconnect', () => {
        onlineUsers = onlineUsers.filter((user) => user.socket_id !== socket.id);
        io.emit("online_users", onlineUsers);
        console.log("onlineUsers", onlineUsers);

        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
