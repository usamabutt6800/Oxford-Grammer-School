import React from 'react';
import { format } from 'date-fns';
import { FaPrint, FaDownload } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Invoice = ({ fee, onClose }) => {
  const formatCurrency = (amount) => `Rs. ${amount?.toLocaleString('en-PK') || 0}`;
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleDownload = () => {
    toast.success('Download feature coming soon!');
  };
  
  // Group payments by month
  const paymentsByMonth = fee.paymentHistory?.reduce((acc, payment) => {
    const month = payment.paymentFor?.month || format(new Date(payment.date), 'MMMM yyyy');
    if (!acc[month]) acc[month] = [];
    acc[month].push(payment);
    return acc;
  }, {}) || {};
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:static print:bg-white print:p-0">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none">
        {/* Invoice Header */}
        <div className="p-6 border-b border-gray-200 print:border-b-2">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">OXFORD GRAMMAR SCHOOL</h1>
              <p className="text-gray-600">123 Education Street, City, Pakistan</p>
              <p className="text-gray-600">Phone: +92 123 4567890 | Email: info@oxford.edu.pk</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">TAX INVOICE</div>
              <p className="text-sm text-gray-600">Invoice #: {fee._id?.slice(-8).toUpperCase()}</p>
              <p className="text-sm text-gray-600">Date: {format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>
          
          {/* Student Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Student Name:</p>
                <p className="font-semibold text-gray-800">
                  {fee.student?.firstName} {fee.student?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Admission No:</p>
                <p className="font-semibold text-gray-800">{fee.student?.admissionNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Class & Section:</p>
                <p className="font-semibold text-gray-800">
                  {fee.student?.currentClass}-{fee.student?.section}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Father's Name:</p>
                <p className="font-semibold text-gray-800">{fee.student?.fatherName}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fee Breakdown */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Fee Breakdown</h3>
          
          {/* Monthly Fee Table */}
          {fee.monthlyFees?.map((monthlyFee, idx) => (
            <div key={idx} className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">
                {monthlyFee.month} {monthlyFee.year}
              </h4>
              <table className="w-full mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2">Tuition Fee</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(monthlyFee.tuitionFee)}</td>
                  </tr>
                  {monthlyFee.discount > 0 && (
                    <tr className="text-green-600">
                      <td className="px-4 py-2">Discount ({monthlyFee.discount}%)</td>
                      <td className="px-4 py-2 text-right">-{formatCurrency(monthlyFee.discount)}</td>
                    </tr>
                  )}
                  {monthlyFee.additionalCharges?.map((charge, cIdx) => (
                    <tr key={cIdx}>
                      <td className="px-4 py-2">
                        {charge.itemName}
                        <div className="text-xs text-gray-500">
                          Added: {format(new Date(charge.date), 'dd/MM/yyyy hh:mm a')}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">{formatCurrency(charge.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200">
                    <td className="px-4 py-2 font-semibold">Net Amount</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatCurrency(monthlyFee.netAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              {/* Payment History for this month */}
              {monthlyFee.payments?.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-sm font-semibold text-gray-600 mb-2">Payment History</h5>
                  {monthlyFee.payments.map((payment, pIdx) => (
                    <div key={pIdx} className="flex justify-between text-sm border-l-2 border-green-500 pl-3 mb-1">
                      <span>
                        Paid: {formatCurrency(payment.amount)} via {payment.paymentMode}
                      </span>
                      <span className="text-gray-500">
                        {format(new Date(payment.date), 'dd/MM/yyyy hh:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                <span className="font-bold">Balance Due</span>
                <span className={`font-bold ${monthlyFee.paidAmount >= monthlyFee.netAmount ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(monthlyFee.netAmount - monthlyFee.paidAmount)}
                </span>
              </div>
            </div>
          ))}
          
          {/* Summary */}
          <div className="mt-6 pt-4 border-t-2 border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL AMOUNT</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(fee.netAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-lg font-bold">TOTAL PAID</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(fee.paidAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-lg font-bold">TOTAL DUE</span>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(fee.dueAmount)}
              </span>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>This is a computer generated invoice. No signature required.</p>
            <p>Thank you for your payment!</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 print:hidden">
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={handlePrint} className="btn-secondary flex items-center">
            <FaPrint className="mr-2" /> Print
          </button>
          <button onClick={handleDownload} className="btn-primary flex items-center">
            <FaDownload className="mr-2" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;