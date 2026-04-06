import React, { useState } from 'react';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaFacebook, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Contact = () => {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Thank you for your message! We will get back to you soon.');
    setContactForm({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  const contactInfo = [
    {
      icon: <FaPhone className="text-2xl" />,
      title: 'Phone Numbers',
      details: ['+92 21 1234567', '+92 21 1234568', '+92 300 1234567 (Emergency)'],
      color: 'bg-blue-50'
    },
    {
      icon: <FaEnvelope className="text-2xl" />,
      title: 'Email Addresses',
      details: ['info@oxfordgrammar.edu.pk', 'admissions@oxfordgrammar.edu.pk', 'principal@oxfordgrammar.edu.pk'],
      color: 'bg-green-50'
    },
    {
      icon: <FaMapMarkerAlt className="text-2xl" />,
      title: 'School Address',
      details: ['123 Education Street', 'Block 5, Clifton', 'Karachi, Pakistan'],
      color: 'bg-red-50'
    },
    {
      icon: <FaClock className="text-2xl" />,
      title: 'Office Hours',
      details: ['Monday - Friday: 8:00 AM - 4:00 PM', 'Saturday: 9:00 AM - 1:00 PM', 'Sunday: Closed'],
      color: 'bg-yellow-50'
    }
  ];

  const departments = [
    { name: 'Admissions Office', email: 'admissions@oxfordgrammar.edu.pk', phone: '021-1234567 Ext. 101' },
    { name: 'Principal Office', email: 'principal@oxfordgrammar.edu.pk', phone: '021-1234567 Ext. 102' },
    { name: 'Accounts Department', email: 'accounts@oxfordgrammar.edu.pk', phone: '021-1234567 Ext. 103' },
    { name: 'Transport Office', email: 'transport@oxfordgrammar.edu.pk', phone: '021-1234567 Ext. 104' },
  ];

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-school-navy mb-6">Contact Us</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're here to help! Reach out to us through any of the following channels 
            and we'll get back to you promptly.
          </p>
        </div>

        {/* Contact Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {contactInfo.map((info, index) => (
            <div key={index} className={`${info.color} p-6 rounded-xl`}>
              <div className="text-school-blue mb-4">{info.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{info.title}</h3>
              <ul className="space-y-2">
                {info.details.map((detail, idx) => (
                  <li key={idx} className="text-gray-700">{detail}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Contact Form */}
          <div className="card">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={contactForm.name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Enter your name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={contactForm.phone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="03XX-XXXXXXX"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  value={contactForm.subject}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="">Select a subject</option>
                  <option value="Admission Inquiry">Admission Inquiry</option>
                  <option value="Fee Information">Fee Information</option>
                  <option value="Academic Query">Academic Query</option>
                  <option value="Transport Inquiry">Transport Inquiry</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={contactForm.message}
                  onChange={handleChange}
                  rows="5"
                  required
                  className="input-field"
                  placeholder="Type your message here..."
                />
              </div>
              <button
                type="submit"
                className="w-full btn-primary py-3"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Map and Departments */}
          <div className="space-y-8">
            {/* Google Map */}
            <div className="card">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Our Location</h3>
              <div className="bg-gray-200 h-64 rounded-lg overflow-hidden">
                {/* In production, you would embed actual Google Maps */}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-gray-200">
                  <div className="text-center">
                    <FaMapMarkerAlt className="text-4xl text-red-500 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium">Google Maps Integration</p>
                    <p className="text-gray-600 text-sm">123 Education Street, Karachi</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <a 
                  href="https://maps.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-school-blue hover:underline"
                >
                  Open in Google Maps →
                </a>
              </div>
            </div>

            {/* Departments */}
            <div className="card">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Department Contacts</h3>
              <div className="space-y-4">
                {departments.map((dept, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <h4 className="font-bold text-gray-800 mb-2">{dept.name}</h4>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <FaEnvelope className="mr-2" />
                      <span>{dept.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FaPhone className="mr-2" />
                      <span>{dept.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="card">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Connect With Us</h3>
          <div className="flex justify-center space-x-6">
            <a 
              href="#" 
              className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
              title="Facebook"
            >
              <FaFacebook className="text-xl" />
            </a>
            <a 
              href="#" 
              className="w-12 h-12 bg-blue-400 text-white rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors"
              title="Twitter"
            >
              <FaTwitter className="text-xl" />
            </a>
            <a 
              href="#" 
              className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors"
              title="Instagram"
            >
              <FaInstagram className="text-xl" />
            </a>
            <a 
              href="#" 
              className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
              title="YouTube"
            >
              <FaYoutube className="text-xl" />
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 card">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              {
                q: 'What are the school timings?',
                a: 'Regular school timings are from 8:00 AM to 2:00 PM. Pre-primary sections end at 12:30 PM.'
              },
              {
                q: 'Do you provide transportation?',
                a: 'Yes, we have a fleet of school buses covering major areas of Karachi. Contact transport office for routes.'
              },
              {
                q: 'What is the student-teacher ratio?',
                a: 'We maintain a healthy ratio of 25:1 in primary and 30:1 in secondary sections.'
              },
              {
                q: 'Are scholarships available?',
                a: 'Yes, we offer merit-based scholarships and need-based financial aid. Contact admissions for details.'
              },
              {
                q: 'What COVID-19 safety measures are in place?',
                a: 'We follow all SOPs including temperature checks, sanitization, mask mandates, and social distancing.'
              }
            ].map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2">Q: {faq.q}</h4>
                <p className="text-gray-700">A: {faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;