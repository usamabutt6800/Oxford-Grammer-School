import React, { useState } from 'react';
import { FaFileAlt, FaCalendarAlt, FaMoneyBillWave, FaCheckCircle, FaUserGraduate } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Admissions = () => {
  const [inquiryForm, setInquiryForm] = useState({
    childName: '',
    parentName: '',
    phone: '',
    email: '',
    currentGrade: '',
    interestedGrade: '',
    message: ''
  });

  const handleChange = (e) => {
    setInquiryForm({
      ...inquiryForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Admission inquiry submitted successfully! We will contact you within 24 hours.');
    setInquiryForm({
      childName: '',
      parentName: '',
      phone: '',
      email: '',
      currentGrade: '',
      interestedGrade: '',
      message: ''
    });
  };

  const admissionProcess = [
    { step: 1, title: 'Inquiry & Visit', desc: 'Submit inquiry form and schedule campus visit' },
    { step: 2, title: 'Application', desc: 'Complete application form with required documents' },
    { step: 3, title: 'Assessment', desc: 'Student assessment and parent interview' },
    { step: 4, title: 'Admission Decision', desc: 'Review and admission offer within 7 days' },
    { step: 5, title: 'Fee Payment', desc: 'Submit admission fee to confirm seat' },
    { step: 6, title: 'Orientation', desc: 'Attend orientation program before classes begin' },
  ];

  const requiredDocuments = [
    'Birth Certificate (B-Form)',
    'Previous School Report Card',
    'Transfer Certificate (if applicable)',
    '6 Passport-size Photographs',
    'Parent CNIC Copies',
    'Vaccination Certificate',
    'B-Form Copy',
  ];

  const feeStructure = [
    { class: 'Play Group', admission: '15,000', monthly: '5,000' },
    { class: 'Nursery', admission: '18,000', monthly: '5,500' },
    { class: 'Prep', admission: '20,000', monthly: '6,000' },
    { class: '1-5', admission: '25,000', monthly: '7,000' },
    { class: '6-8', admission: '30,000', monthly: '8,000' },
    { class: '9-10', admission: '35,000', monthly: '9,000' },
  ];

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-school-navy mb-6">Admissions</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Welcome to Oxford Grammar School! We're excited about your interest in joining 
            our school family. Admissions are open for Academic Year 2024-25.
          </p>
        </div>

        {/* Admission Process */}
        <div className="card mb-12">
          <div className="flex items-center mb-6">
            <FaCalendarAlt className="text-3xl text-school-blue mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Admission Process</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admissionProcess.map((step) => (
              <div key={step.step} className="border border-gray-200 rounded-xl p-6 text-center relative">
                <div className="absolute -top-4 -left-4 bg-school-blue text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Required Documents */}
          <div className="card">
            <div className="flex items-center mb-6">
              <FaFileAlt className="text-3xl text-school-blue mr-3" />
              <h2 className="text-3xl font-bold text-gray-800">Required Documents</h2>
            </div>
            <ul className="space-y-3">
              {requiredDocuments.map((doc, index) => (
                <li key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <FaCheckCircle className="text-green-500 mr-3" />
                  <span className="text-gray-700">{doc}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> All documents must be submitted as attested copies. 
                Original documents will be verified and returned.
              </p>
            </div>
          </div>

          {/* Fee Structure */}
          <div className="card">
            <div className="flex items-center mb-6">
              <FaMoneyBillWave className="text-3xl text-school-blue mr-3" />
              <h2 className="text-3xl font-bold text-gray-800">Fee Structure (PKR)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Class</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Admission Fee</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Monthly Tuition</th>
                  </tr>
                </thead>
                <tbody>
                  {feeStructure.map((fee, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{fee.class}</td>
                      <td className="px-4 py-3 text-gray-700">Rs. {fee.admission}</td>
                      <td className="px-4 py-3 text-gray-700">Rs. {fee.monthly}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Discounts Available:</strong> Siblings (20%), Orphans (50%), 
                Early Payment (5%). All fees are in Pakistani Rupees.
              </p>
            </div>
          </div>
        </div>

        {/* Inquiry Form */}
        <div className="card">
          <div className="flex items-center mb-6">
            <FaUserGraduate className="text-3xl text-school-blue mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Admission Inquiry Form</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Child's Full Name *
                </label>
                <input
                  type="text"
                  name="childName"
                  value={inquiryForm.childName}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Enter child's name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent/Guardian Name *
                </label>
                <input
                  type="text"
                  name="parentName"
                  value={inquiryForm.parentName}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Enter parent's name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={inquiryForm.phone}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="03XX-XXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={inquiryForm.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Grade
                </label>
                <select
                  name="currentGrade"
                  value={inquiryForm.currentGrade}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select current grade</option>
                  <option value="Play Group">Play Group</option>
                  <option value="Nursery">Nursery</option>
                  <option value="Prep">Prep</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interested Grade *
                </label>
                <select
                  name="interestedGrade"
                  value={inquiryForm.interestedGrade}
                  onChange={handleChange}
                  required
                  className="input-field"
                >
                  <option value="">Select interested grade</option>
                  <option value="Play Group">Play Group</option>
                  <option value="Nursery">Nursery</option>
                  <option value="Prep">Prep</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Message
              </label>
              <textarea
                name="message"
                value={inquiryForm.message}
                onChange={handleChange}
                rows="4"
                className="input-field"
                placeholder="Any specific questions or requirements..."
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                * Required fields. We'll contact you within 24 hours.
              </p>
              <button
                type="submit"
                className="btn-primary px-8 py-3"
              >
                Submit Inquiry
              </button>
            </div>
          </form>
        </div>

        {/* Important Dates */}
        <div className="mt-12 card">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Important Dates 2024-25</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-red-50 rounded-xl">
              <div className="text-xl font-bold text-red-600 mb-2">Admission Opens</div>
              <div className="text-2xl font-bold text-gray-800">March 1</div>
              <div className="text-gray-600">2024</div>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-xl">
              <div className="text-xl font-bold text-green-600 mb-2">Last Date</div>
              <div className="text-2xl font-bold text-gray-800">April 30</div>
              <div className="text-gray-600">2024</div>
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <div className="text-xl font-bold text-blue-600 mb-2">Assessment</div>
              <div className="text-2xl font-bold text-gray-800">May 15-30</div>
              <div className="text-gray-600">2024</div>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-xl">
              <div className="text-xl font-bold text-purple-600 mb-2">Session Starts</div>
              <div className="text-2xl font-bold text-gray-800">August 1</div>
              <div className="text-gray-600">2024</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admissions;