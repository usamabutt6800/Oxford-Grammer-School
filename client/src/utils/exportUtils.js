import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = (students, title = 'Student List') => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(`Oxford Grammar School - ${title}`, 14, 15);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
  
  // Table
  const tableColumn = ['Admission No', 'Name', 'Class', 'Section', 'Phone', 'Status', 'Fee (PKR)'];
  const tableRows = [];
  
  students.forEach(student => {
    const studentData = [
      student.admissionNo,
      `${student.firstName} ${student.lastName || ''}`,
      student.currentClass,
      student.section,
      student.phone || 'N/A',
      student.status,
      `PKR ${student.feeStructure?.netFee?.toLocaleString() || '0'}`
    ];
    tableRows.push(studentData);
  });
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] } // School blue
  });
  
  // Save PDF
  doc.save(`oxford-students-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToCSV = (students, title = 'Student List') => {
  const headers = ['Admission No,Name,Father Name,Class,Section,Phone,Status,Fee (PKR)'];
  
  const csvData = students.map(student => 
    `"${student.admissionNo}","${student.firstName} ${student.lastName || ''}","${student.fatherName}","${student.currentClass}","${student.section}","${student.phone || ''}","${student.status}","${student.feeStructure?.netFee || '0'}"`
  ).join('\n');
  
  const csvContent = headers.join('\n') + '\n' + csvData;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `oxford-students-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printStudents = (students) => {
  const printWindow = window.open('', '_blank');
  
  // Group students by class for better organization
  const studentsByClass = {};
  students.forEach(student => {
    const classKey = `${student.currentClass}-${student.section}`;
    if (!studentsByClass[classKey]) {
      studentsByClass[classKey] = [];
    }
    studentsByClass[classKey].push(student);
  });
  
  // Sort classes in order
  const sortedClasses = Object.keys(studentsByClass).sort((a, b) => {
    const classOrder = {
      'Play Group': 1, 'Nursery': 2, 'Prep': 3, 
      '1': 4, '2': 5, '3': 6, '4': 7, '5': 8,
      '6': 9, '7': 10, '8': 11, '9': 12, '10': 13
    };
    
    const classA = a.split('-')[0];
    const classB = b.split('-')[0];
    const orderA = classOrder[classA] || 14;
    const orderB = classOrder[classB] || 14;
    
    if (orderA !== orderB) return orderA - orderB;
    
    // If same class, sort by section
    const sectionA = a.split('-')[1];
    const sectionB = b.split('-')[1];
    return sectionA.localeCompare(sectionB);
  });

  // Calculate totals for ALL students
  const allStudents = students;
  const totalActive = allStudents.filter(s => s.status === 'Active').length;
  const totalOnDiscount = allStudents.filter(s => s.feeStructure?.discountType !== 'None').length;
  const totalFee = allStudents.reduce((sum, s) => sum + (s.feeStructure?.netFee || 0), 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Oxford Grammar School - Student List</title>
      <style>
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Calibri', 'Arial', sans-serif; 
          margin: 0; 
          padding: 0.5in; /* Half inch margins for A4 */
          background-color: #ffffff;
          color: #333333;
          font-size: 11pt;
          line-height: 1.4;
        }
        
        /* School Header */
        .school-header { 
          text-align: center; 
          margin-bottom: 0.3in;
          padding-bottom: 0.2in;
          border-bottom: 3px solid #1e40af;
        }
        
        .school-header h1 { 
          margin: 0; 
          font-size: 26pt;
          letter-spacing: 1.2px;
          font-weight: 800;
          color: #1e40af;
        }
        
        .school-header h2 {
          margin: 0.05in 0;
          font-size: 18pt;
          font-weight: 600;
          color: #dc2626;
        }
        
        .school-header h3 {
          margin: 0.08in 0;
          color: #374151;
          font-size: 12pt;
          font-weight: normal;
        }
        
        /* Report Info - Compact */
        .report-info {
          display: flex;
          justify-content: space-between;
          background-color: #1f2937;
          color: white;
          padding: 0.15in;
          border-radius: 4px;
          margin-bottom: 0.25in;
          border: 1px solid #fbbf24;
          font-size: 9pt;
          flex-wrap: wrap;
          gap: 0.1in;
        }
        
        .report-info div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        /* Overall Summary - More compact */
        .overall-summary {
          background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
          border-radius: 6px;
          padding: 0.2in;
          margin: 0.3in 0;
          color: white;
          border: 2px solid #dc2626;
          page-break-inside: avoid;
        }
        
        .overall-summary h3 {
          color: white;
          margin: 0 0 0.15in 0;
          font-size: 14pt;
          font-weight: 700;
          padding-bottom: 0.1in;
          border-bottom: 1px solid #fbbf24;
        }
        
        .overall-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.15in;
        }
        
        .overall-stat {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.15in;
          border-radius: 4px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .overall-stat-value {
          font-size: 16pt;
          font-weight: 800;
          color: #fbbf24;
          margin-bottom: 4px;
        }
        
        .overall-stat-label {
          font-size: 9pt;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Class Header */
        .class-header {
          background-color: #111827;
          color: white;
          padding: 0.1in 0.15in;
          margin: 0.25in 0 0.1in 0;
          border-radius: 4px;
          border-left: 4px solid #fbbf24;
          page-break-after: avoid;
        }
        
        .class-header h3 {
          margin: 0;
          font-size: 12pt;
          font-weight: 700;
          color: white;
        }
        
        /* Student Table - More compact */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.1in 0 0.2in 0;
          font-size: 9pt;
          page-break-inside: auto;
        }
        
        th { 
          background: linear-gradient(to right, #1e40af, #2563eb); 
          color: white; 
          padding: 0.08in 0.06in; 
          text-align: left;
          font-weight: 700;
          font-size: 9pt;
          border: none;
          text-transform: uppercase;
        }
        
        td { 
          padding: 0.06in; 
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
          vertical-align: top;
        }
        
        /* Class Summary */
        .class-summary {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          border-radius: 4px;
          padding: 0.15in;
          margin-top: 0.1in;
          color: white;
          page-break-inside: avoid;
        }
        
        .class-summary-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.1in;
        }
        
        /* School Wide Analytics */
        .school-analytics {
          background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
          border-radius: 6px;
          padding: 0.2in;
          margin: 0.3in 0 0.2in 0;
          color: white;
          border: 2px solid #dc2626;
          page-break-inside: avoid;
          page-break-before: auto;
        }
        
        /* Footer - Fits on one page */
        .footer { 
          margin-top: 0.3in; 
          text-align: center; 
          font-size: 10pt; 
          color: #6b7280; 
          padding-top: 0.15in;
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
          padding: 0.2in;
          border-radius: 4px;
          page-break-inside: avoid;
        }
        
        .signature-section {
          display: flex;
          justify-content: space-around;
          margin: 0.2in 0;
          padding-top: 0.15in;
          border-top: 1px dashed #d1d5db;
          flex-wrap: wrap;
          gap: 0.2in;
        }
        
        .signature-box {
          text-align: center;
          min-width: 1.5in;
          flex: 1;
        }
        
        .signature-line {
          width: 1.5in;
          height: 1px;
          background-color: #9ca3af;
          margin: 0.4in auto 0.1in;
        }
        
        /* PRINT-SPECIFIC STYLES - CRITICAL */
        @media print {
          body { 
            margin: 0.5in !important;
            padding: 0 !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Force A4 paper size */
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          /* Prevent page breaks inside critical sections */
          .overall-summary,
          .school-analytics,
          .footer,
          .class-header + table,
          .class-summary {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Allow page breaks between classes */
          .class-section {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          
          /* Force page break after School at a Glance */
          .overall-summary {
            page-break-after: always !important;
            break-after: page !important;
          }
          
          /* Keep footer on same page */
          .footer {
            page-break-before: avoid !important;
            break-before: avoid !important;
            position: relative;
            bottom: 0;
          }
          
          /* Ensure tables don't break awkwardly */
          table {
            page-break-inside: auto !important;
          }
          
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          
          /* Adjust font sizes for print */
          .school-header h1 { 
            font-size: 22pt !important; 
          }
          
          .school-header h2 {
            font-size: 16pt !important;
          }
          
          .report-info {
            font-size: 8pt !important;
          }
          
          /* Hide print controls */
          .print-controls { 
            display: none !important; 
          }
          
          /* Ensure background colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        
        /* Screen-only styles */
        @media screen {
          .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: white;
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            border: 2px solid #1e40af;
            display: flex;
            gap: 10px;
          }
          
          .print-btn, .close-btn {
            background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .close-btn {
            background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
          }
        }
        
        /* Utility classes for page breaks */
        .page-break-before {
          page-break-before: always !important;
          break-before: page !important;
        }
        
        .page-break-after {
          page-break-after: always !important;
          break-after: page !important;
        }
        
        .keep-together {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* Compact student info */
        .compact-info {
          font-size: 8pt;
          line-height: 1.2;
        }
        
        /* Watermark - subtle */
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px;
          color: rgba(30, 64, 175, 0.03);
          pointer-events: none;
          z-index: -1;
          white-space: nowrap;
          font-weight: 900;
        }
      </style>
    </head>
    <body>
      <!-- Print Controls (screen only) -->
      <div class="print-controls">
        <button class="print-btn" onclick="window.print()">
          <span>🖨️</span> Print
        </button>
        <button class="close-btn" onclick="window.close()">
          <span>✕</span> Close
        </button>
      </div>
      
      <!-- Watermark -->
      <div class="watermark">OXFORD GRAMMAR SCHOOL</div>
      
      <!-- Page 1: Header and Summary -->
      <div class="page-1">
        <!-- School Header -->
        <div class="school-header">
          <h1>OXFORD GRAMMAR SCHOOL</h1>
          <h2>Excellence in Education Since 1990</h2>
          <h3>123 Education Street, Karachi, Pakistan</h3>
        </div>
        
        <!-- Report Title -->
        <div style="text-align: center; margin-bottom: 0.2in;">
          <h2 style="color: #111827; margin: 0; font-size: 18pt; font-weight: 800;">
            STUDENT MASTER DIRECTORY
          </h2>
          <h3 style="color: #dc2626; margin: 0.05in 0; font-size: 14pt; font-weight: 600;">
            Academic Session: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}
          </h3>
        </div>
        
        <!-- Report Info -->
        <div class="report-info">
          <div>
            <span><strong>Report Type:</strong> Student Directory</span>
            <span><strong>Generated:</strong> ${new Date().toLocaleDateString('en-PK')}</span>
          </div>
          <div>
            <span><strong>Time:</strong> ${new Date().toLocaleTimeString('en-PK', {hour: '2-digit', minute: '2-digit'})}</span>
            <span><strong>Total Students:</strong> ${allStudents.length}</span>
          </div>
          <div>
            <span><strong>Report ID:</strong> STU-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}</span>
            <span><strong>Pages:</strong> <span id="totalPages">--</span></span>
          </div>
        </div>
        
        <!-- School at a Glance -->
        <div class="overall-summary">
          <h3>SCHOOL AT A GLANCE</h3>
          <div class="overall-stats">
            <div class="overall-stat">
              <div class="overall-stat-value">${allStudents.length}</div>
              <div class="overall-stat-label">Total Students</div>
            </div>
            <div class="overall-stat">
              <div class="overall-stat-value">${sortedClasses.length}</div>
              <div class="overall-stat-label">Class Sections</div>
            </div>
            <div class="overall-stat">
              <div class="overall-stat-value">PKR ${totalFee.toLocaleString('en-PK')}</div>
              <div class="overall-stat-label">Monthly Revenue</div>
            </div>
            <div class="overall-stat">
              <div class="overall-stat-value">${totalActive}</div>
              <div class="overall-stat-label">Active Students</div>
            </div>
          </div>
        </div>
        <!-- Page break after School at a Glance -->
        <div style="page-break-after: always;"></div>
      </div>
      
      <!-- Page 2 onwards: Class-wise Student Lists -->
      ${sortedClasses.map((classKey, classIndex) => {
        const classStudents = studentsByClass[classKey];
        const [className, section] = classKey.split('-');
        
        const classStats = {
          total: classStudents.length,
          active: classStudents.filter(s => s.status === 'Active').length,
          totalFee: classStudents.reduce((sum, s) => sum + (s.feeStructure?.netFee || 0), 0),
          onDiscount: classStudents.filter(s => s.feeStructure?.discountType !== 'None').length
        };
        
        return `
          <div class="class-section ${classIndex > 0 ? 'page-break-before' : ''}">
            <div class="class-header">
              <h3>Class ${className} - Section ${section}</h3>
              <div style="font-size: 9pt; color: #d1d5db; margin-top: 2px;">
                Students: ${classStats.total} | Active: ${classStats.active} | Discount: ${classStats.onDiscount}
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th width="4%">#</th>
                  <th width="12%">Admission No.</th>
                  <th width="22%">Student Information</th>
                  <th width="18%">Parent Information</th>
                  <th width="14%">Contact Details</th>
                  <th width="10%">Admission</th>
                  <th width="10%">Monthly Fee</th>
                  <th width="7%">Status</th>
                  <th width="3%">Disc.</th>
                </tr>
              </thead>
              <tbody>
                ${classStudents.map((student, index) => {
                  const hasDiscount = student.feeStructure?.discountType !== 'None';
                  const parentRelation = student.gender === 'Female' ? 'D/O' : 'S/O';
                  const statusClass = student.status === 'Active' ? 'status-active' : 
                                     student.status === 'Graduated' ? 'status-graduated' : 'status-inactive';
                  
                  return `
                  <tr>
                    <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                    <td>
                      <div style="font-weight: 700; color: #1e40af; font-size: 9pt;">${student.admissionNo}</div>
                      <div style="font-size: 8pt; color: #6b7280;">Roll: ${student.rollNo || 'N/A'}</div>
                    </td>
                    <td class="compact-info">
                      <div style="font-weight: 700;">${student.firstName} ${student.lastName || ''}</div>
                      <div>${parentRelation} ${student.fatherName}</div>
                      <div style="color: #4b5563;">
                        <span>DOB: ${student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-PK') : 'N/A'}</span> | 
                        <span>${student.gender}</span>
                      </div>
                    </td>
                    <td class="compact-info">
                      <div style="margin-bottom: 3px;">
                        <div style="font-weight: 600;">Father:</div>
                        <div>${student.fatherName}</div>
                      </div>
                      <div>
                        <div style="font-weight: 600;">Mother:</div>
                        <div>${student.motherName || 'N/A'}</div>
                      </div>
                    </td>
                    <td class="compact-info">
                      ${student.phone ? `<div><span style="font-weight: 600;">S:</span> ${student.phone}</div>` : ''}
                      ${student.fatherPhone ? `<div><span style="font-weight: 600;">F:</span> ${student.fatherPhone}</div>` : ''}
                      ${student.email ? `<div><span style="font-weight: 600;">E:</span> ${student.email}</div>` : ''}
                    </td>
                    <td class="compact-info">
                      <div style="font-weight: 600; color: #1e40af;">
                        ${student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-PK') : 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style="color: #059669; font-weight: 700; font-size: 9pt;">
                        PKR ${(student.feeStructure?.netFee || 0).toLocaleString('en-PK')}
                      </div>
                      ${hasDiscount ? 
                        `<div style="font-size: 7pt; color: #10b981; background-color: #d1fae5; padding: 1px 4px; border-radius: 8px; margin-top: 2px; display: inline-block;">
                          ${student.feeStructure.discountType}
                        </div>` : 
                        ''
                      }
                    </td>
                    <td>
                      <span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 8pt; font-weight: 700; ${statusClass === 'status-active' ? 'background-color: #d1fae5; color: #065f46;' : statusClass === 'status-graduated' ? 'background-color: #f3e8ff; color: #7c3aed;' : 'background-color: #fee2e2; color: #991b1b;'}">
                        ${student.status.charAt(0)}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      ${hasDiscount ? 
                        '<span style="color: #10b981; font-weight: 800;">✓</span>' : 
                        '<span style="color: #9ca3af;">—</span>'
                      }
                    </td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
            
            <div class="class-summary">
              <h4 style="margin: 0 0 0.1in 0; font-size: 11pt;">Class ${className}-${section} Summary</h4>
              <div class="class-summary-stats">
                <div class="stat-item">
                  <div style="font-weight: 800; font-size: 14pt; color: white;">${classStats.total}</div>
                  <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.9);">Total</div>
                </div>
                <div class="stat-item">
                  <div style="font-weight: 800; font-size: 14pt; color: white;">${classStats.active}</div>
                  <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.9);">Active</div>
                </div>
                <div class="stat-item">
                  <div style="font-weight: 800; font-size: 14pt; color: white;">PKR ${classStats.totalFee.toLocaleString('en-PK')}</div>
                  <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.9);">Fees</div>
                </div>
                <div class="stat-item">
                  <div style="font-weight: 800; font-size: 14pt; color: white;">${classStats.onDiscount}</div>
                  <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.9);">Discount</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
      
      <!-- Last Page: School Analytics and Footer -->
      <div class="page-break-before keep-together">
        <div class="school-analytics">
          <h3>SCHOOL WIDE ANALYTICS</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.2in; margin-top: 0.15in;">
            <div>
              <h4 style="color: white; margin-bottom: 0.1in; font-size: 11pt;">Student Distribution</h4>
              ${sortedClasses.map(classKey => {
                const classStudents = studentsByClass[classKey];
                const [className, section] = classKey.split('-');
                const percentage = ((classStudents.length / allStudents.length) * 100).toFixed(1);
                
                return `
                  <div style="margin-bottom: 0.05in;">
                    <div style="display: flex; justify-content: space-between; font-size: 9pt;">
                      <span style="color: #d1d5db;">${className}-${section}</span>
                      <span style="font-weight: 700; color: #fbbf24;">
                        ${classStudents.length} (${percentage}%)
                      </span>
                    </div>
                    <div style="height: 6px; background-color: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden;">
                      <div style="width: ${Math.max(5, percentage * 2)}%; height: 100%; background: linear-gradient(90deg, #60a5fa, #3b82f6);"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            
            <div>
              <h4 style="color: white; margin-bottom: 0.1in; font-size: 11pt;">Quick Statistics</h4>
              <div style="background: rgba(255, 255, 255, 0.05); padding: 0.15in; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.1in; padding-bottom: 0.1in; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                  <span style="color: #d1d5db;">Monthly Revenue:</span>
                  <span style="font-weight: 800; color: #fbbf24;">
                    PKR ${totalFee.toLocaleString('en-PK')}
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.1in;">
                  <span style="color: #d1d5db;">Scholarship Students:</span>
                  <span style="font-weight: 800; color: #a78bfa;">
                    ${totalOnDiscount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer - All in one block -->
        <div class="footer keep-together">
          <p style="font-size: 10pt; font-weight: 700; color: #1e40af; margin-bottom: 0.15in;">
            Oxford Grammar School Management System
          </p>
          
          <div class="signature-section">
            <div class="signature-box">
              <div style="font-weight: 600; color: #374151; margin-bottom: 0.05in;">Principal's Signature</div>
              <div class="signature-line"></div>
              <div style="font-size: 9pt; color: #6b7280; margin-top: 0.05in;">_________________________</div>
            </div>
            
            <div class="signature-box">
              <div style="font-weight: 600; color: #374151; margin-bottom: 0.05in;">Administrator's Signature</div>
              <div class="signature-line"></div>
              <div style="font-size: 9pt; color: #6b7280; margin-top: 0.05in;">_________________________</div>
            </div>
            
            <div class="signature-box">
              <div style="font-weight: 600; color: #374151; margin-bottom: 0.05in;">School Stamp & Seal</div>
              <div class="signature-line"></div>
              <div style="font-size: 9pt; color: #6b7280; margin-top: 0.05in;">_________________________</div>
            </div>
          </div>
          
          <div style="margin-top: 0.2in; padding-top: 0.1in; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0.05in 0; color: #6b7280; font-size: 9pt;">
              <strong>Report ID:</strong> STU-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}
            </p>
            <p style="margin: 0.05in 0; color: #6b7280; font-size: 8pt;">
              Generated on: ${new Date().toLocaleString('en-PK')}
            </p>
          </div>
        </div>
      </div>
      
      <script>
        // Calculate and display total pages
        function calculatePages() {
          const pageHeight = 1122; // A4 height in pixels
          const contentHeight = document.body.scrollHeight;
          const totalPages = Math.ceil(contentHeight / pageHeight);
          
          document.getElementById('totalPages').textContent = totalPages;
        }
        
        // Auto-focus and calculate pages
        window.focus();
        setTimeout(calculatePages, 500);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
          if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            window.print();
          }
          if (e.key === 'Escape') {
            window.close();
          }
        });
        
        // Force A4 size in print dialog
        const style = document.createElement('style');
        style.textContent = \`
          @media print {
            @page {
              size: A4;
              margin: 0.5in;
            }
          }
        \`;
        document.head.appendChild(style);
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Focus the window
  printWindow.focus();
};