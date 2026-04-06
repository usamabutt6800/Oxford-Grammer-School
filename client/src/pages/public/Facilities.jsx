import React from 'react';
import { FaBook, FaFlask, FaDesktop, FaFutbol, FaMusic, FaAppleAlt, FaShieldAlt, FaBus } from 'react-icons/fa';

const Facilities = () => {
  const facilities = [
    {
      icon: <FaBook className="text-4xl" />,
      title: 'Modern Library',
      description: 'Well-stocked library with over 10,000 books, digital resources, and reading rooms',
      features: ['Digital Catalog', 'Reading Rooms', 'E-Library', 'Book Club']
    },
    {
      icon: <FaFlask className="text-4xl" />,
      title: 'Science Labs',
      description: 'Fully equipped Physics, Chemistry, and Biology laboratories with latest equipment',
      features: ['Physics Lab', 'Chemistry Lab', 'Biology Lab', 'Research Equipment']
    },
    {
      icon: <FaDesktop className="text-4xl" />,
      title: 'Computer Lab',
      description: 'State-of-the-art computer lab with high-speed internet and latest software',
      features: ['50+ Computers', 'Programming Tools', 'Internet Access', 'IT Training']
    },
    {
      icon: <FaFutbol className="text-4xl" />,
      title: 'Sports Complex',
      description: 'Indoor and outdoor sports facilities for physical development and team sports',
      features: ['Basketball Court', 'Football Field', 'Cricket Pitch', 'Swimming Pool']
    },
    {
      icon: <FaMusic className="text-4xl" />,
      title: 'Arts & Music',
      description: 'Dedicated spaces for creative expression including music room and art studio',
      features: ['Music Room', 'Art Studio', 'Dance Studio', 'Theater']
    },
    {
      icon: <FaAppleAlt className="text-4xl" />,
      title: 'Cafeteria',
      description: 'Hygienic cafeteria serving nutritious meals and snacks for students',
      features: ['Healthy Menu', 'Hygiene Standards', 'Seating Capacity 200', 'Snack Bar']
    },
    {
      icon: <FaShieldAlt className="text-4xl" />,
      title: 'Security',
      description: '24/7 security with CCTV surveillance and trained security personnel',
      features: ['CCTV Cameras', 'Security Guards', 'Access Control', 'Emergency Protocols']
    },
    {
      icon: <FaBus className="text-4xl" />,
      title: 'Transportation',
      description: 'Safe and reliable school transport service covering major areas of Karachi',
      features: ['GPS Tracking', 'Female Attendants', 'Regular Maintenance', 'Route Coverage']
    }
  ];

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-school-navy mb-6">School Facilities</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            World-class facilities designed to provide a conducive learning environment 
            and holistic development opportunities for every student.
          </p>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {facilities.map((facility, index) => (
            <div key={index} className="card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="text-school-blue mb-4 flex justify-center">
                {facility.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">{facility.title}</h3>
              <p className="text-gray-600 text-sm mb-4 text-center">{facility.description}</p>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">Features:</h4>
                <ul className="space-y-1">
                  {facility.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-600 text-sm">
                      <div className="w-1.5 h-1.5 bg-school-blue rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Sections */}
        <div className="space-y-12">
          {/* Library Details */}
          <div className="card">
            <div className="flex items-center mb-6">
              <FaBook className="text-3xl text-school-blue mr-3" />
              <h2 className="text-3xl font-bold text-gray-800">Library & Learning Resources</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <img 
                  src="https://images.unsplash.com/photo-1589998059171-988d887df646?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="School Library" 
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Our Digital Library</h3>
                <p className="text-gray-700 mb-4">
                  The school library is a hub of knowledge with a collection of over 10,000 books, 
                  periodicals, and digital resources. We have separate sections for different age 
                  groups and subjects.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-school-blue">10K+</div>
                    <div className="text-gray-600">Books Collection</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-school-blue">50+</div>
                    <div className="text-gray-600">Magazines & Journals</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-school-blue">24/7</div>
                    <div className="text-gray-600">E-Library Access</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-school-blue">4</div>
                    <div className="text-gray-600">Reading Rooms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sports Facilities */}
          <div className="card">
            <div className="flex items-center mb-6">
              <FaFutbol className="text-3xl text-school-blue mr-3" />
              <h2 className="text-3xl font-bold text-gray-800">Sports & Physical Education</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Developing Champions</h3>
                <p className="text-gray-700 mb-4">
                  Our sports facilities are designed to promote physical fitness, teamwork, 
                  and sportsmanship. We offer both indoor and outdoor sports with trained 
                  coaches and regular inter-school competitions.
                </p>
                <div className="space-y-3">
                  {[
                    'Olympic-size swimming pool with certified lifeguards',
                    'Professional basketball and volleyball courts',
                    'Cricket pitch with turf wicket',
                    'Indoor badminton and table tennis facilities',
                    'Gymnastics center with proper equipment',
                    'Annual sports day with district-level participation'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-2 h-2 bg-school-gold rounded-full mr-3"></div>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <img 
                  src="https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Sports Facilities" 
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* Science Labs */}
          <div className="card">
            <div className="flex items-center mb-6">
              <FaFlask className="text-3xl text-school-blue mr-3" />
              <h2 className="text-3xl font-bold text-gray-800">Science & Technology Labs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <FaFlask className="text-4xl text-school-blue mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-800 mb-2">Physics Lab</h4>
                <p className="text-gray-600">
                  Equipped with latest apparatus for mechanics, electricity, optics, and modern physics experiments
                </p>
              </div>
              
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <FaFlask className="text-4xl text-school-blue mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-800 mb-2">Chemistry Lab</h4>
                <p className="text-gray-600">
                  Modern chemistry lab with fume hoods, safety equipment, and chemicals for practical learning
                </p>
              </div>
              
              <div className="text-center p-6 bg-yellow-50 rounded-xl">
                <FaFlask className="text-4xl text-school-blue mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-800 mb-2">Biology Lab</h4>
                <p className="text-gray-600">
                  Microscopes, specimens, and equipment for studying botany, zoology, and human biology
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Facilities;