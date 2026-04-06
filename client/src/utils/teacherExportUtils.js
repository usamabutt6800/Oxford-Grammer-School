// teacherExportUtils.js - Complete with all exports

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = (teachers, title = 'Teacher List') => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(`Oxford Grammar School - ${title}`, 14, 15);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
  
  // Table
  const tableColumn = ['Employee ID', 'Name', 'Qualification', 'Experience', 'Phone', 'Status', 'Salary (PKR)'];
  const tableRows = [];
  
  teachers.forEach(teacher => {
    const teacherData = [
      teacher.employeeId,
      `${teacher.firstName} ${teacher.lastName || ''}`,
      teacher.qualification,
      `${teacher.experience} years`,
      teacher.phone || 'N/A',
      teacher.status,
      `PKR ${teacher.salary?.toLocaleString() || '0'}`
    ];
    tableRows.push(teacherData);
  });
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] }
  });
  
  // Save PDF
  doc.save(`oxford-teachers-${new Date().toISOString().split('T')[0]}.pdf`);
};

// ADD THIS FUNCTION - it was missing
export const exportToCSV = (teachers, title = 'Teacher List') => {
  const headers = ['Employee ID,Name,Qualification,Experience,Subjects,Phone,Email,Status,Salary (PKR)'];
  
  const csvData = teachers.map(teacher => 
    `"${teacher.employeeId}","${teacher.firstName} ${teacher.lastName || ''}","${teacher.qualification}","${teacher.experience} years","${teacher.subjects?.join(', ') || ''}","${teacher.phone || ''}","${teacher.email || ''}","${teacher.status}","${teacher.salary || '0'}"`
  ).join('\n');
  
  const csvContent = headers.join('\n') + '\n' + csvData;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `oxford-teachers-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printTeachers = (teachers) => {
  const printWindow = window.open('', '_blank');
  
  // Calculate totals
  const allTeachers = teachers;
  const totalActive = allTeachers.filter(t => t.status === 'Active').length;
  const totalOnLeave = allTeachers.filter(t => t.status === 'On Leave').length;
  const totalSalary = allTeachers.reduce((sum, t) => sum + (t.salary || 0), 0);
  const totalExperience = allTeachers.reduce((sum, t) => sum + (t.experience || 0), 0);
  const avgExperience = allTeachers.length > 0 ? (totalExperience / allTeachers.length).toFixed(1) : 0;
  const avgSalary = allTeachers.length > 0 ? (totalSalary / allTeachers.length).toLocaleString('en-PK') : 0;

  // Group teachers by designation for statistics
  const designationCounts = {};
  allTeachers.forEach(teacher => {
    const designation = teacher.designation || 'Teacher';
    if (!designationCounts[designation]) {
      designationCounts[designation] = 0;
    }
    designationCounts[designation]++;
  });

  // Group teachers by qualification
  const qualificationCounts = {};
  allTeachers.forEach(teacher => {
    const qual = teacher.qualification || 'Not Specified';
    if (!qualificationCounts[qual]) {
      qualificationCounts[qual] = 0;
    }
    qualificationCounts[qual]++;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Oxford Grammar School - Teacher Directory</title>
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
        
        /* Report Info */
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
        
        /* Overall Summary */
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
        
        /* Teacher Table */
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
        
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        /* Teacher Summary */
        .teacher-summary {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          border-radius: 4px;
          padding: 0.15in;
          margin-top: 0.1in;
          color: white;
          page-break-inside: avoid;
        }
        
        .teacher-summary-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.1in;
        }
        
        /* Footer */
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
        
        /* Status badges */
        .status-active {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 8pt;
          font-weight: 700;
          background-color: #d1fae5;
          color: #065f46;
        }
        
        .status-onleave {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 8pt;
          font-weight: 700;
          background-color: #fef3c7;
          color: #92400e;
        }
        
        .status-inactive {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 8pt;
          font-weight: 700;
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        /* Class badges */
        .class-badge {
          display: inline-block;
          padding: 1px 4px;
          background-color: #e0f2fe;
          color: #0369a1;
          border-radius: 4px;
          font-size: 7pt;
          margin: 1px;
        }
        
        /* Compact info */
        .compact-info {
          font-size: 8pt;
          line-height: 1.2;
        }
        
        /* PRINT-SPECIFIC STYLES */
        @media print {
          body { 
            margin: 0.5in !important;
            padding: 0 !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          .print-controls { 
            display: none !important; 
          }
          
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
        
        /* Watermark */
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
            FACULTY MASTER DIRECTORY
          </h2>
          <h3 style="color: #dc2626; margin: 0.05in 0; font-size: 14pt; font-weight: 600;">
            Academic Session: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}
          </h3>
        </div>
        
        <!-- Report Info -->
        <div class="report-info">
          <div>
            <span><strong>Report Type:</strong> Faculty Directory</span>
            <span><strong>Generated:</strong> ${new Date().toLocaleDateString('en-PK')}</span>
          </div>
          <div>
            <span><strong>Time:</strong> ${new Date().toLocaleTimeString('en-PK', {hour: '2-digit', minute: '2-digit'})}</span>
            <span><strong>Total Teachers:</strong> ${allTeachers.length}</span>
          </div>
          <div>
            <span><strong>Report ID:</strong> TCH-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}</span>
            <span><strong>Pages:</strong> <span id="totalPages">--</span></span>
          </div>
        </div>
        
        <!-- Faculty at a Glance -->
        <div class="overall-summary">
          <h3>FACULTY AT A GLANCE</h3>
          <div class="overall-stats">
            <div class="overall-stat">
              <div class="overall-stat-value">${allTeachers.length}</div>
              <div class="overall-stat-label">Total Teachers</div>
            </div>
            <div class="overall-stat">
              <div class="overall-stat-value">${totalActive}</div>
              <div class="overall-stat-label">Active</div>
            </div>
            <div class="overall-stat">
              <div class="overall-stat-value">PKR ${totalSalary.toLocaleString('en-PK')}</div>
              <div class="overall-stat-label">Monthly Salary</div>
            </div>
            <div class="overall-stat">
              <div class="overall-stat-value">${avgExperience} yrs</div>
              <div class="overall-stat-label">Avg Experience</div>
            </div>
          </div>
        </div>
        
        <!-- Designation Distribution -->
        <div style="margin: 0.3in 0;">
          <h3 style="color: #111827; margin-bottom: 0.1in; font-size: 12pt; font-weight: 700;">Designation Distribution</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.1in;">
            ${Object.entries(designationCounts).map(([designation, count]) => `
              <div style="background: #f3f4f6; padding: 0.1in; border-radius: 4px; text-align: center;">
                <div style="font-weight: 800; color: #1e40af; font-size: 14pt;">${count}</div>
                <div style="font-size: 8pt; color: #6b7280;">${designation}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <!-- Teacher Details Table -->
      <table>
        <thead>
          <tr>
            <th width="5%">#</th>
            <th width="10%">Emp ID</th>
            <th width="20%">Teacher Information</th>
            <th width="15%">Professional Details</th>
            <th width="15%">Assigned Classes</th>
            <th width="10%">Contact</th>
            <th width="10%">Joining Date</th>
            <th width="10%">Salary (PKR)</th>
            <th width="5%">Status</th>
          </tr>
        </thead>
        <tbody>
          ${allTeachers.map((teacher, index) => {
            const statusClass = teacher.status === 'Active' ? 'status-active' : 
                              teacher.status === 'On Leave' ? 'status-onleave' : 'status-inactive';
            
            // Format joining date
            const joiningDate = teacher.joiningDate ? 
              new Date(teacher.joiningDate).toLocaleDateString('en-PK', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              }) : 'N/A';
            
            // Calculate total years since joining
            const yearsSinceJoining = teacher.joiningDate ? 
              Math.floor((new Date() - new Date(teacher.joiningDate)) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
            
            // Format assigned classes
            let assignedClassesHTML = '<span style="color: #9ca3af; font-size: 8pt;">Not assigned</span>';
            if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
              assignedClassesHTML = teacher.assignedClasses.map((cls, idx) => {
                const classText = typeof cls === 'string' ? cls : (cls.class ? `${cls.class}-${cls.section || ''}` : '');
                return `<div class="class-badge">${classText}</div>`;
              }).join('');
            }
            
            // Format contact info
            let contactHTML = '';
            if (teacher.phone) contactHTML += `<div><span style="font-weight: 600;">P:</span> ${teacher.phone}</div>`;
            if (teacher.email) contactHTML += `<div><span style="font-weight: 600;">E:</span> ${teacher.email}</div>`;
            if (teacher.address && teacher.address.city) contactHTML += `<div><span style="font-weight: 600;">City:</span> ${teacher.address.city}</div>`;
            
            return `
              <tr>
                <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                <td>
                  <div style="font-weight: 700; color: #1e40af; font-size: 9pt;">${teacher.employeeId || 'N/A'}</div>
                </td>
                <td class="compact-info">
                  <div style="font-weight: 700;">${teacher.firstName} ${teacher.lastName || ''}</div>
                  <div style="color: #4b5563;">
                    <div>${teacher.designation || 'Teacher'}</div>
                    <div>${teacher.gender || ''} | CNIC: ${teacher.cnic || 'N/A'}</div>
                  </div>
                </td>
                <td class="compact-info">
                  <div style="margin-bottom: 3px;">
                    <div style="font-weight: 600;">Qualification:</div>
                    <div>${teacher.qualification || 'N/A'}</div>
                  </div>
                  <div>
                    <div style="font-weight: 600;">Experience:</div>
                    <div>${teacher.experience || 0} years (${yearsSinceJoining} years service)</div>
                  </div>
                  <div style="margin-top: 3px;">
                    <div style="font-weight: 600;">Subjects:</div>
                    <div style="color: #6b7280; font-size: 7pt;">
                      ${teacher.subjects ? teacher.subjects.slice(0, 3).join(', ') : 'Not assigned'}
                      ${teacher.subjects && teacher.subjects.length > 3 ? '...' : ''}
                    </div>
                  </div>
                </td>
                <td class="compact-info">
                  ${assignedClassesHTML}
                </td>
                <td class="compact-info">
                  ${contactHTML}
                </td>
                <td class="compact-info">
                  <div style="font-weight: 600; color: #1e40af;">
                    ${joiningDate}
                  </div>
                  <div style="font-size: 7pt; color: #6b7280;">
                    ${yearsSinceJoining} years service
                  </div>
                </td>
                <td>
                  <div style="color: #059669; font-weight: 700; font-size: 9pt;">
                    PKR ${(teacher.salary || 0).toLocaleString('en-PK')}
                  </div>
                  <div style="font-size: 7pt; color: #6b7280;">
                    Monthly
                  </div>
                </td>
                <td>
                  <span class="${statusClass}">
                    ${teacher.status ? teacher.status.charAt(0) : 'A'}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <!-- Summary Section -->
      <div class="teacher-summary">
        <h4 style="margin: 0 0 0.1in 0; font-size: 11pt; color: white;">Faculty Summary</h4>
        <div class="teacher-summary-stats">
          <div class="stat-item">
            <div style="font-weight: 800; font-size: 14pt; color: white;">${allTeachers.length}</div>
            <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.9);">Total Teachers</div>
          </div>
          <div class="stat-item">
            <div style="font-weight: 800; font-size: 14pt; color: white;">${totalActive}</div>
            <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.9);">Active</div>
          </div>
          <div class="stat-item">
            <div style="font-weight: 800; font-size: 14pt; color: white;">PKR ${totalSalary.toLocaleString('en-PK')}</div>
            <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.9);">Monthly Salary</div>
          </div>
          <div class="stat-item">
            <div style="font-weight: 800; font-size: 14pt; color: white;">${avgExperience} yrs</div>
            <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.9);">Avg Experience</div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
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
            <strong>Report ID:</strong> TCH-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}
          </p>
          <p style="margin: 0.05in 0; color: #6b7280; font-size: 8pt;">
            Generated on: ${new Date().toLocaleString('en-PK')}
          </p>
          <p style="margin: 0.05in 0; color: #6b7280; font-size: 8pt;">
            Total Pages: <span id="pageCount">1</span>
          </p>
        </div>
      </div>
      
      <script>
        // Calculate and display total pages
        function calculatePages() {
          const pageHeight = 1122; // A4 height in pixels
          const contentHeight = document.body.scrollHeight;
          const totalPages = Math.ceil(contentHeight / pageHeight);
          
          document.getElementById('totalPages').textContent = totalPages;
          document.getElementById('pageCount').textContent = totalPages;
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
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
};

// Default export (optional)
export default {
  exportToPDF,
  exportToCSV,
  printTeachers
};