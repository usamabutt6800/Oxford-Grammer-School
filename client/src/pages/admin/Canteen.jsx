// client/src/pages/admin/Canteen.jsx

import React, { useState, useEffect } from 'react';
import { 
  FaUtensils, FaPlus, FaEdit, FaTrash, FaSearch, 
  FaPrint, FaShoppingCart, FaEye, FaSpinner, 
  FaTimes, FaSave, FaChartLine, FaBoxes, FaRupeeSign,
  FaExclamationTriangle, FaCheckCircle, FaCalendarAlt,
  FaFileInvoice, FaChartBar, FaDownload, FaSync
} from 'react-icons/fa';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const AdminCanteen = () => {
  const { api } = useAuth();
  const axiosInstance = api();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    today: { sales: 0, itemsSold: 0, transactions: 0, profit: 0 },
    month: { sales: 0, transactions: 0, profit: 0 },
    inventory: { totalItems: 0, lowStock: 0, outOfStock: 0 }
  });
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Report states
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Snacks',
    price: '',
    costPrice: '',
    stock: '',
    minStockLevel: 10,
    unit: 'piece',
    description: ''
  });
  
  const [saleForm, setSaleForm] = useState({
    itemId: '',
    quantity: 1,
    studentId: '',
    paymentMode: 'Cash',
    remarks: ''
  });
  
  const [saleItems, setSaleItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  // Fetch data
  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;
      
      const response = await axiosInstance.get('/canteen/items', { params });
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/canteen/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get('/canteen/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoadingReport(true);
      let startDate, endDate;
      
      if (reportType === 'monthly') {
        const [year, month] = selectedMonth.split('-');
        startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
        endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');
      } else {
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      }
      
      const response = await axiosInstance.get('/canteen/sales/report', {
        params: { startDate, endDate }
      });
      
      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchStats();
    fetchCategories();
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    if (showReportModal) {
      fetchReport();
    }
  }, [reportType, selectedMonth, selectedYear, showReportModal]);

  const handleCreateItem = async () => {
    if (!itemForm.name || !itemForm.price) {
      toast.error('Please fill required fields');
      return;
    }
    
    try {
      const response = await axiosInstance.post('/canteen/items', {
        ...itemForm,
        price: parseFloat(itemForm.price),
        costPrice: parseFloat(itemForm.costPrice) || 0,
        stock: parseInt(itemForm.stock) || 0,
        minStockLevel: parseInt(itemForm.minStockLevel) || 10
      });
      if (response.data.success) {
        toast.success('Item created successfully');
        setShowItemModal(false);
        resetItemForm();
        fetchItems();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create item');
    }
  };

  const handleUpdateItem = async () => {
    try {
      const response = await axiosInstance.put(`/canteen/items/${editingItem._id}`, {
        ...itemForm,
        price: parseFloat(itemForm.price),
        costPrice: parseFloat(itemForm.costPrice) || 0,
        minStockLevel: parseInt(itemForm.minStockLevel) || 10
      });
      if (response.data.success) {
        toast.success('Item updated successfully');
        setShowItemModal(false);
        setEditingItem(null);
        resetItemForm();
        fetchItems();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        const response = await axiosInstance.delete(`/canteen/items/${id}`);
        if (response.data.success) {
          toast.success('Item deleted successfully');
          fetchItems();
          fetchStats();
        }
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete item');
      }
    }
  };

  const handleUpdateStock = async (id, currentStock, type) => {
    let quantity;
    if (type === 'add') {
      const amount = prompt('Enter quantity to add:', 1);
      if (!amount) return;
      quantity = parseInt(amount);
    } else {
      const amount = prompt('Enter quantity to remove:', 1);
      if (!amount) return;
      quantity = parseInt(amount);
    }
    
    try {
      const response = await axiosInstance.patch(`/canteen/items/${id}/stock`, {
        quantity: quantity,
        type: type === 'add' ? 'add' : 'remove'
      });
      if (response.data.success) {
        toast.success(`Stock updated successfully`);
        fetchItems();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update stock');
    }
  };

  const addToCart = () => {
    if (!saleForm.itemId || !saleForm.quantity) {
      toast.error('Please select item and quantity');
      return;
    }
    
    const item = items.find(i => i._id === saleForm.itemId);
    if (!item) return;
    
    if (item.stock < saleForm.quantity) {
      toast.error(`Only ${item.stock} items available in stock`);
      return;
    }
    
    const existingItem = saleItems.find(i => i.itemId === saleForm.itemId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + saleForm.quantity;
      if (item.stock < newQuantity) {
        toast.error(`Only ${item.stock} items available in stock`);
        return;
      }
      setSaleItems(saleItems.map(i => 
        i.itemId === saleForm.itemId 
          ? { ...i, quantity: newQuantity, total: item.price * newQuantity }
          : i
      ));
    } else {
      setSaleItems([...saleItems, {
        itemId: item._id,
        itemName: item.name,
        price: item.price,
        costPrice: item.costPrice || 0,
        quantity: saleForm.quantity,
        total: item.price * saleForm.quantity
      }]);
    }
    
    setSaleForm({ ...saleForm, itemId: '', quantity: 1 });
  };

  const removeFromCart = (itemId) => {
    setSaleItems(saleItems.filter(i => i.itemId !== itemId));
  };

  useEffect(() => {
    const total = saleItems.reduce((sum, item) => sum + item.total, 0);
    setCartTotal(total);
  }, [saleItems]);

  const processSale = async () => {
    if (saleItems.length === 0) {
      toast.error('No items in cart');
      return;
    }
    
    try {
      for (const item of saleItems) {
        await axiosInstance.post('/canteen/sales', {
          itemId: item.itemId,
          quantity: item.quantity,
          studentId: saleForm.studentId || null,
          paymentMode: saleForm.paymentMode,
          remarks: saleForm.remarks
        });
      }
      
      const profit = saleItems.reduce((sum, item) => sum + ((item.price - (item.costPrice || 0)) * item.quantity), 0);
      
      toast.success(`Sale completed! Total: Rs. ${cartTotal.toLocaleString()} | Profit: Rs. ${profit.toLocaleString()}`);
      setSaleItems([]);
      setSaleForm({ itemId: '', quantity: 1, studentId: '', paymentMode: 'Cash', remarks: '' });
      setShowSaleModal(false);
      fetchItems();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process sale');
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      category: 'Snacks',
      price: '',
      costPrice: '',
      stock: '',
      minStockLevel: 10,
      unit: 'piece',
      description: ''
    });
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      price: item.price,
      costPrice: item.costPrice || '',
      stock: item.stock,
      minStockLevel: item.minStockLevel,
      unit: item.unit,
      description: item.description || ''
    });
    setShowItemModal(true);
  };

  const printReport = () => {
    if (!reportData) return;
    
    const printWindow = window.open('', '_blank');
    const period = reportType === 'monthly' 
      ? format(new Date(selectedMonth), 'MMMM yyyy')
      : `Year ${selectedYear}`;
    
    const totalRevenue = reportData.summary?.totalAmount || 0;
    const totalCost = reportData.summary?.totalCost || 0;
    const totalProfit = reportData.summary?.totalProfit || 0;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Canteen Report - ${period}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .report-container { max-width: 1000px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1e40af; margin: 0; }
          .header h2 { color: #dc2626; margin: 5px 0; }
          .summary { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-card { text-align: center; }
          .summary-card .value { font-size: 24px; font-weight: bold; }
          .summary-card .label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          .text-right { text-align: right; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>OXFORD GRAMMAR SCHOOL</h1>
            <h2>CANTEEN SALES REPORT</h2>
            <p>Period: ${period}</p>
          </div>
          
          <div class="summary">
            <div class="summary-grid">
              <div class="summary-card">
                <div class="value">Rs. ${totalRevenue.toLocaleString()}</div>
                <div class="label">Total Revenue</div>
              </div>
              <div class="summary-card">
                <div class="value">Rs. ${totalCost.toLocaleString()}</div>
                <div class="label">Total Cost</div>
              </div>
              <div class="summary-card">
                <div class="value" style="color: #10b981;">Rs. ${totalProfit.toLocaleString()}</div>
                <div class="label">Total Profit</div>
              </div>
              <div class="summary-card">
                <div class="value">${reportData.summary?.totalTransactions || 0}</div>
                <div class="label">Total Transactions</div>
              </div>
            </div>
          </div>
          
          <h3>Daily Breakdown</h3>
          <table>
            <thead>
              <tr><th>Date</th><th class="text-right">Revenue</th><th class="text-right">Cost</th><th class="text-right">Profit</th><th class="text-right">Items</th><th class="text-right">Transactions</th></tr>
            </thead>
            <tbody>
              ${Object.entries(reportData.dailyData || {}).map(([date, data]) => `
                <tr>
                  <td>${date}</td>
                  <td class="text-right">Rs. ${data.amount.toLocaleString()}</td>
                  <td class="text-right">Rs. ${data.cost.toLocaleString()}</td>
                  <td class="text-right">Rs. ${data.profit.toLocaleString()}</td>
                  <td class="text-right">${data.items}</td>
                  <td class="text-right">${data.transactions}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>This is a computer-generated report</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStockBadge = (stock, minStock) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock <= minStock) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const cartProfit = saleItems.reduce((sum, item) => sum + ((item.price - (item.costPrice || 0)) * item.quantity), 0);

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Canteen Management</h1>
          <p className="text-gray-600">Manage canteen items, stock, and sales</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button 
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={() => setShowReportModal(true)}
          >
            <FaChartBar className="mr-2" />
            Reports
          </button>
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={() => {
              setSaleItems([]);
              setSaleForm({ itemId: '', quantity: 1, studentId: '', paymentMode: 'Cash', remarks: '' });
              setShowSaleModal(true);
            }}
          >
            <FaShoppingCart className="mr-2" />
            New Sale
          </button>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={() => {
              setEditingItem(null);
              resetItemForm();
              setShowItemModal(true);
            }}
          >
            <FaPlus className="mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">Rs. {stats.today?.sales?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-600">Today's Sales</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.today?.itemsSold || 0}</div>
          <div className="text-sm text-gray-600">Items Sold Today</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">Rs. {stats.month?.sales?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-600">Month's Sales</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.inventory?.totalItems || 0}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.inventory?.lowStock || 0}</div>
          <div className="text-sm text-gray-600">Low Stock Items</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg w-48"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              fetchItems();
            }}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center"
          >
            <FaSync className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Price (PKR)</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Stock</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const stockBadge = getStockBadge(item.stock, item.minStockLevel);
                return (
                  <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800">Rs. {item.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className={`font-medium ${item.stock <= item.minStockLevel ? 'text-red-600' : 'text-gray-800'}`}>
                          {item.stock} {item.unit}s
                        </span>
                        <button
                          onClick={() => handleUpdateStock(item._id, item.stock, 'add')}
                          className="text-green-600 hover:bg-green-50 p-1 rounded"
                          title="Add Stock"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleUpdateStock(item._id, item.stock, 'remove')}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                          title="Remove Stock"
                        >
                          -
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${stockBadge.color}`}>
                        {stockBadge.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id, item.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No items found. Click "Add Item" to add your first item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                  >
                    <option value="Fast Food">Fast Food</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Breakfast">Breakfast</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs.) *</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Rs.)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={itemForm.costPrice}
                      onChange={(e) => setItemForm({...itemForm, costPrice: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={itemForm.stock}
                      onChange={(e) => setItemForm({...itemForm, stock: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={itemForm.minStockLevel}
                      onChange={(e) => setItemForm({...itemForm, minStockLevel: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                  >
                    <option value="piece">Piece</option>
                    <option value="plate">Plate</option>
                    <option value="bottle">Bottle</option>
                    <option value="cup">Cup</option>
                    <option value="packet">Packet</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                  Cancel
                </button>
                <button
                  onClick={editingItem ? handleUpdateItem : handleCreateItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                >
                  <FaSave className="mr-2" />
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">New Sale</h2>
                <button onClick={() => setShowSaleModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={saleForm.itemId}
                    onChange={(e) => setSaleForm({...saleForm, itemId: e.target.value})}
                  >
                    <option value="">Select Item</option>
                    {items.filter(i => i.stock > 0).map(item => (
                      <option key={item._id} value={item._id}>
                        {item.name} - Rs. {item.price} (Stock: {item.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      value={saleForm.quantity}
                      onChange={(e) => setSaleForm({...saleForm, quantity: parseInt(e.target.value) || 1})}
                      min="1"
                    />
                    <button
                      onClick={addToCart}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Cart */}
              {saleItems.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Cart</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {saleItems.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{item.itemName}</td>
                            <td className="px-3 py-2 text-right">Rs. {item.price}</td>
                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-semibold">Rs. {item.total}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => removeFromCart(item.itemId)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr className="font-bold">
                          <td colSpan="3" className="px-3 py-2 text-right">Total:</td>
                          <td className="px-3 py-2 text-right">Rs. {cartTotal.toLocaleString()}</td>
                          <td></td>
                        </tr>
                        <tr className="text-green-600">
                          <td colSpan="3" className="px-3 py-2 text-right">Profit:</td>
                          <td className="px-3 py-2 text-right">Rs. {cartProfit.toLocaleString()}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={saleForm.paymentMode}
                    onChange={(e) => setSaleForm({...saleForm, paymentMode: e.target.value})}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Student Card">Student Card</option>
                    <option value="Parent Account">Parent Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter student ID"
                    value={saleForm.studentId}
                    onChange={(e) => setSaleForm({...saleForm, studentId: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Optional remarks"
                  value={saleForm.remarks}
                  onChange={(e) => setSaleForm({...saleForm, remarks: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setShowSaleModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                  Cancel
                </button>
                <button
                  onClick={processSale}
                  disabled={saleItems.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center disabled:opacity-50"
                >
                  <FaShoppingCart className="mr-2" />
                  Complete Sale - Rs. {cartTotal.toLocaleString()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Sales & Profit Report</h2>
                <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>
              
              {/* Report Filters */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="monthly"
                    checked={reportType === 'monthly'}
                    onChange={() => setReportType('monthly')}
                  />
                  <label htmlFor="monthly">Monthly</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="yearly"
                    checked={reportType === 'yearly'}
                    onChange={() => setReportType('yearly')}
                  />
                  <label htmlFor="yearly">Yearly</label>
                </div>
                
                {reportType === 'monthly' ? (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg w-24"
                  />
                )}
                
                <button
                  onClick={fetchReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Load Report
                </button>
              </div>
              
              {loadingReport ? (
                <div className="flex justify-center py-12">
                  <FaSpinner className="animate-spin text-4xl text-blue-600" />
                </div>
              ) : reportData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        Rs. {reportData.summary?.totalAmount?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Revenue</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        Rs. {reportData.summary?.totalCost?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Cost</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        Rs. {reportData.summary?.totalProfit?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Profit</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {reportData.summary?.totalTransactions || 0}
                      </div>
                      <div className="text-sm text-gray-600">Transactions</div>
                    </div>
                  </div>
                  
                  {/* Daily Breakdown Table */}
                  <h3 className="font-semibold text-gray-800 mb-3">Daily Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Revenue</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Cost</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Profit</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Items Sold</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(reportData.dailyData || {}).map(([date, data]) => (
                          <tr key={date} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2">{date}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">Rs. {data.amount?.toLocaleString() || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">Rs. {data.cost?.toLocaleString() || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right text-green-600">
                              Rs. {data.profit?.toLocaleString() || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{data.items || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{data.transactions || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">Total</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">Rs. {reportData.summary?.totalAmount?.toLocaleString() || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">Rs. {reportData.summary?.totalCost?.toLocaleString() || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right text-green-600">
                            Rs. {reportData.summary?.totalProfit?.toLocaleString() || 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{reportData.summary?.totalItems || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{reportData.summary?.totalTransactions || 0}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Close
                    </button>
                    <button
                      onClick={printReport}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    >
                      <FaPrint className="mr-2" />
                      Print Report
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a period and click "Load Report"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCanteen;