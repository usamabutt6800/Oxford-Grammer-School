import mongoose from 'mongoose';
import User from '../modules/users/models/User.js';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createAdmin = async () => {
  try {
    console.log('🚀 Oxford Grammar School - Admin Creation Tool\n');
    console.log('⚠️  This tool will create the initial admin user.');
    console.log('⚠️  Make sure MongoDB is running.\n');

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oxford_school';
    console.log(`Connecting to MongoDB at: ${mongoURI}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin already exists in the system.');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log('👉 Please use the login page instead.');
      process.exit(1);
    }

    // Get admin details
    const name = await question('👤 Enter admin name: ');
    const email = await question('📧 Enter admin email: ');
    
    let password = '';
    let confirmPassword = '';
    
    do {
      password = await question('🔐 Enter password (min 6 characters): ');
      if (password.length < 6) {
        console.log('❌ Password must be at least 6 characters');
      }
    } while (password.length < 6);
    
    do {
      confirmPassword = await question('🔐 Confirm password: ');
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match');
      }
    } while (password !== confirmPassword);
    
    const phone = await question('📱 Enter phone number (optional): ');

    console.log('\n📋 Review Admin Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${phone || 'Not provided'}`);
    
    const confirm = await question('\n✅ Create admin? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Admin creation cancelled.');
      rl.close();
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      name,
      email,
      password,
      phone: phone || undefined,
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('\n🎉 Admin created successfully!');
    console.log(`   ID: ${admin._id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Created: ${admin.createdAt}`);
    console.log('\n👉 You can now login to the admin panel.');
    console.log('👉 Run: npm run dev to start the server.');

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

createAdmin();