import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FaSchool, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { Toaster } from 'react-hot-toast';

const PublicLayout = () => {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About Us' },
    { path: '/academics', label: 'Academics' },
    { path: '/facilities', label: 'Facilities' },
    { path: '/admissions', label: 'Admissions' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 mb-4 md:mb-0">
              <FaSchool className="text-3xl text-school-blue" />
              <div>
                <h1 className="text-2xl font-bold text-school-navy">Oxford Grammar School</h1>
                <p className="text-sm text-gray-600">Excellence in Education Since 1990</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="w-full md:w-auto">
              <ul className="flex flex-wrap justify-center space-x-1 md:space-x-4">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        location.pathname === link.path
                          ? 'bg-school-blue text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to="/login"
                    className="px-4 py-2 bg-school-gold text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                  >
                    Staff Login
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-school-navy text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* School Info */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <FaSchool className="mr-2" />
                Oxford Grammar School
              </h3>
              <p className="text-gray-300">
                Committed to providing quality education and holistic development 
                of students in a nurturing environment.
              </p>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-xl font-bold mb-4">Contact Us</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-3" />
                  <span>123 Education Street, Karachi, Pakistan</span>
                </div>
                <div className="flex items-center">
                  <FaPhone className="mr-3" />
                  <span>+92 21 1234567</span>
                </div>
                <div className="flex items-center">
                  <FaEnvelope className="mr-3" />
                  <span>info@oxfordgrammar.edu.pk</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/admissions" className="hover:text-school-gold transition-colors">Admission Procedure</Link></li>
                <li><Link to="/academics" className="hover:text-school-gold transition-colors">Academic Calendar</Link></li>
                <li><Link to="/facilities" className="hover:text-school-gold transition-colors">School Facilities</Link></li>
                <li><Link to="/contact" className="hover:text-school-gold transition-colors">Career Opportunities</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Oxford Grammar School. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;