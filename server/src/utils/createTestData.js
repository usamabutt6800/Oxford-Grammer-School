import mongoose from 'mongoose';
import User from '../modules/users/models/User.js';
import Student from '../modules/students/models/Student.js';
import dotenv from 'dotenv';

dotenv.config();

const createTestData = async () => {
  try {
    console.log('🚀 Creating Test Data...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oxford_school', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Clear existing test data
    await User.deleteMany({ email: /test|admin@oxford/ });
    await Student.deleteMany({ firstName: /Test/ });
    
    // Create Test Admin
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@oxford.edu.pk',
      password: 'admin123', // Will be hashed by Mongoose pre-save
      role: 'admin',
      phone: '0300-1234567',
      isActive: true
    });
    console.log('✅ Test Admin created');
    
    // Create Test Teacher
    const teacher = await User.create({
      name: 'Test Teacher',
      email: 'teacher@oxford.edu.pk',
      password: 'teacher123', // Will be hashed by Mongoose pre-save
      role: 'teacher',
      phone: '0300-9876543',
      qualification: 'M.Sc Mathematics',
      experience: '5 Years',
      salary: 50000,
      subjects: ['Mathematics', 'Physics'],
      assignedClasses: ['10-A', '9-B'],
      isActive: true,
      createdBy: admin._id
    });
    console.log('✅ Test Teacher created');
    
    // Create Test Students
    const testStudents = [
      {
        firstName: 'Ahmed',
        lastName: 'Raza',
        fatherName: 'Raza Ahmed',
        dateOfBirth: new Date('2010-05-15'),
        gender: 'Male',
        currentClass: '10',
        section: 'A',
        phone: '0300-1111111',
        fatherPhone: '0300-2222222',
        address: 'Karachi, Pakistan',
        status: 'Active',
        feeStructure: {
          tuitionFee: 5000,
          discountType: 'None',
          discountPercentage: 0,
          totalFee: 5000,
          netFee: 5000
        },
        createdBy: admin._id
      },
      {
        firstName: 'Fatima',
        lastName: 'Khan',
        fatherName: 'Kamran Khan',
        dateOfBirth: new Date('2011-03-20'),
        gender: 'Female',
        currentClass: '9',
        section: 'B',
        phone: '0300-3333333',
        fatherPhone: '0300-4444444',
        address: 'Lahore, Pakistan',
        status: 'Active',
        feeStructure: {
          tuitionFee: 4500,
          discountType: 'Sibling',
          discountPercentage: 20,
          totalFee: 4500,
          netFee: 3600
        },
        createdBy: admin._id
      },
      {
        firstName: 'Bilal',
        lastName: 'Ahmed',
        fatherName: 'Ahmed Malik',
        dateOfBirth: new Date('2012-07-10'),
        gender: 'Male',
        currentClass: '8',
        section: 'C',
        phone: '0300-5555555',
        fatherPhone: '0300-6666666',
        address: 'Islamabad, Pakistan',
        status: 'Active',
        feeStructure: {
          tuitionFee: 4000,
          discountType: 'Orphan',
          discountPercentage: 50,
          totalFee: 4000,
          netFee: 2000
        },
        createdBy: admin._id
      }
    ];
    
    for (const studentData of testStudents) {
      // Generate admission number
      const currentYear = new Date().getFullYear();
      const lastStudent = await Student.findOne().sort({ admissionNo: -1 });
      let admissionNo;
      
      if (lastStudent && lastStudent.admissionNo) {
        const lastNumber = parseInt(lastStudent.admissionNo.split('-')[1]) || 0;
        admissionNo = `${currentYear}-${String(lastNumber + 1).padStart(3, '0')}`;
      } else {
        admissionNo = `${currentYear}-001`;
      }
      
      // Generate roll number
      const classCount = await Student.countDocuments({
        currentClass: studentData.currentClass,
        section: studentData.section
      });
      const rollNo = `${studentData.currentClass}-${studentData.section}-${String(classCount + 1).padStart(2, '0')}`;
      
      await Student.create({
        ...studentData,
        admissionNo,
        rollNo
      });
    }
    
    console.log(`✅ ${testStudents.length} Test Students created`);
    console.log('\n📋 Test Credentials:');
    console.log('   Admin: admin@oxford.edu.pk / admin123');
    console.log('   Teacher: teacher@oxford.edu.pk / teacher123');
    console.log('\n👉 You can now login and test the system.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

createTestData();