const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const userRoutes = require('./routes/UserRoutes');
const channelsRoutes = require('./routes/ChannelsRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:3000', // Allow requests from this origin
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(bodyParser.json());
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from this origin
}));

app.use(express.static('client/build'));
app.use('/api/users', userRoutes);
app.use('/api/channels', channelsRoutes);

// Handle a new connection
io.on('connection', (socket) => {
    console.log('New client connected');


    // Handle incoming messages
    socket.on('message', (data) => {
        const { channel_id, user_id, message,receiver_channel } = data;

        // Insert the message into the database with read_status 2
        const query = 'INSERT INTO messages (channel_id, user_id, message, read_status) VALUES (?, ?, ?, 2)';
        db.query(query, [channel_id, user_id, message], (err, results) => {
            if (err) {
                console.error('Error storing message:', err);
                return;
            }

            // Get the full message object, including the username and timestamp
            const getMessageQuery = `
                SELECT messages.id, messages.user_id, messages.message, messages.time_sent, messages.read_status, users.username, messages.channel_id
                FROM messages
                JOIN users ON messages.user_id = users.id
                WHERE messages.id = ?
            `;
            db.query(getMessageQuery, [results.insertId], (err, messageResults) => {
                if (err) {
                    console.error('Error fetching message:', err);
                    return;
                }

                const fullMessage = messageResults[0];

                // Broadcast the message to the specific channel
                io.to(`channel-${channel_id}`).emit('message', fullMessage);
                //send notification to reviver
                if(receiver_channel && receiver_channel?.length > 0){
                    console.log("receiver_channel",receiver_channel);
                    for (let index = 0; index < receiver_channel.length; index++) {
                        io.to(`channel-${receiver_channel[index]}`).emit('notification', {type:1,message:"new_message"});
                    }
                }
            });
        });
    });

    // Handle joining a channel
    socket.on('joinChannel', ({ user_id, channel_id }) => {
        // Join the user to the specific channel room
        console.log("channel_id",channel_id);
        socket.join(`channel-${channel_id}`);
    });

    socket.on('notification', ({ user_id, channel_id,message }) => {
        // Join the user to the specific channel room
        console.log("channel_id",channel_id);
        io.to(`channel-${channel_id}`).emit('notification', {type:1, message:"new message"});
    });



    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
