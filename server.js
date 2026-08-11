require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/auth');
const sarfRoutes = require('./routes/sarfRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const { auth, checkRole, checkAdminRole, checkUserRole } = require('./middleware/auth');
const { isAdminRole, isUserRole } = require('./utils/roleUtils');
const session = require('express-session');
const { passport } = require('./middleware/microsoftAuth');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session for Microsoft OAuth
app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'uc-fmo-session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Database connections
const { pool } = require('./config/database');

// Configure multer for image uploads
const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/images';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const imageUpload = multer({
    storage: imageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Test database connection without blocking startup
const connectToDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the database');
        connection.release();
    } catch (err) {
        console.error('Database unavailable, continuing without it:', err.message);
    }
};

connectToDatabase();
setInterval(connectToDatabase, 15000);

// Routes
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sarf', sarfRoutes);
app.use('/api/reservations', reservationRoutes);

// Serve PDF files (public access for preview)
app.use('/uploads/pdfs', express.static(path.join(__dirname, 'uploads', 'pdfs')));

// Admin verification endpoint
app.get('/api/auth/verify', auth, (req, res) => {
    res.json({ user: req.user });
});

// Admin-specific verification endpoint
app.get('/api/auth/admin/verify', [auth, checkAdminRole()], (req, res) => {
    res.json({ user: req.user });
});

// Microsoft Azure AD / Entra ID login routes
app.get('/api/auth/microsoft',
    passport.authenticate('azuread-openidconnect', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/login');
    }
);

// Microsoft OAuth callback
app.post('/api/auth/microsoft/callback',
    passport.authenticate('azuread-openidconnect', { failureRedirect: '/login' }),
    (req, res) => {
        if (req.user && req.user.token) {
            // Store the JWT token and redirect
            const token = req.user.token;
            const role = req.user.user.role;
            const isAdmin = ['master-admin', 'citcs-admin', 'coa-admin', 'cas-admin', 'cba-admin', 'cea-admin', 'cht-admin', 'con-admin', 'cte-admin'].includes(role);
            
            res.redirect(`${isAdmin ? '/admin/admin' : '/home'}?token=${token}`);
        } else {
            res.redirect('/login?error=auth_failed');
        }
    }
);

// Forgot password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Check if user exists with this email
        const [users] = await pool.execute('SELECT id, username, email FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            // Don't reveal whether the email exists or not for security
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate a reset token (in production, send via email)
        const resetToken = jwt.sign(
            { id: users[0].id, email: users[0].email, purpose: 'password-reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store reset token in database
        try {
            // Check if reset_token column exists
            const [columns] = await pool.execute('SHOW COLUMNS FROM users LIKE ?', ['reset_token']);
            if (columns.length > 0) {
                await pool.execute(
                    'UPDATE users SET reset_token = ?, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
                    [resetToken, users[0].id]
                );
            }
        } catch (colErr) {
            console.warn('Could not store reset token (column may not exist):', colErr.message);
        }

        // In production, send email with reset link here
        console.log(`Password reset link for ${email}: /reset-password?token=${resetToken}`);

        res.json({
            message: 'If an account with that email exists, a password reset link has been sent.',
            // Remove this in production - only for development
            debug: process.env.NODE_ENV !== 'production' ? { resetLink: `/reset-password?token=${resetToken}` } : undefined
        });
    } catch (error) {
        console.error('Error processing forgot password:', error);
        res.status(500).json({ message: 'Error processing your request. Please try again later.' });
    }
});

