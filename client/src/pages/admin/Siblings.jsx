// client/src/pages/admin/Siblings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  FaUsers, FaMoneyBillWave, FaSearch, FaChevronDown, FaChevronUp,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaReceipt,
  FaPrint, FaSpinner, FaTimes, FaUserFriends, FaRupeeSign
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = [`${currentYear-1}-${currentYear}`, `${currentYear}-${currentYear+1}`];

const formatPKR = (n) => `Rs. ${(n || 0).toLocaleString('en-PK')}`;

const statusBadge = (status) => {
  const map = {
    'Paid':           'bg-green-100 text-green-800 border border-green-200',
    'Partially Paid': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'Pending':        'bg-orange-100 text-orange-800 border border-orange-200',
    'Overdue':        'bg-red-100 text-red-800 border border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
};

// ─── Payment Modal ───────────────────────────────────────────────
const PaymentModal = ({ group, month, academicYear, onClose, onSuccess, api }) => {
  const totalDue = group.summary?.totalDue || 0;
  const [amount, setAmount] = useState(totalDue);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  // Build preview of how payment will be distributed
  useEffect(() => {
    if (!amount || amount <= 0) { setPreview(null); return; }
    // Replicate backend logic: highest class first
    const classOrder = ['Play Group','Nursery','Prep','1','2','3','4','5','6','7','8','9','10'];
    const rank = (cls) => { const i = classOrder.indexOf(cls); return i === -1 ? 99 : i; };

    const fees = [];
    group.students.forEach(student => {
      const sid = student._id?.toString() || String(student._id);
      const studentFees = group.fees?.[sid] || [];
      studentFees.filter(f => f.dueAmount > 0).forEach(f => {
        fees.push({ studentName: `${student.firstName} ${student.lastName || ''}`.trim(), class: student.currentClass, dueAmount: f.dueAmount, feeId: f._id });
      });
    });
    fees.sort((a, b) => rank(b.class) - rank(a.class));

    let rem = parseFloat(amount);
    const dist = fees.map(f => {
      const pay = Math.min(rem, f.dueAmount);
      rem -= pay;
      return { ...f, paying: pay, remaining: f.dueAmount - pay };
    }).filter(f => f.paying > 0);

    setPreview(dist);
  }, [amount, group]);

  const handlePay = async () => {
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > totalDue) { toast.error(`Amount cannot exceed total due ${formatPKR(totalDue)}`); return; }
    try {
      setSaving(true);
      const res = await api().post('/siblings/pay', {
        fatherName: group.fatherName,
        fatherPhone: group.fatherPhone,
        totalAmount: parseFloat(amount),
        month, academicYear, paymentMode, remarks,
      });
      if (res.data.success) {
        toast.success(`${formatPKR(amount)} distributed successfully`);
        onSuccess(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Family Payment</h2>
            <p className="text-sm text-gray-500">{group.fatherName} — {group.siblingCount} siblings</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition"><FaTimes className="text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Total due */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm font-medium text-orange-800">Total Due ({month} {academicYear})</span>
            <span className="text-xl font-bold text-orange-700">{formatPKR(totalDue)}</span>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">Rs.</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={1} max={totalDue}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} onClick={() => setAmount(Math.round(totalDue * pct / 100))}
                  className="flex-1 py-1 text-xs font-medium bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-md transition">
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Payment mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              {['Cash','Bank Transfer','Cheque','Online','EasyPaisa','JazzCash','Other'].map(m =>
                <option key={m}>{m}</option>
              )}
            </select>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Add note..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Distribution Preview */}
          {preview && preview.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-3">Payment Distribution Preview</p>
              <p className="text-xs text-blue-600 mb-3">Highest class students paid first</p>
              <div className="space-y-2">
                {preview.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.studentName}</p>
                      <p className="text-xs text-gray-500">Class {item.class} • Due: {formatPKR(item.dueAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-700">+{formatPKR(item.paying)}</p>
                      {item.remaining > 0 && <p className="text-xs text-orange-600">Rem: {formatPKR(item.remaining)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handlePay} disabled={saving || !amount || amount <= 0}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
            {saving ? <FaSpinner className="animate-spin" /> : <FaMoneyBillWave />}
            {saving ? 'Processing...' : `Pay ${formatPKR(amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Receipt Modal ───────────────────────────────────────────────
const ReceiptModal = ({ result, group, month, academicYear, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="p-6">
        {/* Receipt Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FaCheckCircle className="text-green-600 text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Successful</h2>
          <p className="text-sm text-gray-500 mt-1">Ref: {result.groupReceiptRef}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Family</span><span className="font-medium">{group.fatherName}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Period</span><span className="font-medium">{month} {academicYear}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Date</span><span className="font-medium">{format(new Date(result.paymentDate), 'dd MMM yyyy, hh:mm a')}</span></div>
          <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
            <span>Total Paid</span><span className="text-green-700">{formatPKR(result.totalPaid)}</span>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Breakdown</p>
          {result.distributions.map((d, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{d.studentName}</p>
                <p className="text-xs text-gray-500">Class {d.class}-{d.section} • {d.receiptNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-700">{formatPKR(d.amountPaid)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(d.status)}`}>{d.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => window.print()} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2">
            <FaPrint /> Print
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">Done</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Sibling Group Card ──────────────────────────────────────────
const SiblingGroupCard = ({ group, month, academicYear, onPay, api }) => {
  const [expanded, setExpanded] = useState(false);
  const { summary, students, fees } = group;

  const printFamilyInvoice = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Family Invoice - ${group.fatherName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 30px; }
          .header { text-align: center; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
          .header h1 { font-size: 22px; font-weight: bold; color: #1d4ed8; }
          .header p { font-size: 13px; color: #555; margin-top: 4px; }
          .family-info { display: flex; justify-content: space-between; background: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }
          .family-info div { line-height: 1.6; }
          .family-info strong { color: #111; }
          .student-block { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
          .student-header { background: #eff6ff; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dbeafe; }
          .student-header h3 { font-size: 14px; font-weight: bold; color: #1e40af; }
          .student-header span { font-size: 12px; color: #555; }
          .discount-badge { background: #f3e8ff; color: #7e22ce; font-size: 11px; padding: 2px 8px; border-radius: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f9fafb; text-align: left; padding: 8px 12px; font-size: 12px; color: #374151; border-bottom: 1px solid #e5e7eb; }
          td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
          .text-right { text-align: right; }
          .total-row td { font-weight: bold; background: #f9fafb; }
          .net-row td { font-weight: bold; color: #1d4ed8; background: #eff6ff; }
          .paid-row td { color: #15803d; }
          .due-row td { font-weight: bold; color: #dc2626; background: #fef2f2; }
          .section-title { font-size: 12px; font-weight: bold; color: #374151; padding: 10px 14px 6px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
          .family-total { background: #1d4ed8; color: white; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; margin-top: 20px; }
          .family-total span { font-size: 14px; font-weight: bold; }
          .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Oxford Grammar School</h1>
          <p>Family Fee Invoice — ${month} ${academicYear}</p>
          <p>Printed on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
        </div>

        <div class="family-info">
          <div>
            <strong>Father's Name:</strong> ${group.fatherName}<br/>
            <strong>Phone:</strong> ${group.fatherPhone}<br/>
            <strong>Total Children:</strong> ${group.siblingCount}
          </div>
          <div style="text-align:right">
            <strong>Total Fee:</strong> ${formatPKR(summary.totalNet)}<br/>
            <strong style="color:#15803d">Total Paid:</strong> ${formatPKR(summary.totalPaid)}<br/>
            <strong style="color:#dc2626">Total Due:</strong> ${formatPKR(summary.totalDue)}
          </div>
        </div>

        ${students.map(student => {
          const sid = student._id?.toString() || String(student._id);
          const studentFees = fees?.[sid] || [];
          const discount = student.feeStructure?.discountPercentage || 0;
          const discountType = student.feeStructure?.discountType || '';

          return studentFees.map(fee => `
            <div class="student-block">
              <div class="student-header">
                <div>
                  <h3>${student.firstName} ${student.lastName || ''}</h3>
                  <span>Class ${student.currentClass}-${student.section} &nbsp;|&nbsp; Admission No: ${student.admissionNo}</span>
                </div>
                ${discount > 0 ? `<span class="discount-badge">${discountType} ${discount}% off</span>` : ''}
              </div>

              <div class="section-title">Fee Breakdown</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="text-right">Amount (Rs.)</th>
                    <th class="text-right">Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  ${(fee.feeItems || []).map(item => `
                    <tr>
                      <td>${item.itemName}</td>
                      <td class="text-right">${formatPKR(item.amount)}</td>
                      <td class="text-right">${item.addedAt ? format(new Date(item.addedAt), 'dd/MM/yyyy') : '-'}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="text-right">${formatPKR(fee.totalAmount)}</td>
                    <td></td>
                  </tr>
                  ${fee.discount > 0 ? `
                    <tr>
                      <td style="color:#15803d">Discount</td>
                      <td class="text-right" style="color:#15803d">-${formatPKR(fee.discount)}</td>
                      <td></td>
                    </tr>
                  ` : ''}
                  <tr class="net-row">
                    <td>Net Amount</td>
                    <td class="text-right">${formatPKR(fee.netAmount)}</td>
                    <td></td>
                  </tr>
                  <tr class="paid-row">
                    <td>Paid Amount</td>
                    <td class="text-right">${formatPKR(fee.paidAmount)}</td>
                    <td></td>
                  </tr>
                  <tr class="due-row">
                    <td>Due Amount</td>
                    <td class="text-right">${formatPKR(fee.dueAmount)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              ${fee.paymentHistory && fee.paymentHistory.length > 0 ? `
                <div class="section-title">Payment History</div>
                <table>
                  <thead>
                    <tr>
                      <th>Receipt No</th>
                      <th class="text-right">Amount (Rs.)</th>
                      <th class="text-right">Date</th>
                      <th class="text-right">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${fee.paymentHistory.map(ph => `
                      <tr>
                        <td style="font-family:monospace;font-size:11px">${ph.receiptNumber || '-'}</td>
                        <td class="text-right" style="color:#15803d;font-weight:bold">${formatPKR(ph.amount)}</td>
                        <td class="text-right">${ph.date ? format(new Date(ph.date), 'dd/MM/yyyy hh:mm a') : '-'}</td>
                        <td class="text-right">${ph.paymentMode || 'Cash'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}
            </div>
          `).join('');
        }).join('')}

        <div class="family-total">
          <span>Family Total Due (${month} ${academicYear})</span>
          <span>${formatPKR(summary.totalDue)}</span>
        </div>

        <div class="footer">
          Oxford Grammar School &nbsp;|&nbsp; This is a computer-generated invoice
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <FaUserFriends className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{group.fatherName}</h3>
            <p className="text-xs text-gray-500">{group.fatherPhone} · {group.siblingCount} siblings</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini stats */}
          <div className="hidden sm:flex gap-4 text-right">
            <div>
              <p className="text-xs text-gray-500">Total Fee</p>
              <p className="text-sm font-bold text-gray-800">{formatPKR(summary.totalNet)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Paid</p>
              <p className="text-sm font-bold text-green-600">{formatPKR(summary.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Due</p>
              <p className="text-sm font-bold text-red-600">{formatPKR(summary.totalDue)}</p>
            </div>
          </div>

          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge(summary.status)}`}>
            {summary.status}
          </span>

          {expanded ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Mobile summary row */}
          <div className="sm:hidden flex justify-around p-3 bg-gray-50 text-center text-sm">
            <div><p className="text-xs text-gray-500">Fee</p><p className="font-bold">{formatPKR(summary.totalNet)}</p></div>
            <div><p className="text-xs text-gray-500">Paid</p><p className="font-bold text-green-600">{formatPKR(summary.totalPaid)}</p></div>
            <div><p className="text-xs text-gray-500">Due</p><p className="font-bold text-red-600">{formatPKR(summary.totalDue)}</p></div>
          </div>

          {/* Students */}
          <div className="p-4 space-y-3">
            {students.map(student => {
          const studentFees = fees?.[student._id?.toString()] || [];
              const totalNet = studentFees.reduce((s, f) => s + (f.netAmount || 0), 0);
              const totalPaid = studentFees.reduce((s, f) => s + (f.paidAmount || 0), 0);
              const totalDue = studentFees.reduce((s, f) => s + (f.dueAmount || 0), 0);
              const discount = student.feeStructure?.discountPercentage || 0;

              return (
                <div key={student._id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {/* Student header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                        {student.firstName?.[0]}{student.lastName?.[0] || ''}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{student.firstName} {student.lastName || ''}</p>
                        <p className="text-xs text-gray-500">Class {student.currentClass}-{student.section} · {student.admissionNo}</p>
                      </div>
                    </div>
                    {discount > 0 && (
                      <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                        {student.feeStructure?.discountType} {discount}% off
                      </span>
                    )}
                  </div>

                  {/* Fee detail — matches fees page layout */}
                  {studentFees.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No fee record for {month} {academicYear}</p>
                  ) : studentFees.map(fee => (
                    <div key={fee._id} className="mt-2">

                      {/* Fee Breakdown Table */}
                      <p className="text-xs font-semibold text-gray-700 mb-1">Fee Breakdown</p>
                      <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden mb-2">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-gray-700">Description</th>
                            <th className="text-right px-3 py-2 font-semibold text-gray-700">Amount (Rs.)</th>
                            <th className="text-right px-3 py-2 font-semibold text-gray-700">Date Added</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(fee.feeItems || []).map((item, idx) => (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-gray-700">{item.itemName}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{formatPKR(item.amount)}</td>
                              <td className="px-3 py-2 text-right text-gray-500">
                                {item.addedAt ? format(new Date(item.addedAt), 'dd/MM/yyyy') : '-'}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                            <td className="px-3 py-2 text-gray-800">Total</td>
                            <td className="px-3 py-2 text-right text-gray-800">{formatPKR(fee.totalAmount)}</td>
                            <td></td>
                          </tr>
                          {fee.discount > 0 && (
                            <tr className="border-t border-gray-100">
                              <td className="px-3 py-2 text-green-700 font-medium">Discount</td>
                              <td className="px-3 py-2 text-right text-green-700 font-medium">-{formatPKR(fee.discount)}</td>
                              <td></td>
                            </tr>
                          )}
                          <tr className="border-t border-blue-200 bg-blue-50">
                            <td className="px-3 py-2 text-blue-700 font-bold">Net Amount</td>
                            <td className="px-3 py-2 text-right text-blue-700 font-bold">{formatPKR(fee.netAmount)}</td>
                            <td></td>
                          </tr>
                          <tr className="border-t border-gray-100">
                            <td className="px-3 py-2 text-green-700">Paid Amount</td>
                            <td className="px-3 py-2 text-right text-green-600 font-medium">{formatPKR(fee.paidAmount)}</td>
                            <td></td>
                          </tr>
                          <tr className="border-t border-red-200 bg-red-50">
                            <td className="px-3 py-2 text-red-700 font-bold">Due Amount</td>
                            <td className="px-3 py-2 text-right text-red-700 font-bold">{formatPKR(fee.dueAmount)}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Payment History Table */}
                      {fee.paymentHistory && fee.paymentHistory.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                            <FaReceipt size={10} /> Payment History
                          </p>
                          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700">Receipt No</th>
                                <th className="text-right px-3 py-2 font-semibold text-gray-700">Amount (Rs.)</th>
                                <th className="text-right px-3 py-2 font-semibold text-gray-700">Date</th>
                                <th className="text-right px-3 py-2 font-semibold text-gray-700">Mode</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fee.paymentHistory.map((ph, idx) => (
                                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-600 font-mono text-xs">{ph.receiptNumber || '-'}</td>
                                  <td className="px-3 py-2 text-right text-green-700 font-semibold">{formatPKR(ph.amount)}</td>
                                  <td className="px-3 py-2 text-right text-gray-500">
                                    {ph.date ? format(new Date(ph.date), 'dd/MM/yyyy hh:mm a') : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-600">{ph.paymentMode || 'Cash'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>
                  ))}

                </div>
              );
            })}
          </div>

          {/* Family Total + Buttons */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-800">Family Total Due: <span className="text-red-600">{formatPKR(summary.totalDue)}</span></p>
              <p className="text-xs text-gray-500">Across all {group.siblingCount} siblings for {month} {academicYear}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={printFamilyInvoice}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition flex items-center gap-2 shadow-sm">
                <FaPrint size={13} /> Print Invoice
              </button>
              {summary.totalDue > 0 && (
                <button onClick={() => onPay(group)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2 shadow-sm">
                  <FaMoneyBillWave size={14} /> Pay Family
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────
const SiblingsPage = () => {
  const { api } = useAuth();
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({ totalGroups: 0, totalSiblings: 0, totalDue: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(ACADEMIC_YEARS[1]);
  const [payingGroup, setPayingGroup] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api().get('/siblings', {
        params: { month: selectedMonth, academicYear: selectedYear }
      });
      if (res.data.success) {
        setGroups(res.data.data);
        setStats(res.data.stats);
      }
    } catch (err) {
      toast.error('Failed to load sibling groups');
    } finally {
      setLoading(false);
    }
  }, [api, selectedMonth, selectedYear]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const filtered = groups.filter(g =>
    g.fatherName.toLowerCase().includes(search.toLowerCase()) ||
    g.fatherPhone.includes(search)
  );

  const handlePaySuccess = (result) => {
    setReceiptData(result);
    setPayingGroup(null);
    fetchGroups();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sibling Groups</h1>
          <p className="text-gray-600 mt-1">Manage combined family fees and payments</p>
        </div>
        {/* Month / Year selectors */}
        <div className="flex gap-3">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
            {ACADEMIC_YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Sibling Groups</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalGroups}</p>
          <p className="text-xs text-gray-400 mt-1">Families with 2+ children</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Total Siblings</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalSiblings}</p>
          <p className="text-xs text-gray-400 mt-1">Students in sibling groups</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="text-2xl font-bold text-green-700">{formatPKR(stats.totalPaid)}</p>
          <p className="text-xs text-gray-400 mt-1">{selectedMonth} {selectedYear}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500">
          <p className="text-sm text-gray-500">Total Due</p>
          <p className="text-2xl font-bold text-red-600">{formatPKR(stats.totalDue)}</p>
          <p className="text-xs text-gray-400 mt-1">{selectedMonth} {selectedYear}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by father name or phone..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
        />
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="text-center py-16">
          <FaSpinner className="animate-spin text-3xl text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading sibling groups...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <FaUsers className="text-5xl text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600">No sibling groups found</h3>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'No matches for your search' : 'Students are grouped by matching father name and phone number'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> family group{filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </p>
          {filtered.map(group => (
            <SiblingGroupCard
              key={group.groupKey}
              group={group}
              month={selectedMonth}
              academicYear={selectedYear}
              onPay={setPayingGroup}
              api={api}
            />
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {payingGroup && (
        <PaymentModal
          group={payingGroup}
          month={selectedMonth}
          academicYear={selectedYear}
          onClose={() => setPayingGroup(null)}
          onSuccess={handlePaySuccess}
          api={api}
        />
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          result={receiptData}
          group={groups.find(g => g.fatherName === receiptData.distributions[0]?.fatherName) || {}}
          month={selectedMonth}
          academicYear={selectedYear}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
};

export default SiblingsPage;
