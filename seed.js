#!/usr/bin/env node

const { seedUsers } = require('./seeders/userSeeder');

console.log('🌱 Starting database seeding...\n');

async function runSeeders() {
  try {
    await seedUsers();
    console.log('\n✅ All seeders completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

runSeeders();
