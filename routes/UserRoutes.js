// routes/UserRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();
// Generate user notification channel
const generateNotificationChannel = (userId) => `${userId}CH`;

// Register a new user
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';



    db.query(query, [username, hashedPassword], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        const userId = results.insertId;
        const notificationChannel = generateNotificationChannel(userId);
        const updateQuery = 'UPDATE users SET user_notification_channel = ? WHERE id = ?';
        db.query(updateQuery, [notificationChannel, userId], (err) => {
            if (err) {
                return res.status(500).send(err);
            }

            res.status(201).json({
                id: userId,
                username,
                notification_channel: notificationChannel
            });
        });

        res.status(201).send('User registered successfully');
    });
});

// Login a user
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (results.length === 0) {
            return res.status(401).send('User not found');
        }

        const user = results[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).send('Invalid password');
        }
        res.status(200).json({
            id: user.id,
            email: user.email,
            username: user.username,
            notification_channel: user.user_notification_channel
        });
    });
});

// Get all users excluding the requester
router.get('/all/:userId', (req, res) => {
    const userId = req.params.userId;

    const query = 'SELECT id AS user_id, username AS userName, user_notification_channel FROM users WHERE id != ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        res.status(200).json({
            success: true,
            data: results
        });
    });
});

module.exports = router;
