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

    // Join user to their notification channel on connection
    socket.on('joinNotificationChannel', ({ user_id, notification_channel }) => {
        socket.join(notification_channel);
    });

    // Handle incoming messages
    socket.on('message', (data) => {
        const { channel_id, user_id, message } = data;

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

                // Notify all users in the channel about the new message
                const getUsersQuery = `
                    SELECT users.user_notification_channel
                    FROM channel_members
                    JOIN users ON channel_members.user_id = users.id
                    WHERE channel_members.channel_id = ?
                `;
                db.query(getUsersQuery, [channel_id], (err, users) => {
                    if (err) {
                        console.error('Error fetching users:', err);
                        return;
                    }

                    users.forEach(user => {
                        io.to(user.user_notification_channel).emit('new_messages_event', { message: 'new messages' });
                    });
                });
            });
        });
    });

    // Handle joining a channel
    socket.on('joinChannel', ({ user_id, channel_id }) => {
        // Join the user to the specific channel room
        socket.join(`channel-${channel_id}`);

        // Update all messages to read_status 1
        const updateQuery = 'UPDATE messages SET read_status = 1 WHERE channel_id = ? AND read_status = 2';
        db.query(updateQuery, [channel_id], (err) => {
            if (err) {
                console.error('Error updating message status:', err);
            }
            // Notify other users in the channel to refresh messages
            io.to(`channel-${channel_id}`).emit('update_read', { channel_id });
        });
    });

    // Handle reading a message (renamed to update_read)
    socket.on('update_read', ({ message_id, channel_id, reader_id }) => {
        // Update the message read_status to 1
        const updateQuery = 'UPDATE messages SET read_status = 1 WHERE id = ?';
        db.query(updateQuery, [message_id], (err) => {
            if (err) {
                console.error('Error updating message status:', err);
            }
            // Notify the sender to refresh messages
            io.to(`channel-${channel_id}`).emit('update_read', { channel_id });
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