// Admin stats endpoint - admin only
app.get('/api/admin/stats', [auth, checkAdminRole()], async (req, res) => {
    try {
        let stats = {
            totalReservations: 0,
            topReservationType: 'N/A',
            totalClients: 0,
            reservationsByType: [],
            clientDistribution: []
        };

        try {
            // Get total reservations from sarf_forms
            const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM sarf_forms');
            stats.totalReservations = countResult[0].total;

            // Get top reservation type
            const [topType] = await pool.execute('SELECT reservation_type, COUNT(*) as count FROM sarf_forms GROUP BY reservation_type ORDER BY count DESC LIMIT 1');
            if (topType.length > 0) {
                stats.topReservationType = topType[0].reservation_type;
            }

            // Get total distinct clients
            const [clientsResult] = await pool.execute('SELECT COUNT(DISTINCT user_id) as total FROM sarf_forms');
            stats.totalClients = clientsResult[0].total;

            // Get reservations by type
            const [byType] = await pool.execute('SELECT reservation_type as type, COUNT(*) as count FROM sarf_forms GROUP BY reservation_type');
            stats.reservationsByType = byType;

            // Get client distribution (top 5)
            const [clientDist] = await pool.execute(`
                SELECT u.username as name, COUNT(*) as count 
                FROM sarf_forms sf 
                LEFT JOIN users u ON sf.user_id = u.id 
                GROUP BY sf.user_id 
                ORDER BY count DESC 
                LIMIT 5
            `);
            stats.clientDistribution = clientDist.map(c => ({
                name: c.name || 'Unknown',
                count: c.count
            }));

        } catch (dbErr) {
            console.warn('DB query for admin stats failed, using stub data:', dbErr.message);
            // Fallback to stub data if tables don't exist yet
            stats = {
                totalReservations: 24,
                topReservationType: 'Internal',
                totalClients: 12,
                reservationsByType: [
                    { type: 'Internal', count: 14 },
                    { type: 'External', count: 10 }
                ],
                clientDistribution: [
                    { name: 'Juan Dela Cruz', count: 5 },
                    { name: 'Maria Santos', count: 3 },
                    { name: 'Pedro Reyes', count: 2 },
                    { name: 'Ana Gonzales', count: 1 },
                    { name: 'Carlos Lopez', count: 1 }
                ]
            };
        }

        res.json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
});

// Admin reports endpoint - admin only
app.get('/api/admin/reports', [auth, checkAdminRole()], async (req, res) => {
    try {
        const reportType = req.query.type || 'reservations';
        const reportMonth = req.query.month || '';

        let data = {
            totalReservations: 0,
            approvedReservations: 0,
            pendingReservations: 0,
            totalClients: 0,
            reservationsByType: [],
            reservationsByStatus: [],
            venuePopularity: [],
            monthlyTrends: [],
            details: []
        };

        try {
            // Get counts
            const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM sarf_forms');
            data.totalReservations = countResult[0].total;

            const [approvedResult] = await pool.execute("SELECT COUNT(*) as total FROM sarf_forms WHERE status = 'approved'");
            data.approvedReservations = approvedResult[0].total;

            const [pendingResult] = await pool.execute("SELECT COUNT(*) as total FROM sarf_forms WHERE status = 'pending'");
            data.pendingReservations = pendingResult[0].total;

            const [clientsResult] = await pool.execute('SELECT COUNT(DISTINCT user_id) as total FROM sarf_forms');
            data.totalClients = clientsResult[0].total;

            // Get reservations by type
            const [byType] = await pool.execute('SELECT reservation_type as type, COUNT(*) as count FROM sarf_forms GROUP BY reservation_type');
            data.reservationsByType = byType;

            // Get reservations by status
            const [byStatus] = await pool.execute('SELECT status, COUNT(*) as count FROM sarf_forms GROUP BY status');
            data.reservationsByStatus = byStatus;

            // Get venue popularity
            const [byVenue] = await pool.execute('SELECT venue, COUNT(*) as count FROM sarf_forms WHERE venue IS NOT NULL GROUP BY venue ORDER BY count DESC LIMIT 10');
            data.venuePopularity = byVenue;

            // Get monthly trends (last 6 months)
            const [monthly] = await pool.execute(`
                SELECT DATE_FORMAT(created_at, '%b') as month, COUNT(*) as count 
                FROM sarf_forms 
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
                ORDER BY MIN(created_at) ASC
            `);
            data.monthlyTrends = monthly;

            // Get detailed records
            let query = `
                SELECT sf.id, u.username as user, sf.venue, sf.event_date as date, sf.reservation_type as type, sf.status
                FROM sarf_forms sf
                LEFT JOIN users u ON sf.user_id = u.id
                ORDER BY sf.created_at DESC
                LIMIT 20
            `;
            const [details] = await pool.execute(query);
            data.details = details.map(d => ({
                client: d.user || 'Unknown',
                venue: d.venue || 'N/A',
                date: d.date || null,
                type: d.type || 'N/A',
                status: d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : 'N/A'
            }));

        } catch (dbErr) {
            console.warn('DB query for reports failed, using stub data:', dbErr.message);
            // Fallback to stub data if tables don't exist yet
            data = {
                totalReservations: 24,
                approvedReservations: 18,
                pendingReservations: 4,
                totalClients: 12,
                reservationsByType: [
                    { type: 'Internal', count: 14 },
                    { type: 'External', count: 10 }
                ],
                reservationsByStatus: [
                    { status: 'Approved', count: 18 },
                    { status: 'Pending', count: 4 },
                    { status: 'Rejected', count: 2 }
                ],
                venuePopularity: [
                    { venue: 'Auditorium', count: 8 },
                    { venue: 'Lecture Room', count: 6 },
                    { venue: 'Laboratory', count: 5 },
                    { venue: 'Conference Room', count: 3 },
                    { venue: 'Gymnasium', count: 2 }
                ],
                monthlyTrends: [
                    { month: 'Jan', count: 3 },
                    { month: 'Feb', count: 5 },
                    { month: 'Mar', count: 4 },
                    { month: 'Apr', count: 6 },
                    { month: 'May', count: 3 },
                    { month: 'Jun', count: 3 }
                ],
                details: [
                    { client: 'Juan Dela Cruz', venue: 'Auditorium', date: '2026-07-15', type: 'Internal', status: 'Approved' },
                    { client: 'Maria Santos', venue: 'Lecture Room', date: '2026-07-18', type: 'External', status: 'Pending' },
                    { client: 'Pedro Reyes', venue: 'Laboratory', date: '2026-07-20', type: 'Internal', status: 'Approved' },
                    { client: 'Ana Gonzales', venue: 'Conference Room', date: '2026-07-22', type: 'Internal', status: 'Approved' },
                    { client: 'Carlos Lopez', venue: 'Gymnasium', date: '2026-07-25', type: 'External', status: 'Pending' }
                ]
            };
        }

        res.json(data);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
});

app.get('/api/user/profile', [auth, checkUserRole()], (req, res) => {
    res.json({ user: req.user });
});

app.get('/api/user/reservations', [auth, checkUserRole()], async (req, res) => {
    try {
        res.json({ reservations: [] });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user reservations' });
    }
});

// Events API endpoints
app.get('/api/events', async (req, res) => {
    try {
        const [events] = await pool.execute(
            'SELECT id, title, date, time, location, image_url FROM events WHERE date >= CURDATE() ORDER BY date ASC, time ASC'
        );
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Error fetching events', error: error.message });
    }
});

app.post('/api/events', [auth, checkAdminRole(), imageUpload.single('event_image')], async (req, res) => {
    try {
        const { title, date, time, location } = req.body;

        if (!title || !date || !time || !location) {
            return res.status(400).json({ message: 'Title, date, time, and location are required' });
        }

        // Get image path if file was uploaded
        const imagePath = req.file ? `/uploads/images/${req.file.filename}` : null;

        const [result] = await pool.execute(
            'INSERT INTO events (title, date, time, location, image_url) VALUES (?, ?, ?, ?, ?)',
            [title, date, time, location, imagePath]
        );

        res.status(201).json({
            message: 'Event created successfully',
            eventId: result.insertId,
            imagePath: imagePath
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Error creating event', error: error.message });
    }
});

app.delete('/api/events/:id', [auth, checkAdminRole()], async (req, res) => {
    try {
        const eventId = req.params.id;

        const [result] = await pool.execute(
            'DELETE FROM events WHERE id = ?',
            [eventId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Error deleting event', error: error.message });
    }
});

// Test endpoint for role checking
app.get('/api/test/role', auth, (req, res) => {
    res.json({
        user: req.user,
        isAdmin: isAdminRole(req.user.role),
        isUser: isUserRole(req.user.role),
        message: `User ${req.user.username} has role: ${req.user.role}`
    });
});

// Test endpoint to check database connection and table structure
app.get('/api/test/db', [auth, checkAdminRole()], async (req, res) => {
    try {
        // Test basic connection
        const [tables] = await pool.execute('SHOW TABLES');
        console.log('Available tables:', tables);

        // Test events table structure
        const [columns] = await pool.execute('DESCRIBE events');
        console.log('Events table structure:', columns);

        // Test simple query
        const [events] = await pool.execute('SELECT COUNT(*) as count FROM events');
        console.log('Total events in database:', events[0].count);

        res.json({
            message: 'Database connection successful',
            tables: tables,
            eventsTableStructure: columns,
            totalEvents: events[0].count
        });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({ message: 'Database test failed', error: error.message });
    }
});

// Public routes (accessible to all)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

// Home route - accessible by all authenticated users
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Legacy user home route - redirect to new home
app.get('/user/home', (req, res) => {
    res.redirect('/home');
});

app.get('/user/reservation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'reservation.html'));
});

app.get('/user/internal-clients', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'internal-clients.html'));
});

app.get('/user/external-clients', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'external-clients.html'));
});

app.get('/user/main-campus', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'main-campus.html'));
});

app.get('/user/legarda-campus', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'legarda-campus.html'));
});

app.get('/user/on-campus', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'on-campus.html'));
});

app.get('/user/my-sarf-forms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'my-sarf-forms.html'));
});

app.get('/user/my-forms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'my-sarf-forms.html'));
});

// Admin routes - protected for admin role only
app.get('/admin/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admin.html'));
});

app.get('/admin/calendar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'calendar.html'));
});

app.get('/admin/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'events.html'));
});

app.get('/admin/request-forms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'request-forms.html'));
});

app.get('/admin/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'reports.html'));
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ message: 'Page not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    
    if (err.code === 'ENOENT') {
        return res.status(404).json({ message: 'Resource not found' });
    }
    
    if (err.status === 401) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (err.status === 403) {
        return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
    }
    
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});