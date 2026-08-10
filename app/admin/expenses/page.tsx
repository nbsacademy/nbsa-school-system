'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ExpensesManagementPage() {
  const [loading, setLoading] = useState(false);
  const [expenseLogs, setExpenseLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Form Inputs
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Bills (Electricity/Internet)');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Custom UI Popup Notification State
  const [popup, setPopup] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchExpenseLogs();
  }, []);

  const fetchExpenseLogs = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('serial_no', { ascending: false });

    if (!error && data) {
      setExpenseLogs(data);
    }
  };

  // Search & Date Filter Logic
  const filteredLogs = expenseLogs.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.serial_no && item.serial_no.toString().includes(searchQuery)) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const itemDate = item.expense_date || (item.created_at ? item.created_at.split('T')[0] : '');
    const matchesDate = filterDate ? itemDate === filterDate : true;

    return matchesSearch && matchesDate;
  });

  // Add Expense Handler
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !amount) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Incomplete Fields',
        message: 'Please enter expense title and valid amount!',
      });
      return;
    }

    setLoading(true);

    const payload = {
      title: title.trim(),
      category: category,
      amount: parseFloat(amount) || 0,
      notes: notes.trim(),
      expense_date: expenseDate,
    };

    const { error } = await supabase.from('expenses').insert([payload]);

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Save Failed',
        message: error.message,
      });
      return;
    }

    setPopup({
      show: true,
      type: 'success',
      title: 'Expense Saved!',
      message: 'Expense record successfully saved to database.',
    });

    // Reset Form
    setTitle('');
    setAmount('');
    setNotes('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    fetchExpenseLogs();
  };

  // Delete Expense Record
  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);

    if (!error) {
      setPopup({
        show: true,
        type: 'success',
        title: 'Deleted',
        message: 'Expense log removed successfully.',
      });
      fetchExpenseLogs();
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5 text-left font-sans text-slate-900">
      
      {/* 🚀 CUSTOM POPUP MODAL */}
      {popup.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border-t-8 text-center space-y-4 ${
            popup.type === 'success' ? 'border-emerald-600' : 'border-red-600'
          }`}>
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl font-black ${
              popup.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
            }`}>
              {popup.type === 'success' ? '✓' : '✕'}
            </div>

            <div className="space-y-1">
              <h3 className={`text-lg font-black ${popup.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                {popup.title}
              </h3>
              <p className="text-xs text-gray-600 font-medium">{popup.message}</p>
            </div>

            <button
              onClick={() => setPopup({ ...popup, show: false })}
              className={`w-full py-3 rounded-2xl text-xs font-black text-white transition shadow-md ${
                popup.type === 'success' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. ADD NEW EXPENSE FORM */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-extrabold text-blue-900">
              Add New Expense
            </h2>
            <p className="text-[11px] text-gray-500">
              Enter bill or item expense details with date
            </p>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
            {/* Title */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Expense Title</label>
              <input
                type="text"
                placeholder="e.g. Utility Bill, Stationery"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Category & Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category</label>
                <select
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Bills (Electricity/Internet)">Bills (Electricity/Internet)</option>
                  <option value="Building Rent">Building Rent</option>
                  <option value="Stationery & Printing">Stationery & Printing</option>
                  <option value="Maintenance & Repair">Maintenance & Repair</option>
                  <option value="Tea & Refreshment">Tea & Refreshment</option>
                  <option value="Other Misc Expense">Other Misc Expense</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Date</label>
                <input
                  type="date"
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>

            {/* Amount & Notes */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-rose-800 focus:border-blue-900"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Note / Description</label>
                <input
                  type="text"
                  placeholder="e.g. August Bill"
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-900"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white p-3.5 rounded-2xl font-black transition shadow-md disabled:opacity-50 text-xs"
            >
              {loading ? 'Saving...' : 'Save Expense Record'}
            </button>
          </form>
        </div>

        {/* 2. EXPENSE HISTORY LOG WITH FILTERS */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2 flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-sm font-extrabold text-blue-900">
              Expense History Log
            </h2>
            <span className="bg-rose-50 text-rose-900 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-rose-200">
              Filtered Records: {filteredLogs.length}
            </span>
          </div>

          {/* Search & Date Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border text-xs">
            <div>
              <input
                type="text"
                placeholder="🔍 Search by ID or Title..."
                className="w-full p-2 border rounded-xl bg-white font-bold outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-1">
              <input
                type="date"
                className="w-full p-2 border rounded-xl bg-white font-bold outline-none text-xs"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded-xl font-bold text-xs"
                  title="Clear Date Filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Expense Log List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredLogs.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-900 font-mono font-black text-[10px] px-2 py-0.5 rounded-lg border border-blue-200">
                      #{item.serial_no || '-'}
                    </span>
                    <h4 className="font-extrabold text-xs text-blue-950">
                      {item.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-rose-700 text-xs">
                      Rs. {parseFloat(item.amount || 0).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(item.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold px-1.5 py-0.5 rounded transition font-mono"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                  <span>Category: <b className="text-gray-700">{item.category}</b></span>
                  <span>Date: <b className="text-blue-900">{item.expense_date || item.created_at?.split('T')[0]}</b></span>
                </div>

                {item.notes && (
                  <p className="text-[10px] text-gray-400 font-normal italic">
                    Note: {item.notes}
                  </p>
                )}
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-12 font-medium">
                No matching expense records found.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}