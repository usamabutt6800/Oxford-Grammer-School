import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaSearch, FaFilter, FaChartBar, FaPrint, FaDownload, 
  FaGraduationCap, FaUserGraduate, FaSpinner, FaArrowLeft,
  FaCalendarAlt, FaBook, FaPercentage
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { examService } from '../../../services/examService';
import Select from 'react-select';

const ExamReports = () => {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examStats, setExamStats] = useState(null);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    academicYear: '',
    class: '',
    name: ''
  });

  const classLevels = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const examTypes = ['1st Term', '2nd Term', 'Final'];

  // Generate academic years
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear-2}-${currentYear-1}`,
    `${currentYear-1}-${currentYear}`,
    `${currentYear}-${currentYear+1}`,
    `${currentYear+1}-${currentYear+2}`
  ];

  useEffect(() => {
    fetchExams();
  }, [filters]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await examService.getExams({
        ...filters,
        status: 'Completed'
      });
      
      if (response.success) {
        setExams(response.data);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = async (examId) => {
    try {
      setLoading(true);
      
      // Fetch exam details
      const examResponse = await examService.getExam(examId);
      if (examResponse.success) {
        setSelectedExam(examResponse.data);
      }
      
      // Fetch exam stats
      const statsResponse = await examService.getExamStats(examId);
      if (statsResponse.success) {
        setExamStats(statsResponse.data);
      }
      
      // Fetch exam results
      const resultsResponse = await examService.getExamResults(examId);
      if (resultsResponse.success) {
        setResults(resultsResponse.data.results || []);
      }
    } catch (error) {
      console.error('Error fetching exam details:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch exam details');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    // PDF export implementation
    toast.success('PDF export feature coming soon!');
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exam Report - ${selectedExam?.name} ${selectedExam?.academicYear}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
          .header h1 { color: #1e40af; margin: 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { padding: 15px; border-radius: 8px; text-align: center; }
          .grade-distribution { margin: 20px 0; }
          .grade-bar { height: 20px; background-color: #e5e7eb; margin: 5px 0; border-radius: 10px; overflow: hidden; }
          .grade-fill { height: 100%; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #1e40af; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Oxford Grammar School</h1>
          <h2>Exam Report - ${selectedExam?.name} ${selectedExam?.academicYear}</h2>
          <p>Class: ${selectedExam?.class} | Generated: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</p>
        </div>
        
        ${examStats ? `
        <div class="stats-grid">
          <div class="stat-card" style="background-color: #dbeafe;">
            <h3>Total Students</h3>
            <p style="font-size: 32px; font-weight: bold;">${examStats.totalStudents}</p>
          </div>
          <div class="stat-card" style="background-color: #dcfce7;">
            <h3>Passed</h3>
            <p style="font-size: 32px; font-weight: bold; color: #059669;">${examStats.passed}</p>
          </div>
          <div class="stat-card" style="background-color: #fef3c7;">
            <h3>Average Percentage</h3>
            <p style="font-size: 32px; font-weight: bold; color: #d97706;">${examStats.averagePercentage.toFixed(2)}%</p>
          </div>
          <div class="stat-card" style="background-color: #f3f4f6;">
            <h3>Pass Rate</h3>
            <p style="font-size: 32px; font-weight: bold;">${((examStats.passed / examStats.totalStudents) * 100).toFixed(1)}%</p>
          </div>
        </div>
        
        <div class="grade-distribution">
          <h3>Grade Distribution</h3>
          ${Object.entries(examStats.gradeDistribution || {}).map(([grade, count]) => {
            const percentage = (count / examStats.totalStudents) * 100;
            return `
              <div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>${grade}</span>
                  <span>${count} students (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="grade-bar">
                  <div class="grade-fill" style="width: ${percentage}%; background-color: ${
                    grade === 'A+' ? '#10b981' :
                    grade === 'A' ? '#34d399' :
                    grade === 'B+' ? '#60a5fa' :
                    grade === 'B' ? '#93c5fd' :
                    grade === 'C+' ? '#fbbf24' :
                    grade === 'C' ? '#fcd34d' :
                    grade === 'D' ? '#f97316' :
                    '#ef4444'
                  };"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ` : ''}
        
        ${results.length > 0 ? `
        <h3>Top Performers</h3>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student Name</th>
              <th>Roll No</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${results.slice(0, 10).map((result, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${result.student?.firstName} ${result.student?.lastName || ''}</td>
                <td>${result.student?.rollNo || ''}</td>
                <td><strong>${result.percentage?.toFixed(2)}%</strong></td>
                <td><span style="
                  padding: 2px 8px;
                  border-radius: 12px;
                  font-size: 12px;
                  font-weight: bold;
                  color: white;
                  background-color: ${
                    result.grade === 'A+' ? '#10b981' :
                    result.grade === 'A' ? '#34d399' :
                    result.grade === 'B+' ? '#60a5fa' :
                    result.grade === 'B' ? '#93c5fd' :
                    result.grade === 'C+' ? '#fbbf24' :
                    result.grade === 'C' ? '#fcd34d' :
                    result.grade === 'D' ? '#f97316' :
                    '#ef4444'
                  };
                ">${result.grade}</span></td>
                <td><span style="color: ${result.result === 'Pass' ? '#059669' : '#dc2626'};">
                  ${result.result}
                </span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
        
        <div class="footer">
          <p>Oxford Grammar School Management System | Generated by Admin Panel</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <Link
            to="/admin/exams"
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <FaArrowLeft className="mr-2" />
            Back to Exams
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Exam Reports</h1>
          <p className="text-gray-600">View detailed exam analysis and statistics</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button 
            className="btn-secondary flex items-center"
            onClick={printReport}
            disabled={!selectedExam}
          >
            <FaPrint className="mr-2" />
            Print
          </button>
          <button 
            className="btn-secondary flex items-center"
            onClick={exportToPDF}
            disabled={!selectedExam}
          >
            <FaDownload className="mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Filter Exams</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              className="input-field"
              value={filters.academicYear}
              onChange={(e) => setFilters({...filters, academicYear: e.target.value})}
            >
              <option value="">All Years</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class
            </label>
            <select
              className="input-field"
              value={filters.class}
              onChange={(e) => setFilters({...filters, class: e.target.value})}
            >
              <option value="">All Classes</option>
              {classLevels.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Type
            </label>
            <select
              className="input-field"
              value={filters.name}
              onChange={(e) => setFilters({...filters, name: e.target.value})}
            >
              <option value="">All Types</option>
              {examTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Exam Selection */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Select Exam for Report</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <FaSpinner className="animate-spin text-2xl text-school-blue" />
            <span className="ml-3">Loading exams...</span>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No completed exams found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam._id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedExam?._id === exam._id
                    ? 'border-school-blue bg-blue-50'
                    : 'border-gray-200 hover:border-school-blue'
                }`}
                onClick={() => handleExamSelect(exam._id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-800">{exam.name}</h4>
                    <p className="text-sm text-gray-600">{exam.academicYear}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    exam.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {exam.status}
                  </span>
                </div>
                <div className="flex items-center text-gray-600 text-sm mb-2">
                  <FaBook className="mr-2" />
                  Class {exam.class}
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                  <FaCalendarAlt className="mr-2" />
                  {format(new Date(exam.startDate), 'dd/MM')} - {format(new Date(exam.endDate), 'dd/MM')}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {exam.subjects?.length || 0} subjects • {exam.totalMarks?.toLocaleString() || '0'} total marks
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exam Report */}
      {selectedExam && (
        <>
          {/* Exam Details */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Exam Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaUserGraduate className="text-blue-600 mr-2" />
                  <span className="text-gray-600">Exam</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{selectedExam.name}</div>
                <div className="text-sm text-gray-600">Class {selectedExam.class} • {selectedExam.academicYear}</div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaGraduationCap className="text-green-600 mr-2" />
                  <span className="text-gray-600">Status</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{selectedExam.status}</div>
                <div className="text-sm text-gray-600">
                  {format(new Date(selectedExam.startDate), 'dd/MM/yyyy')} - {format(new Date(selectedExam.endDate), 'dd/MM/yyyy')}
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaBook className="text-purple-600 mr-2" />
                  <span className="text-gray-600">Subjects</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{selectedExam.subjects?.length || 0}</div>
                <div className="text-sm text-gray-600">{selectedExam.totalMarks?.toLocaleString() || '0'} total marks</div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaPercentage className="text-yellow-600 mr-2" />
                  <span className="text-gray-600">Pass Percentage</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{selectedExam.passPercentage || 40}%</div>
                <div className="text-sm text-gray-600">Minimum required to pass</div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          {examStats && (
            <div className="card">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Performance Statistics</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-800">{examStats.totalStudents}</div>
                  <div className="text-gray-600">Total Students</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{examStats.passed}</div>
                  <div className="text-green-600">Passed</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {((examStats.passed / examStats.totalStudents) * 100).toFixed(1)}% pass rate
                  </div>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{examStats.failed}</div>
                  <div className="text-red-600">Failed</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {((examStats.failed / examStats.totalStudents) * 100).toFixed(1)}% failure rate
                  </div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{examStats.averagePercentage.toFixed(1)}%</div>
                  <div className="text-blue-600">Average Percentage</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Highest: {examStats.highestPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Grade Distribution */}
              <div className="mb-8">
                <h4 className="font-semibold text-gray-800 mb-4">Grade Distribution</h4>
                <div className="space-y-3">
                  {Object.entries(examStats.gradeDistribution || {}).map(([grade, count]) => {
                    const percentage = (count / examStats.totalStudents) * 100;
                    return (
                      <div key={grade}>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{grade}</span>
                          <span className="text-gray-600">
                            {count} students ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: 
                                grade === 'A+' ? '#10b981' :
                                grade === 'A' ? '#34d399' :
                                grade === 'B+' ? '#60a5fa' :
                                grade === 'B' ? '#93c5fd' :
                                grade === 'C+' ? '#fbbf24' :
                                grade === 'C' ? '#fcd34d' :
                                grade === 'D' ? '#f97316' :
                                '#ef4444'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Performers */}
              {results.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-4">Top 10 Performers</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Rank</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Roll No</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Percentage</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Grade</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.slice(0, 10).map((result, index) => (
                          <tr key={result._id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {result.student?.firstName} {result.student?.lastName || ''}
                            </td>
                            <td className="px-4 py-3">{result.student?.rollNo || ''}</td>
                            <td className="px-4 py-3 font-bold">
                              {result.percentage?.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                result.grade === 'A+' ? 'bg-green-100 text-green-800' :
                                result.grade === 'A' ? 'bg-green-50 text-green-700' :
                                result.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                                result.grade === 'B' ? 'bg-blue-50 text-blue-700' :
                                result.grade === 'C+' ? 'bg-yellow-100 text-yellow-800' :
                                result.grade === 'C' ? 'bg-yellow-50 text-yellow-700' :
                                result.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {result.grade}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center ${
                                result.result === 'Pass' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {result.result}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExamReports;