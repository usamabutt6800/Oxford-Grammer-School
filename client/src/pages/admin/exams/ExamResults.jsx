import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  FaSearch, FaFilter, FaSave, FaPrint, FaDownload, FaChartBar,
  FaSpinner, FaArrowLeft, FaUserGraduate, FaCheck, FaTimes,
  FaSort, FaSortUp, FaSortDown, FaCalculator
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { examService } from '../../../services/examService';
import { studentService } from '../../../services/studentService';

const ExamResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({});
  const [filters, setFilters] = useState({
    section: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'rollNo', direction: 'asc' });

  const sections = ['A', 'B', 'C', 'D'];

  useEffect(() => {
    fetchExamAndStudents();
  }, [id, filters.section]);

  const fetchExamAndStudents = async () => {
    try {
      setLoading(true);
      
      // Fetch exam details
      const examResponse = await examService.getExam(id);
      if (!examResponse.success) {
        toast.error('Exam not found');
        navigate('/admin/exams');
        return;
      }
      setExam(examResponse.data);

      // Fetch students for this exam
      const params = { class: examResponse.data.class };
      if (filters.section) params.section = filters.section;
      
      const studentsResponse = await examService.getStudentsForExam(id, params);
      
      if (studentsResponse.success) {
        setStudents(studentsResponse.data.students || []);
        
        // Initialize results object
        const initialResults = {};
        studentsResponse.data.students.forEach(student => {
          if (student.existingResult) {
            initialResults[student._id] = {
              studentId: student._id,
              subjectResults: student.existingResult.subjectResults || [],
              remarks: ''
            };
          } else {
            initialResults[student._id] = {
              studentId: student._id,
              subjectResults: examResponse.data.subjects.map(subject => ({
                subjectName: subject.subjectName,
                marksObtained: 0,
                totalMarks: subject.totalMarks
              })),
              remarks: ''
            };
          }
        });
        setResults(initialResults);
      }
    } catch (error) {
      console.error('Error fetching exam data:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch exam data');
      navigate('/admin/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (studentId, subjectIndex, field, value) => {
    setResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        subjectResults: prev[studentId].subjectResults.map((subject, idx) => 
          idx === subjectIndex ? { ...subject, [field]: value } : subject
        )
      }
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  const handleSubmitResults = async () => {
    // Validate all results
    const resultsArray = Object.values(results);
    const errors = [];

    resultsArray.forEach(result => {
      result.subjectResults.forEach((subject, idx) => {
        const marks = parseFloat(subject.marksObtained);
        const total = parseFloat(subject.totalMarks);
        
        if (isNaN(marks) || marks < 0 || marks > total) {
          errors.push(`${result.studentId} - ${subject.subjectName}: Marks must be between 0 and ${total}`);
        }
      });
    });

    if (errors.length > 0) {
      toast.error(`Please fix the following errors:\n${errors.join('\n')}`);
      return;
    }

    try {
      setSaving(true);
      const response = await examService.submitExamResults(id, resultsArray);
      
      if (response.success) {
        toast.success('Results submitted successfully!');
        fetchExamAndStudents(); // Refresh data
      } else {
        toast.error(response.error || 'Failed to submit results');
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      toast.error(error.response?.data?.error || 'Failed to submit results');
    } finally {
      setSaving(false);
    }
  };

  const calculateStudentResult = (studentId) => {
    const result = results[studentId];
    if (!result || !result.subjectResults.length) return null;

    const totalMarksObtained = result.subjectResults.reduce((sum, subj) => sum + parseFloat(subj.marksObtained || 0), 0);
    const totalMarks = result.subjectResults.reduce((sum, subj) => sum + parseFloat(subj.totalMarks || 0), 0);
    const percentage = totalMarks > 0 ? (totalMarksObtained / totalMarks) * 100 : 0;
    
    const pass = percentage >= (exam?.passPercentage || 40);
    
    return {
      totalMarksObtained,
      totalMarks,
      percentage: percentage.toFixed(2),
      result: pass ? 'Pass' : 'Fail',
      grade: getGrade(percentage)
    };
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="ml-1 text-blue-600" /> 
      : <FaSortDown className="ml-1 text-blue-600" />;
  };

  const sortedStudents = [...students].sort((a, b) => {
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    
    if (sortConfig.direction === 'asc') {
      return aValue < bValue ? -1 : 1;
    } else {
      return aValue > bValue ? -1 : 1;
    }
  });

  if (loading && !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading exam results...</span>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Exam not found</h2>
          <button
            onClick={() => navigate('/admin/exams')}
            className="btn-primary mt-4"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/exams')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <FaArrowLeft className="mr-2" />
            Back to Exams
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Exam Results</h1>
          <div className="text-gray-600">
            {exam.name} - Class {exam.class} • {exam.academicYear}
          </div>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Link
            to={`/admin/exams/${id}/promote`}
            className={`btn-secondary flex items-center ${exam.name !== 'Final' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={exam.name !== 'Final' ? 'Only available for Final exams' : ''}
          >
            <FaChartBar className="mr-2" />
            Promotion
          </Link>
          <button 
            className="btn-primary flex items-center"
            onClick={handleSubmitResults}
            disabled={saving}
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Save Results
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exam Info Card */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">Exam Details</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{exam.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Class:</span>
                <span className="font-medium">Class {exam.class}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Academic Year:</span>
                <span className="font-medium">{exam.academicYear}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Schedule</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Start Date:</span>
                <span className="font-medium">{format(new Date(exam.startDate), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">End Date:</span>
                <span className="font-medium">{format(new Date(exam.endDate), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium px-2 py-1 rounded text-sm ${
                  exam.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  exam.status === 'Ongoing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {exam.status}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Subjects</h3>
            <div className="mt-2">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Total Subjects:</span>
                <span className="font-medium">{exam.subjects?.length || 0}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Total Marks:</span>
                <span className="font-medium">{exam.totalMarks?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pass Percentage:</span>
                <span className="font-medium">{exam.passPercentage || 40}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="font-semibold text-gray-800 mb-2">Filter Students</h3>
            <div className="flex space-x-4">
              <select
                className="input-field"
                value={filters.section}
                onChange={(e) => setFilters({...filters, section: e.target.value})}
              >
                <option value="">All Sections</option>
                {sections.map(section => (
                  <option key={section} value={section}>Section {section}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-gray-600">
            <FaUserGraduate className="inline mr-2" />
            Showing {students.length} students
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <FaSpinner className="animate-spin text-2xl text-school-blue" />
            <span className="ml-3">Loading student results...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No students found for this exam. Please check the class and section filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer"
                    onClick={() => handleSort('rollNo')}
                  >
                    <div className="flex items-center">
                      Roll No
                      {getSortIcon('rollNo')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center">
                      Student Name
                      {getSortIcon('firstName')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Section</th>
                  
                  {/* Subject Columns */}
                  {exam.subjects?.map((subject, idx) => (
                    <th key={idx} className="px-4 py-3 text-left font-semibold text-gray-700">
                      <div className="text-sm">{subject.subjectName}</div>
                      <div className="text-xs text-gray-500">/{subject.totalMarks}</div>
                    </th>
                  ))}
                  
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">%</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Grade</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Result</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student) => {
                  const studentResult = calculateStudentResult(student._id);
                  const studentData = results[student._id];
                  
                  return (
                    <tr key={student._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{student.rollNo}</div>
                        <div className="text-xs text-gray-500">{student.admissionNo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {student.firstName} {student.lastName || ''}
                        </div>
                        <div className="text-sm text-gray-600">{student.fatherName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {student.section}
                        </span>
                      </td>
                      
                      {/* Subject Marks Inputs */}
                      {exam.subjects?.map((subject, idx) => {
                        const subjectResult = studentData?.subjectResults?.[idx] || {};
                        return (
                          <td key={idx} className="px-4 py-3">
                            <input
                              type="number"
                              value={subjectResult.marksObtained || ''}
                              onChange={(e) => handleResultChange(student._id, idx, 'marksObtained', e.target.value)}
                              className="input-field w-20 text-center"
                              min="0"
                              max={subject.totalMarks}
                              step="0.5"
                            />
                          </td>
                        );
                      })}
                      
                      <td className="px-4 py-3 font-medium">
                        {studentResult ? (
                          <>
                            {studentResult.totalMarksObtained.toFixed(1)}/{studentResult.totalMarks}
                          </>
                        ) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {studentResult ? `${studentResult.percentage}%` : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {studentResult ? (
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            studentResult.grade === 'A+' ? 'bg-green-100 text-green-800' :
                            studentResult.grade === 'A' ? 'bg-green-50 text-green-700' :
                            studentResult.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                            studentResult.grade === 'B' ? 'bg-blue-50 text-blue-700' :
                            studentResult.grade === 'C+' ? 'bg-yellow-100 text-yellow-800' :
                            studentResult.grade === 'C' ? 'bg-yellow-50 text-yellow-700' :
                            studentResult.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {studentResult.grade}
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {studentResult ? (
                          <span className={`flex items-center ${
                            studentResult.result === 'Pass' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {studentResult.result === 'Pass' ? (
                              <><FaCheck className="mr-1" /> Pass</>
                            ) : (
                              <><FaTimes className="mr-1" /> Fail</>
                            )}
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={studentData?.remarks || ''}
                          onChange={(e) => handleRemarksChange(student._id, e.target.value)}
                          className="input-field"
                          placeholder="Remarks"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Stats */}
        {students.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{students.length}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {students.filter(s => {
                    const result = calculateStudentResult(s._id);
                    return result?.result === 'Pass';
                  }).length}
                </div>
                <div className="text-sm text-green-600">Passed</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {students.filter(s => {
                    const result = calculateStudentResult(s._id);
                    return result?.result === 'Fail';
                  }).length}
                </div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {exam.subjects?.length || 0}
                </div>
                <div className="text-sm text-blue-600">Subjects</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResults;