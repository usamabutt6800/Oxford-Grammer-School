import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FaPlus, FaTrash, FaCalendarAlt, FaBook, FaSpinner,
  FaArrowLeft, FaSave
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { examService } from '../../../services/examService';

const EditExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    academicYear: '',
    class: '',
    startDate: '',
    endDate: '',
    passPercentage: 40,
    status: ''
  });

  const classLevels = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const examTypes = ['1st Term', '2nd Term', 'Final'];
  const statusTypes = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

  // Generate academic years
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear-1}-${currentYear}`,
    `${currentYear}-${currentYear+1}`,
    `${currentYear+1}-${currentYear+2}`
  ];

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const response = await examService.getExam(id);
      
      if (response.success) {
        const exam = response.data;
        setFormData({
          name: exam.name,
          academicYear: exam.academicYear,
          class: exam.class,
          startDate: exam.startDate ? new Date(exam.startDate).toISOString().split('T')[0] : '',
          endDate: exam.endDate ? new Date(exam.endDate).toISOString().split('T')[0] : '',
          passPercentage: exam.passPercentage || 40,
          status: exam.status
        });
        setSubjects(exam.subjects || []);
      } else {
        toast.error(response.error || 'Failed to fetch exam');
        navigate('/admin/exams');
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch exam');
      navigate('/admin/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select exam start and end dates');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before start date');
      return;
    }

    if (subjects.length === 0) {
      toast.error('Please add at least one subject');
      return;
    }

    for (const subject of subjects) {
      if (!subject.subjectName.trim()) {
        toast.error('All subjects must have a name');
        return;
      }
      if (subject.passMarks > subject.totalMarks) {
        toast.error(`Pass marks cannot exceed total marks for ${subject.subjectName}`);
        return;
      }
    }

    try {
      setSaving(true);
      const examData = {
        ...formData,
        subjects
      };

      const response = await examService.updateExam(id, examData);
      
      if (response.success) {
        toast.success('Exam updated successfully!');
        navigate('/admin/exams');
      } else {
        toast.error(response.error || 'Failed to update exam');
      }
    } catch (error) {
      console.error('Error updating exam:', error);
      toast.error(error.response?.data?.error || 'Failed to update exam');
    } finally {
      setSaving(false);
    }
  };

  const addSubject = () => {
    setSubjects([
      ...subjects,
      { subjectName: '', totalMarks: 100, passMarks: 40, examDate: '', examTime: '', roomNumber: '' }
    ]);
  };

  const removeSubject = (index) => {
    if (subjects.length === 1) {
      toast.error('At least one subject is required');
      return;
    }
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateSubject = (index, field, value) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index][field] = value;
    setSubjects(updatedSubjects);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading exam details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/exams')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <FaArrowLeft className="mr-2" />
            Back to Exams
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Exam</h1>
          <p className="text-gray-600">Update examination details and schedule</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="space-y-6">
            {/* Basic Exam Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Exam Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Type *
                  </label>
                  <select
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="input-field"
                    required
                  >
                    {examTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year *
                  </label>
                  <select
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleFormChange}
                    className="input-field"
                    required
                  >
                    {academicYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    name="class"
                    value={formData.class}
                    onChange={handleFormChange}
                    className="input-field"
                    required
                  >
                    {classLevels.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleFormChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pass Percentage *
                  </label>
                  <input
                    type="number"
                    name="passPercentage"
                    value={formData.passPercentage}
                    onChange={handleFormChange}
                    className="input-field"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="input-field"
                    required
                  >
                    {statusTypes.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Subjects Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Subjects</h2>
                <button
                  type="button"
                  onClick={addSubject}
                  className="btn-secondary flex items-center"
                >
                  <FaPlus className="mr-2" />
                  Add Subject
                </button>
              </div>

              <div className="space-y-4">
                {subjects.map((subject, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-800">Subject {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeSubject(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject Name *
                        </label>
                        <input
                          type="text"
                          value={subject.subjectName}
                          onChange={(e) => updateSubject(index, 'subjectName', e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Marks *
                        </label>
                        <input
                          type="number"
                          value={subject.totalMarks}
                          onChange={(e) => updateSubject(index, 'totalMarks', parseInt(e.target.value) || 0)}
                          className="input-field"
                          min="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pass Marks *
                        </label>
                        <input
                          type="number"
                          value={subject.passMarks}
                          onChange={(e) => updateSubject(index, 'passMarks', parseInt(e.target.value) || 0)}
                          className="input-field"
                          min="0"
                          max={subject.totalMarks}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Exam Date
                        </label>
                        <input
                          type="date"
                          value={subject.examDate ? new Date(subject.examDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => updateSubject(index, 'examDate', e.target.value)}
                          className="input-field"
                          min={formData.startDate}
                          max={formData.endDate}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Exam Time
                        </label>
                        <input
                          type="time"
                          value={subject.examTime}
                          onChange={(e) => updateSubject(index, 'examTime', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Room Number
                        </label>
                        <input
                          type="text"
                          value={subject.roomNumber}
                          onChange={(e) => updateSubject(index, 'roomNumber', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Exam Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Subjects:</span>
                  <span className="font-medium ml-2">{subjects.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Marks:</span>
                  <span className="font-medium ml-2">
                    {subjects.reduce((sum, subject) => sum + subject.totalMarks, 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium ml-2">
                    {formData.startDate && formData.endDate ? 
                      `${Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24)) + 1} days` : 
                      'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Pass Percentage:</span>
                  <span className="font-medium ml-2">{formData.passPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin/exams')}
                className="btn-secondary px-6"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-6 flex items-center"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Update Exam
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditExam;