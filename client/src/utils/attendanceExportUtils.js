
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSunday } from 'date-fns';

// Install: npm install jspdf jspdf-autotable date-fns

export const exportDailyAttendancePDF = (attendanceData, title = 'Daily Attendance Report') => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(`Oxford Grammar School - ${title}`, 14, 15);
  
  // Date and Class
  doc.setFontSize(10);
  doc.text(`Date: ${format(new Date(attendanceData.date), 'dd/MM/yyyy')}`, 14, 25);
  doc.text(`Class: ${attendanceData.class}-${attendanceData.section}`, 14, 32);
  
  if (attendanceData.isSunday) {
    doc.setFontSize(12);
    doc.setTextColor(255, 0, 0);
    doc.text('Sunday - No School', 14, 40);
    doc.save(`attendance-sunday-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    return;
  }
  
  if (attendanceData.holiday) {
    doc.setFontSize(12);
    doc.setTextColor(255, 0, 0);
    doc.text(`Holiday: ${attendanceData.holiday}`, 14, 40);
    doc.save(`attendance-holiday-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    return;
  }
  
  // Summary
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Total Students: ${attendanceData.summary.total}`, 14, 40);
  doc.text(`Present: ${attendanceData.summary.present}`, 14, 47);
  doc.text(`Absent: ${attendanceData.summary.absent}`, 14, 54);
  doc.text(`Leave: ${attendanceData.summary.leave}`, 14, 61);
  doc.text(`Attendance: ${attendanceData.summary.percentage}%`, 14, 68);
  
  // Table
  const tableColumn = ['Roll No', 'Student Name', 'Father Name', 'Status', 'Remarks'];
  const tableRows = [];
  
  attendanceData.students.forEach(student => {
    const studentRow = [
      student.rollNo,
      student.name,
      student.fatherName,
      student.status,
      student.remarks || '-'
    ];
    tableRows.push(studentRow);
  });
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 75,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { cellWidth: 20 },
      4: { cellWidth: 40 }
    }
  });
  
  // Save PDF
  doc.save(`attendance-${attendanceData.class}-${attendanceData.section}-${format(new Date(attendanceData.date), 'yyyy-MM-dd')}.pdf`);
};

export const exportMonthlyAttendancePDF = (monthlyData, title = 'Monthly Attendance Report') => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(`Oxford Grammar School - ${title}`, 14, 15);
  
  // Month and Class
  doc.setFontSize(10);
  doc.text(`Month: ${monthlyData.month} ${monthlyData.year}`, 14, 25);
  doc.text(`Class: ${monthlyData.class}-${monthlyData.section}`, 14, 32);
  doc.text(`Total Students: ${monthlyData.totalStudents}`, 14, 39);
  doc.text(`Working Days: ${monthlyData.workingDays}`, 14, 46);
  doc.text(`Holidays: ${monthlyData.holidays}`, 14, 53);
  doc.text(`Sundays: ${monthlyData.sundays}`, 14, 60);
  doc.text(`Monthly Attendance: ${monthlyData.summary.monthlyPercentage}%`, 14, 67);
  
  // Daily attendance table
  const tableColumn = ['Date', 'Day', 'Present', 'Absent', 'Leave', '%', 'Working Day'];
  const tableRows = [];
  
  monthlyData.dailyData.forEach(day => {
    const row = [
      format(day.date, 'dd/MM'),
      format(day.date, 'EEE'),
      day.present,
      day.absent,
      day.leave,
      `${day.percentage}%`,
      day.workingDay ? 'Yes' : 'No'
    ];
    tableRows.push(row);
  });
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 75,
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 }
    },
    didDrawPage: function(data) {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        'Oxford Grammar School Management System',
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    }
  });
  
  // Save PDF
  doc.save(`monthly-attendance-${monthlyData.class}-${monthlyData.section}-${monthlyData.year}-${monthlyData.month}.pdf`);
};

export const exportStudentAttendancePDF = (studentData, title = 'Student Attendance Report') => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(`Oxford Grammar School - ${title}`, 14, 15);
  
  // Student Info
  doc.setFontSize(10);
  doc.text(`Student: ${studentData.student.name}`, 14, 25);
  doc.text(`Roll No: ${studentData.student.rollNo}`, 14, 32);
  doc.text(`Class: ${studentData.student.class}-${studentData.student.section}`, 14, 39);
  doc.text(`Period: ${format(studentData.period.startDate, 'dd/MM/yyyy')} to ${format(studentData.period.endDate, 'dd/MM/yyyy')}`, 14, 46);
  
  // Summary
  doc.text(`Working Days: ${studentData.period.workingDays}`, 14, 53);
  doc.text(`Present: ${studentData.summary.present} days`, 14, 60);
  doc.text(`Absent: ${studentData.summary.absent} days`, 14, 67);
  doc.text(`Leave: ${studentData.summary.leave} days`, 14, 74);
  doc.text(`Attendance: ${studentData.summary.attendancePercentage}%`, 14, 81);
  
  // Status legend
  const legendY = 88;
  doc.setFontSize(8);
  doc.text('Legend: P=Present, A=Absent, L=Leave, S=Sunday, H=Holiday', 14, legendY);
  
  // Attendance grid (calendar style)
  const startY = legendY + 10;
  const cellSize = 8;
  const marginLeft = 14;
  const daysInWeek = 7;
  
  let x = marginLeft;
  let y = startY;
  
  // Draw calendar grid
  studentData.attendance.forEach((day, index) => {
    // New week
    if (index > 0 && index % daysInWeek === 0) {
      x = marginLeft;
      y += cellSize + 2;
    }
    
    // Draw date box
    doc.rect(x, y, cellSize, cellSize);
    
    // Add day number
    doc.setFontSize(6);
    doc.text(format(day.date, 'd'), x + 1, y + 3);
    
    // Add status
    let statusChar = '';
    let color = [0, 0, 0];
    
    if (day.status === 'Sunday') {
      statusChar = 'S';
      color = [255, 0, 0]; // Red
    } else if (day.status.includes('Holiday')) {
      statusChar = 'H';
      color = [255, 165, 0]; // Orange
    } else if (day.status === 'Present') {
      statusChar = 'P';
      color = [0, 128, 0]; // Green
    } else if (day.status === 'Absent') {
      statusChar = 'A';
      color = [255, 0, 0]; // Red
    } else if (day.status === 'Leave') {
      statusChar = 'L';
      color = [128, 0, 128]; // Purple
    } else {
      statusChar = '-';
    }
    
    doc.setTextColor(...color);
    doc.text(statusChar, x + 5, y + 6);
    doc.setTextColor(0, 0, 0);
    
    x += cellSize + 2;
  });
  
  // Save PDF
  doc.save(`student-attendance-${studentData.student.rollNo}-${format(new Date(), 'yyyy-MM')}.pdf`);
};

export const printAttendance = (attendanceData, type = 'daily') => {
  const printWindow = window.open('', '_blank');
  
  let htmlContent = '';
  
  if (type === 'daily') {
    htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Oxford Grammar School - Daily Attendance</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
          .header h1 { color: #1e40af; margin: 0; }
          .info { margin: 20px 0; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #1e40af; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .present { color: #16a34a; }
          .absent { color: #dc2626; }
          .leave { color: #9333ea; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Oxford Grammar School</h1>
          <h2>Daily Attendance Report</h2>
          <div class="info">
            <p>Date: ${format(new Date(attendanceData.date), 'dd/MM/yyyy')}</p>
            <p>Class: ${attendanceData.class}-${attendanceData.section}</p>
          </div>
        </div>
        
        <div class="summary">
          <h3>Summary</h3>
          <p>Total Students: ${attendanceData.summary.total}</p>
          <p>Present: <span class="present">${attendanceData.summary.present}</span></p>
          <p>Absent: <span class="absent">${attendanceData.summary.absent}</span></p>
          <p>Leave: <span class="leave">${attendanceData.summary.leave}</span></p>
          <p>Attendance: ${attendanceData.summary.percentage}%</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Student Name</th>
              <th>Father Name</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceData.students.map(student => `
              <tr>
                <td>${student.rollNo}</td>
                <td>${student.name}</td>
                <td>${student.fatherName}</td>
                <td class="${student.status.toLowerCase()}">${student.status}</td>
                <td>${student.remarks || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Oxford Grammar School Management System</p>
          <p>Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </body>
      </html>
    `;
  }
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};
