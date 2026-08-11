const passport = require('passport');
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');

// Microsoft Azure AD / Entra ID configuration
// These values come from your Azure AD app registration
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;

const MICROSOFT_CONFIG = {
    identityMetadata: `https://login.microsoftonline.com/${AZURE_TENANT_ID || 'common'}/v2.0/.well-known/openid-configuration`,
    clientID: AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    responseType: 'code id_token',
    responseMode: 'form_post',
    redirectUrl: process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/api/auth/microsoft/callback',
    allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
    scope: ['openid', 'profile', 'email', 'User.Read'],
    loggingLevel: 'warn',
    nonceLifetime: 3600,
    nonceMaxAmount: 10,
    usePKCE: true
};

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Only configure Azure AD strategy if environment variables are set
const azureConfigured = AZURE_CLIENT_ID && AZURE_TENANT_ID && process.env.AZURE_CLIENT_SECRET;

if (azureConfigured) {
    try {
        const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

        // Configure passport with Azure AD strategy
        passport.use(new OIDCStrategy(MICROSOFT_CONFIG,
            async (iss, sub, profile, accessToken, refreshToken, params, done) => {
                try {
                    const email = profile._json?.email || profile._json?.preferred_username || profile.upn;
                    const displayName = profile.displayName || email?.split('@')[0] || 'User';
                    const microsoftId = profile.oid || sub;

                    if (!email) {
                        return done(new Error('No email returned from Microsoft account'));
                    }

                    // Check if user already exists in our database
                    const [existingUsers] = await pool.execute(
                        'SELECT * FROM users WHERE email = ? OR microsoft_id = ?',
                        [email, microsoftId]
                    );

                    let user;
                    if (existingUsers.length > 0) {
                        user = existingUsers[0];
                        // Update microsoft_id if not set
                        if (!user.microsoft_id) {
                            await pool.execute(
                                'UPDATE users SET microsoft_id = ? WHERE id = ?',
                                [microsoftId, user.id]
                            );
                        }
                    } else {
                        // Create new user from Microsoft account
                        // Default role is 'student' - admins must be assigned manually
                        const [result] = await pool.execute(
                            'INSERT INTO users (username, email, password, role, microsoft_id) VALUES (?, ?, ?, ?, ?)',
                            [displayName.replace(/\s+/g, '_').toLowerCase(), email, '', 'student', microsoftId]
                        );
                        user = {
                            id: result.insertId,
                            username: displayName.replace(/\s+/g, '_').toLowerCase(),
                            email: email,
                            role: 'student'
                        };
                    }

                    // Generate JWT token for our app
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

                    return done(null, { user, token });
                } catch (error) {
                    console.error('Microsoft auth error:', error);
                    return done(error);
                }
            }
        ));

        console.log('Microsoft Azure AD authentication configured successfully');
    } catch (error) {
        console.warn('Could not configure Azure AD strategy:', error.message);
    }
} else {
    console.log('Microsoft Azure AD authentication not configured (AZURE_CLIENT_ID, AZURE_TENANT_ID, or AZURE_CLIENT_SECRET missing). Use regular email/password login.');
}

module.exports = { passport, MICROSOFT_CONFIG };
