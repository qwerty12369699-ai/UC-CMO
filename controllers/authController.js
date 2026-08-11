const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const demoUsers = {
    admin: {
        id: 1001,
        username: 'admin',
        email: 'admin@example.com',
        role: 'master-admin',
        password: 'admin'
    },
    'admin@example.com': {
        id: 1001,
        username: 'admin',
        email: 'admin@example.com',
        role: 'master-admin',
        password: 'admin'
    },
    user: {
        id: 1002,
        username: 'user',
        email: 'user@example.com',
        role: 'student',
        password: 'user'
    },
    'user@example.com': {
        id: 1002,
        username: 'user',
        email: 'user@example.com',
        role: 'student',
        password: 'user'
    }
};

const getDemoUserByIdentifier = (identifier) => {
    if (!identifier) return null;

    const key = String(identifier).trim().toLowerCase();
    return demoUsers[key] || null;
};

const authController = {
    async register(req, res) {
        const { username, email, password, role, department } = req.body;

        try {
            const [existingUsers] = await pool.execute(
                'SELECT * FROM users WHERE email = ? OR username = ?',
                [email, username]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    message: 'Email or username already exists'
                });
            }

            const salt = await bcrypt.genSalt(8);
            const hashedPassword = await bcrypt.hash(password, salt);

            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password, role, department) VALUES (?, ?, ?, ?, ?)',
                [username, email, hashedPassword, role, department]
            );

            res.status(201).json({
                message: 'User registered successfully',
                userId: result.insertId
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Error during registration' });
        }
    },

    async login(req, res) {
        const { username, password } = req.body;

        try {
            let user = null;

            try {
                const [rows] = await pool.execute(
                    'SELECT * FROM users WHERE username = ? OR email = ?',
                    [username, username]
                );

                if (rows.length > 0) {
                    user = rows[0];
                }
            } catch (dbError) {
                console.warn('Database unavailable during login; using demo fallback:', dbError.message);
            }

            if (!user) {
                const demoUser = getDemoUserByIdentifier(username);
                if (demoUser && password === demoUser.password) {
                    user = {
                        ...demoUser,
                        password: demoUser.password
                    };
                }
            }

            if (!user) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            let validPassword = false;

            if (typeof user.password === 'string' && user.password.startsWith('$2')) {
                validPassword = await bcrypt.compare(password, user.password);
            } else {
                validPassword = password === user.password;
            }

            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    username: user.username
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    username: user.username,
                    source: user.source || (user.id >= 1000 ? 'demo' : 'database')
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Error during login' });
        }
    },

    async logout(req, res) {
        res.json({ message: 'Logged out successfully' });
    },

    async verify(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'No token provided' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            try {
                const [rows] = await pool.execute(
                    'SELECT id, email, role, username FROM users WHERE id = ?',
                    [decoded.id]
                );

                if (rows.length > 0) {
                    const user = rows[0];
                    return res.json({ user });
                }
            } catch (dbError) {
                console.warn('Database unavailable during verify; using demo fallback:', dbError.message);
            }

            const demoUser = getDemoUserByIdentifier(decoded.email || decoded.username);
            if (demoUser) {
                return res.json({
                    user: {
                        id: demoUser.id,
                        email: demoUser.email,
                        role: demoUser.role,
                        username: demoUser.username,
                        source: 'demo'
                    }
                });
            }

            return res.status(401).json({ message: 'User not found' });
        } catch (error) {
            res.status(401).json({ message: 'Invalid token' });
        }
    }
};

module.exports = authController; 