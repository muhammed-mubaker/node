// routes/ChannelsRoutes.js
const express = require('express');
const db = require('../db');

const router = express.Router();


// Get all channels for a specific user with unread message count
router.get('/:userId', (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT channels.id, channels.name, COUNT(messages.id) AS unread_count
        FROM channels
        LEFT JOIN messages ON channels.id = messages.channel_id AND messages.read_status = 2 AND messages.user_id != ?
        JOIN channel_members ON channels.id = channel_members.channel_id
        WHERE channel_members.user_id = ?
        GROUP BY channels.id, channels.name
    `;
    db.query(query, [userId, userId], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).json(results);
    });
});

// Create a new channel or get the existing one
router.post('/create-or-get', (req, res) => {
    const { user1, user2, creator_id, user2_id } = req.body;

    const channelName1 = `${user1}_${user2}`;
    const channelName2 = `${user2}_${user1}`;

    // Check if a channel already exists
    const query = 'SELECT * FROM channels WHERE name IN (?, ?)';
    db.query(query, [channelName1, channelName2], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        if (results.length > 0) {
            // Channel already exists
            res.status(200).json({ channel_id: results[0].id });
        } else {
            // Create a new channel
            const insertQuery = 'INSERT INTO channels (name, creator_id) VALUES (?, ?)';
            db.query(insertQuery, [channelName1, creator_id], (err, results) => {
                if (err) {
                    return res.status(500).send(err);
                }
                const newChannelId = results.insertId;

                // Add both users to the channel
                const channelMembersQuery = 'INSERT INTO channel_members (user_id, channel_id) VALUES (?, ?), (?, ?)';
                db.query(channelMembersQuery, [creator_id, newChannelId, user2_id, newChannelId], (err, results) => {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    res.status(201).json({ channel_id: newChannelId });
                });
            });
        }
    });
});

// Join a channel

// Join a channel and return channel members
router.post('/join', (req, res) => {
    const { userId, channelId } = req.body;

    const query = 'SELECT * FROM channel_members WHERE user_id = ? AND channel_id = ?';
    db.query(query, [userId, channelId], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        if (results.length === 0) {
            const insertQuery = 'INSERT INTO channel_members (user_id, channel_id) VALUES (?, ?)';
            db.query(insertQuery, [userId, channelId], (err) => {
                if (err) {
                    return res.status(500).send(err);
                }

                // Get the list of members for the channel
                const membersQuery = `
                    SELECT users.id, users.username ,user_notification_channel
                    FROM channel_members
                    JOIN users ON channel_members.user_id = users.id
                    WHERE channel_members.channel_id = ?
                `;
                db.query(membersQuery, [channelId], (err, members) => {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    res.status(201).json({
                        message: 'Joined channel successfully',
                        members
                    });
                });
            });
        } else {
            // Get the list of members for the channel
            const membersQuery = `
                SELECT users.id, users.username ,user_notification_channel
                FROM channel_members
                JOIN users ON channel_members.user_id = users.id
                WHERE channel_members.channel_id = ?
            `;
            db.query(membersQuery, [channelId], (err, members) => {
                if (err) {
                    return res.status(500).send(err);
                }
                res.status(200).json({
                    message: 'Already a member of the channel',
                    members
                });
            });
        }
    });
});


// Get all messages in a specific channel and mark them as read
router.get('/messages/:channelId', (req, res) => {
    const channelId = req.params.channelId;

    const query = `
        SELECT messages.id, messages.user_id, messages.message, messages.time_sent, messages.read_status, users.username
        FROM messages
        JOIN users ON messages.user_id = users.id
        WHERE messages.channel_id = ?
        ORDER BY messages.time_sent ASC
    `;
    db.query(query, [channelId], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        // Update messages to read_status 1
        const updateQuery = 'UPDATE messages SET read_status = 1 WHERE channel_id = ?';
        db.query(updateQuery, [channelId], (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.status(200).json(results);
        });
    });
});

module.exports = router;
