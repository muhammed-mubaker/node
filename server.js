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

app.use(bodyParser.json());
app.use(cors({
    origin: '*', // Allow requests from this origin
}));

app.use(express.static('client/build'));
// app.use('/api', api);
// app.use('/api/channels', channelsRoutes);
app.post('/socket', async (req, res) => {

    const { channel_id, message, receiver_channel } = req.body;
    const { key, from } = req.headers;
    console.log(key);
    if (key !== "dg_MiOGsulfNyfdD8") {
        res.send({ code: 0, message: "error" });
    }
    io.to(`${channel_id}`).emit('message', message);
    //send notification to reviver
    res.send({ code: 1, message: "done" });


});
// Handle a new connection
io.on('connection', (socket) => {
    console.log('New client connected');





    // Handle joining a channel
    socket.on('joinChannel', ({ channel_id }) => {
        // Join the user to the specific channel room
        console.log("channel_id", channel_id);
        socket.join(`${channel_id}`);
        io.to(`${channel_id}`).emit('message', { type: 1, message: "new message" });

    });

    socket.on('notification', ({ channel_id, message }) => {
        // Join the user to the specific channel room
        console.log("channel_idddd", channel_id);
        io.to(`channel-${channel_id}`).emit('notification', { type: 1, message: "new message" });
    });



    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
