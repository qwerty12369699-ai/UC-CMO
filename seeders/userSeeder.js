const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

// Admin users data
const adminUsers = [
  {
    username: 'admin',
    email: 'admin@example.com',
    role: 'master-admin',
    password: 'admin'
  },
  {
    username: 'master_admin',
    email: 'master.admin@uc-bcf.edu.ph',
    role: 'master-admin',
    password: 'admin'
  },
  {
    username: 'citcs_admin',
    email: 'citcs.admin@uc-bcf.edu.ph',
    role: 'citcs-admin',
    password: 'admin'
  },
  {
    username: 'coa_admin',
    email: 'coa.admin@uc-bcf.edu.ph',
    role: 'coa-admin',
    password: 'admin'
  },
  {
    username: 'cas_admin',
    email: 'cas.admin@uc-bcf.edu.ph',
    role: 'cas-admin',
    password: 'admin'
  },
  {
    username: 'cba_admin',
    email: 'cba.admin@uc-bcf.edu.ph',
    role: 'cba-admin',
    password: 'admin'
  },
  {
    username: 'cea_admin',
    email: 'cea.admin@uc-bcf.edu.ph',
    role: 'cea-admin',
    password: 'admin'
  },
  {
    username: 'cht_admin',
    email: 'cht.admin@uc-bcf.edu.ph',
    role: 'cht-admin',
    password: 'admin'
  },
  {
    username: 'con_admin',
    email: 'con.admin@uc-bcf.edu.ph',
    role: 'con-admin',
    password: 'admin'
  },
  {
    username: 'cte_admin',
    email: 'cte.admin@uc-bcf.edu.ph',
    role: 'cte-admin',
    password: 'admin'
  }
];

// User accounts for testing
const userAccounts = [
  {
    username: 'user',
    email: 'user@example.com',
    role: 'student',
    password: 'user'
  }
];

const allUsers = [...adminUsers, ...userAccounts];

async function seedUsers() {
  try {
    console.log('Using configured database pool for seeding...\n');

    for (const user of allUsers) {
      try {
        const [existingUsers] = await pool.execute(
          'SELECT id FROM users WHERE username = ? OR email = ?',
          [user.username, user.email]
        );

        if (existingUsers.length > 0) {
          const existingUser = existingUsers[0];

          if (!existingUser.role) {
            await pool.execute(
              'UPDATE users SET role = ? WHERE id = ?',
              [user.role, existingUser.id]
            );
            console.log(`Updated role for ${user.username} to ${user.role}`);
          } else {
            console.log(`User ${user.username} already exists, skipping...`);
          }

          continue;
        }

        const hashedPassword = await bcrypt.hash(user.password, 10);

        const [result] = await pool.execute(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          [user.username, user.email, hashedPassword, user.role]
        );

        console.log(`✅ Created ${user.role}: ${user.username} (${user.email})`);
        
      } catch (error) {
        console.error(`❌ Error creating user ${user.username}:`, error.message);
      }
    }

    console.log('\n🎉 User seeding completed!');
    console.log('\n📋 Login Credentials:');
    console.log('================================');
    
    allUsers.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Database seeding error:', error.message);
  }
}

// Run the seeder
if (require.main === module) {
  seedUsers();
}

module.exports = { seedUsers, adminUsers };