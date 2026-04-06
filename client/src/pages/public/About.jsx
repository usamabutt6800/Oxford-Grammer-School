import React from 'react';
import { FaHistory, FaEye, FaBullseye, FaUserTie } from 'react-icons/fa';

const About = () => {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-school-navy mb-6">About Our School</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Oxford Grammar School has been a beacon of excellence in education since 1990, 
            nurturing young minds to become responsible global citizens.
          </p>
        </div>

        {/* History */}
        <div className="card mb-12">
          <div className="flex items-center mb-6">
            <FaHistory className="text-3xl text-school-blue mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Our History</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-700 mb-4">
                Established in 1990, Oxford Grammar School began with a vision to provide 
                quality education that combines academic excellence with character building. 
                What started as a small institution with just 50 students has now grown into 
                a premier educational establishment with over 1500 students.
              </p>
              <p className="text-gray-700">
                Over the past three decades, we have consistently maintained high academic 
                standards while adapting to changing educational needs. Our alumni include 
                successful professionals, entrepreneurs, and community leaders who contribute 
                positively to society.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-gray-100 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Milestones</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="bg-school-blue text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1">✓</div>
                  <span><strong>1990:</strong> School founded with Play Group to Class 5</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-school-blue text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1">✓</div>
                  <span><strong>2000:</strong> Expanded to Class 10 with Science stream</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-school-blue text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1">✓</div>
                  <span><strong>2010:</strong> Digital classrooms and computer labs introduced</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-school-blue text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1">✓</div>
                  <span><strong>2020:</strong> Awarded "Best School in Karachi" by Education Board</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="card">
            <div className="flex items-center mb-4">
              <FaEye className="text-2xl text-school-blue mr-3" />
              <h3 className="text-2xl font-bold text-gray-800">Our Vision</h3>
            </div>
            <p className="text-gray-700">
              To be a premier educational institution that nurtures intellectual curiosity, 
              fosters creativity, and develops character to prepare students for success in 
              an ever-changing global society.
            </p>
          </div>

          <div className="card">
            <div className="flex items-center mb-4">
              <FaBullseye className="text-2xl text-school-blue mr-3" />
              <h3 className="text-2xl font-bold text-gray-800">Our Mission</h3>
            </div>
            <p className="text-gray-700">
              To provide a holistic education that combines academic excellence with moral 
              values, physical development, and social responsibility, empowering students 
              to become lifelong learners and responsible citizens.
            </p>
          </div>
        </div>

        {/* Principal's Message */}
        <div className="card mb-12">
          <div className="flex items-center mb-6">
            <FaUserTie className="text-3xl text-school-blue mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Principal's Message</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/3">
              <img 
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                alt="Principal" 
                className="w-full h-auto rounded-lg shadow-lg"
              />
              <div className="text-center mt-4">
                <h4 className="text-xl font-bold text-gray-800">Mr. Ahmed Raza</h4>
                <p className="text-gray-600">Principal & CEO</p>
                <p className="text-sm text-gray-500">M.Ed, PhD in Educational Leadership</p>
              </div>
            </div>
            <div className="md:w-2/3">
              <div className="text-lg text-gray-700 space-y-4">
                <p>
                  "Welcome to Oxford Grammar School, where we believe every child is unique 
                  and possesses immense potential. Our commitment is to provide an environment 
                  that nurtures this potential through innovative teaching, modern facilities, 
                  and a values-based curriculum."
                </p>
                <p>
                  "At OGS, we focus not just on academic success but on developing well-rounded 
                  individuals. Our students learn to think critically, communicate effectively, 
                  and act responsibly. We emphasize character building, leadership skills, and 
                  community service alongside academic excellence."
                </p>
                <p>
                  "I invite you to visit our campus and experience the vibrant learning 
                  atmosphere that makes Oxford Grammar School a special place for your child's 
                  educational journey."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* School Values */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Our Core Values</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: 'Excellence', desc: 'Striving for the highest standards in all endeavors' },
              { title: 'Integrity', desc: 'Upholding honesty and ethical conduct' },
              { title: 'Respect', desc: 'Valuing diversity and treating all with dignity' },
              { title: 'Responsibility', desc: 'Being accountable for our actions and their impact' },
              { title: 'Innovation', desc: 'Embracing creativity and new approaches to learning' },
              { title: 'Collaboration', desc: 'Working together for shared success' },
              { title: 'Compassion', desc: 'Showing empathy and care for others' },
              { title: 'Lifelong Learning', desc: 'Cultivating curiosity and continuous growth' },
            ].map((value, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h4 className="font-bold text-lg text-school-blue mb-2">{value.title}</h4>
                <p className="text-gray-600 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;