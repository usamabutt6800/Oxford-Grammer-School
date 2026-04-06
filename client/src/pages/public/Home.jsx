import React from 'react';
import { Link } from 'react-router-dom';
import { FaGraduationCap, FaBook, FaFlask, FaUsers, FaTrophy, FaChalkboardTeacher } from 'react-icons/fa';

const Home = () => {
  const features = [
    {
      icon: <FaGraduationCap className="text-4xl" />,
      title: 'Quality Education',
      description: 'CBSE curriculum with focus on holistic development'
    },
    {
      icon: <FaBook className="text-4xl" />,
      title: 'Modern Library',
      description: 'Well-stocked library with digital resources'
    },
    {
      icon: <FaFlask className="text-4xl" />,
      title: 'Science Labs',
      description: 'Fully equipped Physics, Chemistry & Biology labs'
    },
    {
      icon: <FaUsers className="text-4xl" />,
      title: 'Expert Faculty',
      description: 'Qualified and experienced teaching staff'
    },
    {
      icon: <FaTrophy className="text-4xl" />,
      title: 'Sports Facilities',
      description: 'Indoor and outdoor sports complex'
    },
    {
      icon: <FaChalkboardTeacher className="text-4xl" />,
      title: 'Smart Classes',
      description: 'Digital classrooms with interactive learning'
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-school-blue to-school-navy text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Welcome to Oxford Grammar School
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Nurturing young minds for a brighter future through excellence in education, 
            character building, and holistic development.
          </p>
          <div className="space-x-4">
            <Link
              to="/admissions"
              className="inline-block bg-school-gold text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-yellow-600 transition-colors"
            >
              Admissions Open 2024
            </Link>
            <Link
              to="/about"
              className="inline-block bg-transparent border-2 border-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white hover:text-school-blue transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">
            Why Choose Oxford Grammar?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card text-center hover:shadow-xl transition-shadow">
                <div className="text-school-blue mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-school-blue text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">1500+</div>
              <div className="text-xl">Students</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">75+</div>
              <div className="text-xl">Qualified Teachers</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">25+</div>
              <div className="text-xl">Years Experience</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-xl">Board Results</div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Ready to Join Our School Family?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Admissions are open for Play Group to Class 10. Limited seats available.
          </p>
          <Link
            to="/contact"
            className="inline-block bg-school-blue text-white px-10 py-4 rounded-lg font-bold text-xl hover:bg-school-navy transition-colors"
          >
            Schedule a Campus Visit
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;