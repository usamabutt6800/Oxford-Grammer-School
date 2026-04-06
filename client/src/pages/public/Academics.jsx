import React from 'react';
import { FaBook, FaGraduationCap, FaChalkboardTeacher, FaCalendarAlt, FaFlask, FaLaptop } from 'react-icons/fa';

const Academics = () => {
  const classes = [
    { level: 'Play Group', age: '3-4 Years', subjects: ['Basic English', 'Urdu Alphabets', 'Numbers', 'Art & Craft', 'Rhymes'] },
    { level: 'Nursery', age: '4-5 Years', subjects: ['English', 'Urdu', 'Math', 'General Knowledge', 'Drawing'] },
    { level: 'Prep', age: '5-6 Years', subjects: ['English', 'Urdu', 'Math', 'Science', 'Islamiyat', 'Computer'] },
    { level: 'Class 1-5', age: '6-11 Years', subjects: ['English', 'Urdu', 'Math', 'Science', 'Social Studies', 'Islamiyat', 'Computer', 'Art'] },
    { level: 'Class 6-8', age: '12-14 Years', subjects: ['English', 'Urdu', 'Math', 'Physics', 'Chemistry', 'Biology', 'Pakistan Studies', 'Islamiyat', 'Computer'] },
    { level: 'Class 9-10', age: '15-16 Years', subjects: ['English', 'Urdu', 'Math', 'Physics', 'Chemistry', 'Biology', 'Pakistan Studies', 'Islamiyat', 'Computer Science'] },
  ];

  const academicCalendar = [
    { month: 'August', events: ['Academic Year Begins', 'Orientation Day'] },
    { month: 'September', events: ['1st Term Exams', 'Parent-Teacher Meetings'] },
    { month: 'October', events: ['Sports Day', 'Mid-term Break'] },
    { month: 'November', events: ['Science Exhibition', '2nd Term Exams'] },
    { month: 'December', events: ['Winter Break', 'Annual Day Rehearsals'] },
    { month: 'January', events: ['Annual Sports Day', '2nd Term Results'] },
    { month: 'February', events: ['Final Exams Begin', 'Book Fair'] },
    { month: 'March', events: ['Final Exams End', 'Result Declaration'] },
    { month: 'April', events: ['Promotion Ceremony', 'Summer Vacation Begins'] },
  ];

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-school-navy mb-6">Academics</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive academic program from Play Group to Matriculation, 
            designed to nurture intellectual growth and holistic development.
          </p>
        </div>

        {/* Classes Offered */}
        <div className="card mb-12">
          <div className="flex items-center mb-6">
            <FaGraduationCap className="text-3xl text-school-blue mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Classes Offered</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{cls.level}</h3>
                    <p className="text-gray-600 text-sm">Age: {cls.age}</p>
                  </div>
                  <span className="bg-school-blue text-white px-3 py-1 rounded-full text-sm">
                    {cls.subjects.length} Subjects
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Subjects:</h4>
                  <div className="flex flex-wrap gap-2">
                    {cls.subjects.map((subject, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teaching Methodology */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="card">
            <div className="flex items-center mb-6">
              <FaChalkboardTeacher className="text-3xl text-school-blue mr-3" />
              <h2 className="text-3xl font-bold text-gray-800">Teaching Methodology</h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: 'Student-Centered Learning',
                  desc: 'Interactive classrooms where students actively participate in the learning process'
                },
                {
                  title: 'Technology Integration',
                  desc: 'Smart classrooms with multimedia resources and digital learning tools'
                },
                {
                  title: 'Experiential Learning',
                  desc: 'Hands-on activities, experiments, and real-world applications'
                },
                {
                  title: 'Differentiated Instruction',
                  desc: 'Customized teaching approaches to meet individual learning needs'
                },
                {
                  title: 'Continuous Assessment',
                  desc: 'Regular feedback and formative assessments to track progress'
                },
                {
                  title: 'Project-Based Learning',
                  desc: 'Collaborative projects that develop critical thinking and problem-solving skills'
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="bg-school-blue text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{item.title}</h4>
                    <p className="text-gray-600 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center mb-6">
              <FaLaptop className="text-3xl text-school-blue mr-3" />
              <h2 className="text-3xl font-bold text-gray-800">Modern Facilities</h2>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Smart Classrooms', icon: '💻' },
                { name: 'Science Laboratories', icon: '🔬' },
                { name: 'Computer Lab', icon: '🖥️' },
                { name: 'Library with Digital Resources', icon: '📚' },
                { name: 'Language Lab', icon: '🎧' },
                { name: 'Audio-Visual Room', icon: '📽️' },
                { name: 'Mathematics Lab', icon: '📐' },
                { name: 'Art & Craft Studio', icon: '🎨' },
              ].map((facility, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl mr-4">{facility.icon}</span>
                  <span className="font-medium text-gray-800">{facility.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Academic Calendar */}
        <div className="card mb-12">
          <div className="flex items-center mb-6">
            <FaCalendarAlt className="text-3xl text-school-blue mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Academic Calendar 2024</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {academicCalendar.map((monthData, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-xl font-bold text-school-blue mb-3">{monthData.month}</h3>
                <ul className="space-y-2">
                  {monthData.events.map((event, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-school-gold rounded-full mr-3"></div>
                      {event}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Examination System */}
        <div className="card">
          <div className="flex items-center mb-6">
            <FaBook className="text-3xl text-school-blue mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Examination System</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="text-4xl font-bold text-school-blue mb-2">1st Term</div>
              <p className="text-gray-700 mb-3">September</p>
              <p className="text-gray-600">Assessment of first quarter syllabus with emphasis on concept building</p>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-xl">
              <div className="text-4xl font-bold text-school-blue mb-2">2nd Term</div>
              <p className="text-gray-700 mb-3">November</p>
              <p className="text-gray-600">Comprehensive evaluation of first half syllabus with practical assessments</p>
            </div>
            
            <div className="text-center p-6 bg-yellow-50 rounded-xl">
              <div className="text-4xl font-bold text-school-blue mb-2">Final</div>
              <p className="text-gray-700 mb-3">February-March</p>
              <p className="text-gray-600">Annual examination covering complete syllabus with promotion criteria</p>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Promotion Policy</h3>
            <p className="text-gray-700">
              Students must obtain a minimum of 40% marks in the Final Examination and 
              maintain at least 75% attendance to be promoted to the next class. Special 
              consideration is given to students showing improvement and consistent effort.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Academics;