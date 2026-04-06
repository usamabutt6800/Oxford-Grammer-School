// client/src/pages/admin/Inventory.jsx

import React, { useState, useEffect } from 'react';
import { 
  FaBox, FaPlus, FaEdit, FaTrash, FaSearch, 
  FaPrint, FaEye, FaSpinner, FaTimes, FaSave,
  FaExclamationTriangle, FaCheckCircle, FaChartLine,
  FaWarehouse, FaTags, FaArrowUp, FaArrowDown,
  FaHistory, FaClipboardList
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const AdminInventory = () => {
  const { api } = useAuth();
  const axiosInstance = api();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState({
    summary: { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
    categoryBreakdown: {}
  });
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  
  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Other',
    quantity: '',
    minQuantity: 10,
    maxQuantity: 1000,
    unit: 'piece',
    location: 'Store Room',
    rackNo: '',
    shelfNo: '',
    purchasePrice: '',
    sellingPrice: '',
    supplier: '',
    supplierContact: '',
    description: ''
  });
  
  const [transactionForm, setTransactionForm] = useState({
    transactionType: 'IN',
    quantity: '',
    reason: '',
    issuedTo: '',
    remarks: ''
  });

  useEffect(() => {
    fetchItems();
    fetchStats();
    fetchCategories();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, selectedLocation, showLowStockOnly]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (selectedLocation) params.location = selectedLocation;
      if (showLowStockOnly) params.lowStock = 'true';
      if (searchTerm) params.search = searchTerm;
      
      const response = await axiosInstance.get('/inventory/items', { params });
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/inventory/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get('/inventory/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axiosInstance.get('/inventory/locations');
      if (response.data.success) {
        setLocations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchTransactionHistory = async (itemId) => {
    try {
      const response = await axiosInstance.get(`/inventory/transactions/item/${itemId}`);
      if (response.data.success) {
        setTransactions(response.data.data.transactions);
        setShowHistoryModal(true);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transaction history');
    }
  };

  const handleCreateItem = async () => {
    if (!itemForm.name || !itemForm.quantity) {
      toast.error('Please fill required fields');
      return;
    }
    
    try {
      const response = await axiosInstance.post('/inventory/items', itemForm);
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
      const response = await axiosInstance.put(`/inventory/items/${editingItem._id}`, itemForm);
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
        const response = await axiosInstance.delete(`/inventory/items/${id}`);
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

  const handleStockUpdate = async () => {
    if (!transactionForm.quantity || !transactionForm.reason) {
      toast.error('Please fill quantity and reason');
      return;
    }
    
    try {
      const response = await axiosInstance.post('/inventory/stock/update', {
        itemId: selectedItem._id,
        transactionType: transactionForm.transactionType,
        quantity: parseInt(transactionForm.quantity),
        reason: transactionForm.reason,
        issuedTo: transactionForm.issuedTo,
        remarks: transactionForm.remarks
      });
      
      if (response.data.success) {
        toast.success('Stock updated successfully');
        setShowTransactionModal(false);
        setTransactionForm({ transactionType: 'IN', quantity: '', reason: '', issuedTo: '', remarks: '' });
        fetchItems();
        fetchStats();
        if (selectedItem) {
          fetchTransactionHistory(selectedItem._id);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update stock');
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      category: 'Other',
      quantity: '',
      minQuantity: 10,
      maxQuantity: 1000,
      unit: 'piece',
      location: 'Store Room',
      rackNo: '',
      shelfNo: '',
      purchasePrice: '',
      sellingPrice: '',
      supplier: '',
      supplierContact: '',
      description: ''
    });
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      maxQuantity: item.maxQuantity,
      unit: item.unit,
      location: item.location,
      rackNo: item.rackNo || '',
      shelfNo: item.shelfNo || '',
      purchasePrice: item.purchasePrice || '',
      sellingPrice: item.sellingPrice || '',
      supplier: item.supplier || '',
      supplierContact: item.supplierContact || '',
      description: item.description || ''
    });
    setShowItemModal(true);
  };

  const openStockModal = (item) => {
    setSelectedItem(item);
    setTransactionForm({ transactionType: 'IN', quantity: '', reason: '', issuedTo: '', remarks: '' });
    setShowTransactionModal(true);
  };

  const getStockStatus = (quantity, minQuantity) => {
    if (quantity <= 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: <FaExclamationTriangle className="mr-1" /> };
    if (quantity <= minQuantity) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: <FaExclamationTriangle className="mr-1" /> };
    return { text: 'In Stock', color: 'bg-green-100 text-green-800', icon: <FaCheckCircle className="mr-1" /> };
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage school inventory</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.summary?.totalItems || 0}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{Object.keys(stats.categoryBreakdown || {}).length}</div>
          <div className="text-sm text-gray-600">Categories</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.summary?.lowStock || 0}</div>
          <div className="text-sm text-gray-600">Low Stock Items</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.summary?.outOfStock || 0}</div>
          <div className="text-sm text-gray-600">Out of Stock</div>
        </div>
      </div>

      {/* Value Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">Total Inventory Value</p>
            <p className="text-3xl font-bold">Rs. {stats.summary?.totalValue?.toLocaleString() || 0}</p>
          </div>
          <FaChartLine className="text-4xl opacity-50" />
        </div>
      </div>

      {/* Search and Filters */}
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
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg w-48"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Low Stock Only</span>
          </label>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              setSelectedLocation('');
              setShowLowStockOnly(false);
            }}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Clear Filters
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
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Location</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const stockStatus = getStockStatus(item.quantity, item.minQuantity);
                return (
                  <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500">Min: {item.minQuantity} {item.unit}s</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-800'}`}>
                        {item.quantity} {item.unit}s
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.location}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${stockStatus.color}`}>
                        {stockStatus.icon}
                        {stockStatus.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => fetchTransactionHistory(item._id)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                          title="View History"
                        >
                          <FaHistory />
                        </button>
                        <button
                          onClick={() => openStockModal(item)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Update Stock"
                        >
                          <FaArrowUp className="inline" />/<FaArrowDown className="inline" />
                        </button>
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
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="Stationery">Stationery</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Lab Equipment">Lab Equipment</option>
                    <option value="Sports">Sports</option>
                    <option value="Uniform">Uniform</option>
                    <option value="Books">Books</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({...itemForm, quantity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                  >
                    <option value="piece">Piece</option>
                    <option value="set">Set</option>
                    <option value="box">Box</option>
                    <option value="packet">Packet</option>
                    <option value="kg">KG</option>
                    <option value="liter">Liter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.minQuantity}
                    onChange={(e) => setItemForm({...itemForm, minQuantity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.maxQuantity}
                    onChange={(e) => setItemForm({...itemForm, maxQuantity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.location}
                    onChange={(e) => setItemForm({...itemForm, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rack No.</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.rackNo}
                    onChange={(e) => setItemForm({...itemForm, rackNo: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (Rs.)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.purchasePrice}
                    onChange={(e) => setItemForm({...itemForm, purchasePrice: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.sellingPrice}
                    onChange={(e) => setItemForm({...itemForm, sellingPrice: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.supplier}
                    onChange={(e) => setItemForm({...itemForm, supplier: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Contact</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={itemForm.supplierContact}
                    onChange={(e) => setItemForm({...itemForm, supplierContact: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                />
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

      {/* Stock Update Modal */}
      {showTransactionModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Update Stock - {selectedItem.name}</h2>
                <button onClick={() => setShowTransactionModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Current Stock: <span className="font-bold">{selectedItem.quantity} {selectedItem.unit}s</span></p>
                <p className="text-sm text-gray-600">Min Stock Level: {selectedItem.minQuantity} {selectedItem.unit}s</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={transactionForm.transactionType}
                    onChange={(e) => setTransactionForm({...transactionForm, transactionType: e.target.value})}
                  >
                    <option value="IN">IN - Add Stock</option>
                    <option value="OUT">OUT - Remove Stock</option>
                    <option value="ADJUSTMENT">ADJUSTMENT - Set Quantity</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {transactionForm.transactionType === 'ADJUSTMENT' ? 'New Quantity' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={transactionForm.quantity}
                    onChange={(e) => setTransactionForm({...transactionForm, quantity: e.target.value})}
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., New purchase, Issued to student, Damaged"
                    value={transactionForm.reason}
                    onChange={(e) => setTransactionForm({...transactionForm, reason: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issued To (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Person/Department name"
                    value={transactionForm.issuedTo}
                    onChange={(e) => setTransactionForm({...transactionForm, issuedTo: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={transactionForm.remarks}
                    onChange={(e) => setTransactionForm({...transactionForm, remarks: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setShowTransactionModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                  Cancel
                </button>
                <button
                  onClick={handleStockUpdate}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Update Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>
              
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No transactions found</div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.transactionType === 'IN' ? 'bg-green-100 text-green-800' :
                            transaction.transactionType === 'OUT' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.transactionType === 'IN' ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                            {transaction.transactionType}
                          </span>
                          <p className="mt-2 font-medium">{transaction.reason}</p>
                          <p className="text-sm text-gray-600">Quantity: {transaction.quantity}</p>
                          {transaction.issuedTo && (
                            <p className="text-sm text-gray-600">Issued To: {transaction.issuedTo}</p>
                          )}
                          {transaction.remarks && (
                            <p className="text-sm text-gray-500 mt-1">{transaction.remarks}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {format(new Date(transaction.transactionDate), 'dd MMM yyyy hh:mm a')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            By: {transaction.performedBy?.name || 'System'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Stock: {transaction.previousQuantity} → {transaction.newQuantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;