import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  FaGraduationCap, FaCheck, FaTimes, FaUserGraduate, FaSpinner,
  FaArrowLeft, FaRocket, FaExclamationTriangle, FaPrint, FaDownload
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { examService } from '../../../services/examService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Promotion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [exam, setExam] = useState(null);
  const [promotionData, setPromotionData] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const response = await examService.getExam(id);
      
      if (response.success) {
        setExam(response.data);
        
        // Only fetch promotion data if it's a completed final exam
        if (response.data.name === 'Final' && response.data.status === 'Completed') {
          fetchPromotionData();
        }
      } else {
        toast.error('Exam not found');
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

  const fetchPromotionData = async () => {
    try {
      const resultsResponse = await examService.getExamResults(id);
      if (resultsResponse.success && resultsResponse.data.results) {
        const results = resultsResponse.data.results;
        
        const promotionData = {
          totalStudents: results.length,
          passed: results.filter(r => r.result === 'Pass').length,
          failed: results.filter(r => r.result === 'Fail').length,
          toBePromoted: results.filter(r => {
            if (r.result !== 'Pass') return false;
            
            // Check if student is not in highest class (10)
            const currentClass = r.class || r.student?.currentClass;
            return currentClass !== '10';
          }).length,
          alreadyHighest: results.filter(r => {
            if (r.result !== 'Pass') return false;
            const currentClass = r.class || r.student?.currentClass;
            return currentClass === '10';
          }).length,
          results: results.map(result => ({
            ...result,
            canPromote: result.result === 'Pass' && result.class !== '10'
          }))
        };
        
        setPromotionData(promotionData);
      }
    } catch (error) {
      console.error('Error fetching promotion data:', error);
    }
  };

  const handlePromoteStudents = async () => {
    if (!exam || exam.name !== 'Final') {
      toast.error('Promotion is only available for Final exams');
      return;
    }

    try {
      setPromoting(true);
      const response = await examService.promoteStudents(id);
      
      if (response.success) {
        toast.success(response.message || 'Students promoted successfully!');
        setPromotionData(response.data);
        setShowConfirm(false);
        
        // Update exam status if needed
        fetchExam();
      } else {
        toast.error(response.error || 'Failed to promote students');
      }
    } catch (error) {
      console.error('Error promoting students:', error);
      toast.error(error.response?.data?.error || 'Failed to promote students');
    } finally {
      setPromoting(false);
    }
  };

  const exportToPDF = () => {
    if (!promotionData) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(`Oxford Grammar School - Promotion Report`, 14, 15);
    
    // Exam Details
    doc.setFontSize(12);
    doc.text(`Exam: ${exam?.name} ${exam?.academicYear} - Class ${exam?.class}`, 14, 25);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, 32);
    
    // Summary
    doc.setFontSize(14);
    doc.text('Promotion Summary', 14, 45);
    
    const summaryData = [
      ['Total Students', promotionData.totalStudents],
      ['Passed Students', promotionData.passed],
      ['Failed Students', promotionData.failed],
      ['To Be Promoted', promotionData.toBePromoted],
      ['Already in Highest Class', promotionData.alreadyHighest]
    ];
    
    autoTable(doc, {
      head: [['Category', 'Count']],
      body: summaryData,
      startY: 50,
      theme: 'striped'
    });
    
    // Promoted Students Table
    if (promotionData.promoted?.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Promoted Students', 14, 15);
      
      const promotedData = promotionData.promoted.map((student, index) => [
        index + 1,
        student.admissionNo || '',
        student.name,
        student.from,
        student.to
      ]);
      
      autoTable(doc, {
        head: [['#', 'Admission No', 'Student Name', 'From Class', 'To Class']],
        body: promotedData,
        startY: 25,
        theme: 'grid'
      });
    }
    
    // Save PDF
    doc.save(`promotion-report-${exam?.name}-${exam?.academicYear}.pdf`);
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Promotion Report - ${exam?.name} ${exam?.academicYear}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
          .header h1 { color: #1e40af; margin: 0; }
          .summary { margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; }
          .summary-card { padding: 15px; border-radius: 8px; text-align: center; }
          .promoted { background-color: #d1fae5; border: 1px solid #10b981; }
          .failed { background-color: #fee2e2; border: 1px solid #ef4444; }
          .highest { background-color: #fef3c7; border: 1px solid #f59e0b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #1e40af; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Oxford Grammar School</h1>
          <h2>Promotion Report - ${exam?.name} ${exam?.academicYear}</h2>
          <p>Class: ${exam?.class} | Generated: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</p>
        </div>
        
        <div class="summary">
          <h3>Promotion Summary</h3>
          <div class="summary-grid">
            <div class="summary-card promoted">
              <h4>To Be Promoted</h4>
              <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${promotionData?.toBePromoted || 0}</p>
            </div>
            <div class="summary-card failed">
              <h4>Failed Students</h4>
              <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${promotionData?.failed || 0}</p>
            </div>
            <div class="summary-card highest">
              <h4>Already in Class 10</h4>
              <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${promotionData?.alreadyHighest || 0}</p>
            </div>
          </div>
        </div>
        
        ${promotionData?.promoted?.length > 0 ? `
        <h3>Promoted Students</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Admission No</th>
              <th>Student Name</th>
              <th>From Class</th>
              <th>To Class</th>
            </tr>
          </thead>
          <tbody>
            ${promotionData.promoted.map((student, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${student.admissionNo || ''}</td>
                <td>${student.name}</td>
                <td>${student.from}</td>
                <td><strong>${student.to}</strong></td>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading promotion data...</span>
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

  if (exam.name !== 'Final') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <FaExclamationTriangle className="text-5xl text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Promotion Not Available</h2>
          <p className="text-gray-600 mb-4">
            Promotion is only available for Final exams. This is a {exam.name} exam.
          </p>
          <button
            onClick={() => navigate('/admin/exams')}
            className="btn-primary"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (exam.status !== 'Completed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <FaExclamationTriangle className="text-5xl text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Exam Not Completed</h2>
          <p className="text-gray-600 mb-4">
            Results must be submitted and exam marked as completed before promotion.
          </p>
          <Link
            to={`/admin/exams/${id}/results`}
            className="btn-primary mr-2"
          >
            Enter Results
          </Link>
          <button
            onClick={() => navigate('/admin/exams')}
            className="btn-secondary"
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
          <h1 className="text-3xl font-bold text-gray-900">Student Promotion</h1>
          <div className="text-gray-600">
            Final Exam - Class {exam.class} • {exam.academicYear}
          </div>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button 
            className="btn-secondary flex items-center"
            onClick={printReport}
          >
            <FaPrint className="mr-2" />
            Print
          </button>
          <button 
            className="btn-secondary flex items-center"
            onClick={exportToPDF}
          >
            <FaDownload className="mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <FaExclamationTriangle className="text-yellow-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-800">Important Promotion Notice</h3>
            <p className="text-yellow-700 text-sm mt-1">
              This action will promote passing students to the next class. This will update:
              <ul className="list-disc ml-5 mt-1">
                <li>Student's current class level</li>
                <li>Roll numbers according to new class</li>
                <li>Fee structure based on new class</li>
                <li>Promotion history record</li>
              </ul>
              <strong className="block mt-2">This action cannot be undone automatically.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Promotion Summary */}
      {promotionData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="card text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {promotionData.toBePromoted}
              </div>
              <div className="text-gray-600">To Be Promoted</div>
              <div className="text-sm text-green-600 mt-2">
                <FaGraduationCap className="inline mr-1" />
                Will move to next class
              </div>
            </div>
            
            <div className="card text-center">
              <div className="text-4xl font-bold text-red-600 mb-2">
                {promotionData.failed}
              </div>
              <div className="text-gray-600">Failed Students</div>
              <div className="text-sm text-red-600 mt-2">
                <FaTimes className="inline mr-1" />
                Will repeat current class
              </div>
            </div>
            
            <div className="card text-center">
              <div className="text-4xl font-bold text-yellow-600 mb-2">
                {promotionData.alreadyHighest}
              </div>
              <div className="text-gray-600">Already in Class 10</div>
              <div className="text-sm text-yellow-600 mt-2">
                <FaUserGraduate className="inline mr-1" />
                Highest class reached
              </div>
            </div>
          </div>

          {/* Promotion Button */}
          <div className="card text-center">
            <div className="max-w-md mx-auto">
              <FaGraduationCap className="text-5xl text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Ready for Promotion</h3>
              <p className="text-gray-600 mb-6">
                Click the button below to promote {promotionData.toBePromoted} students to the next class.
              </p>
              
              <button
                onClick={() => setShowConfirm(true)}
                className="btn-primary px-8 py-3 text-lg flex items-center justify-center mx-auto"
                disabled={promoting || promotionData.toBePromoted === 0}
              >
                {promoting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Promoting...
                  </>
                ) : (
                  <>
                    <FaRocket className="mr-2" />
                    Promote Students Now
                  </>
                )}
              </button>
              
              {promotionData.toBePromoted === 0 && (
                <p className="text-red-600 mt-3">
                  No students are eligible for promotion. Check exam results.
                </p>
              )}
            </div>
          </div>

          {/* Promoted Students List (After Promotion) */}
          {promotionData.promoted && promotionData.promoted.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recently Promoted Students</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Admission No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">From Class</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">To Class</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotionData.promoted.map((student, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{student.admissionNo}</td>
                        <td className="px-4 py-3">{student.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                            {student.from}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-bold">
                            {student.to}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center text-green-600">
                            <FaCheck className="mr-1" />
                            Promoted
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <FaSpinner className="animate-spin text-4xl text-school-blue mx-auto mb-4" />
          <p className="text-gray-600">Loading promotion data...</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <FaExclamationTriangle className="text-5xl text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirm Promotion</h2>
                <p className="text-gray-600">
                  Are you sure you want to promote {promotionData?.toBePromoted} students?
                </p>
                <p className="text-red-600 font-medium mt-2">
                  This action cannot be undone!
                </p>
              </div>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-secondary px-6"
                  disabled={promoting}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromoteStudents}
                  className="btn-primary px-6 flex items-center"
                  disabled={promoting}
                >
                  {promoting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Promoting...
                    </>
                  ) : (
                    'Yes, Promote Students'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promotion;