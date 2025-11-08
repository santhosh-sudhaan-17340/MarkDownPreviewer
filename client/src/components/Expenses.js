import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Camera, Trash2, Edit, Search } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { format } from 'date-fns';
import './Expenses.css';

function Expenses({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [formData, setFormData] = useState({
    amount: '',
    currency: user?.defaultCurrency || 'USD',
    description: '',
    merchant: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    paymentMethod: '',
    tags: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchCurrencies();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get('/expenses?limit=50');
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get('/currencies');
      setCurrencies(response.data);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post('/expenses', formData);
      fetchExpenses();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await axios.delete(`/expenses/${id}`);
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
      }
    }
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setShowOCR(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const text = result.data.text;
      console.log('OCR Result:', text);

      // Extract amount (simple regex - can be improved)
      const amountMatch = text.match(/\$?\d+\.?\d{0,2}/);
      const amount = amountMatch ? amountMatch[0].replace('$', '') : '';

      // Extract date
      const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);

      setFormData({
        ...formData,
        amount: amount,
        description: text.substring(0, 100).trim(),
        date: dateMatch ? parseOCRDate(dateMatch[0]) : formData.date
      });

      setShowOCR(false);
      setShowModal(true);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to process receipt. Please enter details manually.');
      setShowOCR(false);
    }
  };

  const parseOCRDate = (dateStr) => {
    try {
      const parts = dateStr.split(/[\/\-]/);
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${year}-${month}-${day}`;
    } catch {
      return format(new Date(), 'yyyy-MM-dd');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      currency: user?.defaultCurrency || 'USD',
      description: '',
      merchant: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      categoryId: '',
      paymentMethod: '',
      tags: []
    });
  };

  const filteredExpenses = expenses.filter(exp =>
    exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="expenses">
      <div className="page-header">
        <h1 className="page-title">Expenses</h1>
        <div className="page-actions">
          <label className="btn btn-secondary scan-btn">
            <Camera size={20} />
            Scan Receipt
            <input type="file" accept="image/*" onChange={handleOCR} style={{ display: 'none' }} />
          </label>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={20} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="card">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="expenses-list">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map(expense => (
              <div key={expense.id} className="expense-item">
                <div className="expense-icon">
                  {expense.category_icon || '💰'}
                </div>
                <div className="expense-details">
                  <div className="expense-title">
                    {expense.description || expense.merchant || 'Expense'}
                  </div>
                  <div className="expense-meta">
                    {expense.category_name} • {format(new Date(expense.date), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="expense-amount">
                  {expense.currency} {expense.amount.toFixed(2)}
                </div>
                <button onClick={() => handleDelete(expense.id)} className="delete-btn">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          ) : (
            <p className="no-data">No expenses found. Add your first expense!</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Expense</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="input-field"
                    step="0.01"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="select-field"
                  >
                    {currencies.map(curr => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Merchant</label>
                <input
                  type="text"
                  name="merchant"
                  value={formData.merchant}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="select-field"
                  >
                    <option value="">Auto-detect</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Payment Method</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="select-field"
                >
                  <option value="">Select...</option>
                  <option value="cash">Cash</option>
                  <option value="credit">Credit Card</option>
                  <option value="debit">Debit Card</option>
                  <option value="digital">Digital Wallet</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOCR && (
        <div className="modal-overlay">
          <div className="modal ocr-modal">
            <h2 className="modal-title">Processing Receipt...</h2>
            <div className="progress-bar" style={{ height: '20px' }}>
              <div className="progress-fill" style={{ width: `${ocrProgress}%` }}></div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '16px' }}>{ocrProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
