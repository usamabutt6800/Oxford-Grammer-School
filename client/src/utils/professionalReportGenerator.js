export const generateDetailedReport = (reportData) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
  
  if (!printWindow) {
    alert('Please allow popups to view the report');
    return;
  }

  const { 
    studentReports = [], 
    classSummary = {}, 
    reportPeriod = {},
    holidays = []
  } = reportData;

  // Helper functions
  const formatDateDM = (date) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const getDayName = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(date).getDay()];
  };

  // Function to get week number in month
  const getWeekNumber = (date, weekStartsOn = 1) => {
    const target = new Date(date);
    const firstDayOfMonth = new Date(target.getFullYear(), target.getMonth(), 1);
    const firstDayOfWeek = (firstDayOfMonth.getDay() - weekStartsOn + 7) % 7;
    
    return Math.floor((target.getDate() + firstDayOfWeek - 1) / 7) + 1;
  };

  // Function to get attendance status for a specific date
  const getAttendanceStatus = (student, date, holidays) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if it's Sunday
    if (date.getDay() === 0) {
      return { status: '-', isSunday: true };
    }
    
    // Check if it's a holiday
    const holiday = holidays.find(h => {
      const holidayDate = new Date(h.date);
      return holidayDate.toDateString() === date.toDateString();
    });
    
    if (holiday) {
      return { status: holiday.title.substring(0, 10), isHoliday: true };
    }
    
    // Check if it's a future date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
      return { status: '-', isFuture: true };
    }
    
    // TODO: Get actual attendance from student data
    // This needs to be implemented based on your data structure
    // For now, returning 'NM' for Not Marked
    return { status: 'NM', isNotMarked: true };
  };

  // Generate student report
  const generateStudentReportHTML = (student, pageNumber, totalPages) => {
    const startDate = new Date(reportPeriod.startDate);
    const endDate = new Date(reportPeriod.endDate);
    
    // Generate all dates in the period
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Group dates by week (Monday to Sunday)
    const weeks = {};
    dates.forEach(date => {
      const weekNumber = getWeekNumber(date, 1); // Week starts on Monday
      if (!weeks[weekNumber]) {
        weeks[weekNumber] = [];
      }
      weeks[weekNumber].push(date);
    });
    
    // Sort week numbers
    const sortedWeekNumbers = Object.keys(weeks).sort((a, b) => a - b);
    
    // Get month name and year for header
    const monthYear = startDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });

    return `
      <div class="student-report-page">
        <!-- Keep your original header design -->
        <div class="school-header">
          <div class="flex items-center justify-center mb-2">
            <div class="text-3xl text-blue-600 mr-3">🏫</div>
            <h1 class="text-3xl font-bold text-gray-900">OXFORD GRAMMAR SCHOOL</h1>
          </div>
          <p class="text-gray-600 text-lg">Affiliated with Board of Intermediate & Secondary Education</p>
          <p class="text-gray-600">123 Education Street, Karachi, Pakistan | Phone: 021-1234567</p>
          <h2 class="text-2xl font-bold text-blue-800 mt-4">STUDENT ATTENDANCE REGISTER</h2>
          
          <div class="report-info mt-4">
            <div><strong>Class:</strong> ${reportPeriod.className}</div>
            <div><strong>Section:</strong> ${reportPeriod.section}</div>
            <div><strong>Period:</strong> ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}</div>
            <div><strong>Month:</strong> ${monthYear}</div>
          </div>
        </div>

        <!-- Student Information -->
        <div class="student-info">
          <table>
            <tr>
              <td><strong>Roll No:</strong> ${student.rollNo}</td>
              <td><strong>Name:</strong> ${student.name}</td>
            </tr>
            <tr>
              <td><strong>Father's Name:</strong> ${student.fatherName || 'N/A'}</td>
              <td><strong>Class/Sec:</strong> ${reportPeriod.className}/${reportPeriod.section}</td>
            </tr>
          </table>
        </div>

        <!-- Monthly Calendar Grid -->
        <div class="monthly-calendar">
          <h3>ATTENDANCE FOR ${monthYear.toUpperCase()}</h3>
          
          ${sortedWeekNumbers.map(weekNumber => {
            const weekDates = weeks[weekNumber];
            
            // Fill missing days at start of week
            let displayWeek = [];
            const firstDate = weekDates[0];
            const firstDayOfWeek = (firstDate.getDay() + 6) % 7; // Monday = 0
            
            // Add empty cells for days before the first date of the week
            for (let i = 0; i < firstDayOfWeek; i++) {
              displayWeek.push({ isEmpty: true });
            }
            
            // Add actual dates
            weekDates.forEach(date => {
              displayWeek.push(date);
            });
            
            // Add empty cells for days after the last date of the week
            while (displayWeek.length < 7) {
              displayWeek.push({ isEmpty: true });
            }
            
            return `
              <div class="week-grid">
                <!-- Day Names -->
                <div class="day-names">
                  ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => 
                    `<div class="day-name">${day}</div>`
                  ).join('')}
                </div>
                
                <!-- Dates Row -->
                <div class="dates-row">
                  ${displayWeek.map((date, index) => {
                    if (date.isEmpty) {
                      return `<div class="date-cell empty">-</div>`;
                    }
                    
                    const dayName = getDayName(date);
                    const isSunday = dayName === 'Sun';
                    const holiday = holidays.find(h => {
                      const holidayDate = new Date(h.date);
                      return holidayDate.toDateString() === date.toDateString();
                    });
                    
                    return `
                      <div class="date-cell ${isSunday ? 'sunday' : ''} ${holiday ? 'holiday' : ''}">
                        ${formatDateDM(date)}
                        ${holiday ? `<div class="holiday-label" title="${holiday.title}">${holiday.title.substring(0, 3)}</div>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
                
                <!-- Attendance Row -->
                <div class="attendance-row">
                  ${displayWeek.map((date, index) => {
                    if (date.isEmpty) {
                      return `<div class="attendance-cell empty">-</div>`;
                    }
                    
                    const attendance = getAttendanceStatus(student, date, holidays);
                    let cellClass = 'empty';
                    let symbol = attendance.status;
                    
                    if (attendance.isSunday || attendance.isFuture) {
                      cellClass = 'empty';
                      symbol = '-';
                    } else if (attendance.isHoliday) {
                      cellClass = 'holiday';
                      symbol = 'H';
                    } else if (symbol === 'P') {
                      cellClass = 'present';
                    } else if (symbol === 'A') {
                      cellClass = 'absent';
                    } else if (symbol === 'L') {
                      cellClass = 'leave';
                    } else if (symbol === 'NM') {
                      cellClass = 'not-marked';
                    }
                    
                    return `
                      <div class="attendance-cell ${cellClass}" title="${date.toLocaleDateString()}">
                        ${symbol}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
          
          <!-- Legend -->
          <div class="legend">
            <strong>Legend:</strong> 
            <span class="legend-item present">P - Present</span> | 
            <span class="legend-item absent">A - Absent</span> | 
            <span class="legend-item leave">L - Leave</span> | 
            <span class="legend-item not-marked">NM - Not Marked</span> | 
            <span class="legend-item sunday">- - Sunday</span> | 
            <span class="legend-item holiday">H - Holiday</span>
          </div>
        </div>

        <!-- Attendance Summary (Your original design) -->
        <div class="attendance-summary">
          <h3>ATTENDANCE SUMMARY</h3>
          <div class="grid grid-cols-4 gap-4">
            <div class="summary-box">
              <div class="text-2xl font-bold text-blue-600">${reportPeriod.workingDays || 0}</div>
              <div class="text-sm text-gray-600">Working Days</div>
            </div>
            <div class="summary-box">
              <div class="text-2xl font-bold text-green-600">${student.presentDays || 0}</div>
              <div class="text-sm text-gray-600">Present</div>
            </div>
            <div class="summary-box">
              <div class="text-2xl font-bold text-red-600">${student.absentDays || 0}</div>
              <div class="text-sm text-gray-600">Absent</div>
            </div>
            <div class="summary-box">
              <div class="text-2xl font-bold text-yellow-600">${student.leaveDays || 0}</div>
              <div class="text-sm text-gray-600">Leave</div>
            </div>
          </div>
          <div class="percentage-box">
            <div class="text-3xl font-bold text-purple-600">${student.attendancePercentage || 0}%</div>
            <div class="text-sm text-gray-600">Attendance Percentage</div>
          </div>
          <p class="percentage-note">
            * Percentage calculated for working days only (excluding Sundays and holidays). Leave days not counted as absent.
          </p>
        </div>

        <!-- Signatures (Your original design) -->
        <div class="signatures">
          <div class="grid grid-cols-3 gap-8">
            <div class="text-center">
              <div class="signature-line"></div>
              <p class="font-bold">Class Teacher</p>
              <p class="text-sm text-gray-600">Signature & Stamp</p>
            </div>
            <div class="text-center">
              <div class="signature-line"></div>
              <p class="font-bold">Principal</p>
              <p class="text-sm text-gray-600">Signature & Stamp</p>
            </div>
            <div class="text-center">
              <div class="signature-line"></div>
              <p class="font-bold">Parent/Guardian</p>
              <p class="text-sm text-gray-600">Signature</p>
            </div>
          </div>
        </div>

        <!-- Page Footer -->
        <div class="page-footer">
          Page ${pageNumber} of ${totalPages} - Generated on ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;
  };

  // Full HTML with proper styling
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attendance Report - ${new Date(reportPeriod.startDate).toLocaleDateString()}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        /* PRINT STYLES */
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 12pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .student-report-page {
            page-break-after: always;
            min-height: 100vh;
            padding: 20px;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-controls {
            display: none !important;
          }
        }
        
        /* SCREEN STYLES */
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #f3f4f6;
          margin: 0;
          padding: 20px;
        }
        
        .print-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: white;
          padding: 10px 15px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border: 2px solid #1e40af;
          display: flex;
          gap: 10px;
        }
        
        .print-btn, .close-btn {
          background: #1e40af;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .close-btn {
          background: #6b7280;
        }
        
        .container {
          max-width: 210mm; /* A4 width */
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        /* School Header Styles */
        .school-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #1e40af;
        }
        
        .report-info {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 15px;
          flex-wrap: wrap;
        }
        
        /* Student Info */
        .student-info table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .student-info td {
          padding: 10px;
          border: 1px solid #d1d5db;
          width: 50%;
        }
        
        /* Monthly Calendar */
        .monthly-calendar {
          margin: 30px 0;
        }
        
        .monthly-calendar h3 {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .week-grid {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .day-names {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #1e40af;
          color: white;
          font-weight: bold;
        }
        
        .day-name {
          padding: 10px;
          text-align: center;
          border-right: 1px solid white;
        }
        
        .day-name:last-child {
          border-right: none;
        }
        
        .dates-row, .attendance-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }
        
        .date-cell, .attendance-cell {
          padding: 12px 8px;
          text-align: center;
          border: 1px solid #d1d5db;
          min-height: 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        
        .date-cell.sunday {
          background-color: #e0f2fe;
          color: #0369a1;
        }
        
        .date-cell.holiday {
          background-color: #fef2f2;
          color: #dc2626;
        }
        
        .holiday-label {
          font-size: 9px;
          color: #dc2626;
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: rgba(255, 255, 255, 0.8);
          padding: 1px 3px;
          border-radius: 2px;
        }
        
        .attendance-cell.present {
          background-color: #dcfce7;
          color: #166534;
          font-weight: bold;
          font-size: 16px;
        }
        
        .attendance-cell.absent {
          background-color: #fee2e2;
          color: #991b1b;
          font-weight: bold;
          font-size: 16px;
        }
        
        .attendance-cell.leave {
          background-color: #fef3c7;
          color: #92400e;
          font-weight: bold;
          font-size: 16px;
        }
        
        .attendance-cell.not-marked {
          background-color: #f3f4f6;
          color: #6b7280;
          font-size: 14px;
        }
        
        .attendance-cell.empty {
          background-color: #f9fafb;
          color: #9ca3af;
          font-size: 16px;
        }
        
        .attendance-cell.holiday {
          background-color: #fef2f2;
          color: #dc2626;
          font-weight: bold;
          font-size: 16px;
        }
        
        .legend {
          text-align: center;
          margin-top: 20px;
          padding: 10px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        
        .legend-item {
          margin: 0 5px;
        }
        
        .legend-item.present { color: #166534; }
        .legend-item.absent { color: #991b1b; }
        .legend-item.leave { color: #92400e; }
        .legend-item.not-marked { color: #6b7280; }
        .legend-item.sunday { color: #0369a1; }
        .legend-item.holiday { color: #dc2626; }
        
        /* Attendance Summary */
        .attendance-summary {
          margin: 40px 0;
          padding: 25px;
          background: #f8fafc;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
        }
        
        .summary-box {
          text-align: center;
          padding: 15px;
          background: white;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }
        
        .percentage-box {
          text-align: center;
          padding: 20px;
          background: white;
          border-radius: 8px;
          border: 3px solid #8b5cf6;
          margin-top: 20px;
        }
        
        .percentage-note {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          margin-top: 15px;
          font-style: italic;
        }
        
        /* Signatures */
        .signatures {
          margin: 50px 0 30px 0;
          padding-top: 30px;
          border-top: 2px solid #e5e7eb;
        }
        
        .signature-line {
          width: 200px;
          height: 1px;
          background: #6b7280;
          margin: 40px auto 10px;
        }
        
        /* Page Footer */
        .page-footer {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }
        
        /* Utility classes for grid */
        .grid-cols-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        
        .gap-4 { gap: 1rem; }
        .gap-8 { gap: 2rem; }
        
        .text-center { text-align: center; }
        .text-2xl { font-size: 1.5rem; }
        .text-3xl { font-size: 1.875rem; }
        .font-bold { font-weight: 700; }
        .mt-4 { margin-top: 1rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mr-3 { margin-right: 0.75rem; }
      </style>
    </head>
    <body>
      <!-- Print Controls -->
      <div class="print-controls no-print">
        <button class="print-btn" onclick="window.print()">
          🖨️ Print Report
        </button>
        <button class="close-btn" onclick="window.close()">
          ✕ Close
        </button>
      </div>
      
      <div class="container">
        ${studentReports.map((student, index) => 
          generateStudentReportHTML(student, index + 1, studentReports.length)
        ).join('')}
      </div>
      
      <script>
        window.focus();
        
        document.addEventListener('keydown', function(e) {
          if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            window.print();
          }
          if (e.key === 'Escape') {
            window.close();
          }
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
};

export const generateSummaryReport = (data) => {
  generateDetailedReport(data);
};

export const generateDefaultersReport = (data) => {
  generateDetailedReport(data);
};