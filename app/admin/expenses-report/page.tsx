'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ExpenseReportPage() {
  const [loading, setLoading] = useState(true);

  // Date Range & Category Filter State
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-31');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Live Database Expenses State
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    fetchExpensesFromDB();
  }, []);

  // Fetch real data from Supabase 'expenses' table
  const fetchExpensesFromDB = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error.message);
      } else if (data) {
        setExpenses(data);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Date Range & Category Filtering Logic
  const filteredExpenses = expenses.filter((item) => {
    const expDate = item.expense_date || '';
    const matchesFrom = fromDate ? expDate >= fromDate : true;
    const matchesTo = toDate ? expDate <= toDate : true;
    const matchesCategory =
      selectedCategory !== 'All' ? (item.category || '').toLowerCase() === selectedCategory.toLowerCase() : true;

    return matchesFrom && matchesTo && matchesCategory;
  });

  // Calculate Total Expense for Filtered Date Range
  const totalFilteredExpense = filteredExpenses.reduce(
    (acc, curr) => acc + (parseFloat(curr.amount) || 0),
    0
  );

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-5 font-sans text-left text-slate-900 pb-16">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center flex-wrap gap-3 print:shadow-none print:border-none">
        <div>
          <h2 className="text-xl font-black text-blue-950">
            Academy Expense Statement & Report
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Live database date-wise itemized expense analytics and print statements
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={fetchExpensesFromDB}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition border"
          >
            🔄 Refresh DB
          </button>

          <button
            onClick={handlePrintReport}
            className="bg-blue-950 hover:bg-blue-900 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition shadow-sm flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date-to-Date & Category Filters Control Box */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-3 print:hidden">
        <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
          Filter Expense Statement By Date Range
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">
              From Date:
            </label>
            <input
              type="date"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none focus:border-blue-950 font-mono"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">
              To Date:
            </label>
            <input
              type="date"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none focus:border-blue-950 font-mono"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">
              Expense Category:
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none text-blue-950"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Tea & Refreshment">Tea & Refreshment</option>
              <option value="Bills (Electricity/Internet)">Bills (Electricity/Internet)</option>
              <option value="Rent">Rent</option>
              <option value="Stationery">Stationery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Itemized Expense Statement Table */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black text-blue-950 uppercase tracking-wider">
              Expense Statement ({fromDate || 'Start'} to {toDate || 'End'})
            </h3>
            <span className="text-[11px] text-gray-500 font-medium">
              Total {filteredExpenses.length} expense entries found in database
            </span>
          </div>

          <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-2 rounded-2xl font-mono font-black text-xs shadow-sm">
            Total Expense: Rs. {totalFilteredExpense.toLocaleString()}
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 text-center py-12 font-medium animate-pulse">
            Fetching live expenses from Supabase database...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-700 font-black">
                  <th className="p-3 rounded-l-xl">#</th>
                  <th className="p-3">Expense Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Expense Date</th>
                  <th className="p-3 text-right rounded-r-xl">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-800">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 font-bold bg-slate-50 rounded-2xl">
                      No expense entries found for the selected date range.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp, idx) => (
                    <tr key={exp.id || idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3 font-extrabold text-blue-950">{exp.title}</td>
                      <td className="p-3">
                        <span className="bg-rose-50 text-rose-800 px-2.5 py-0.5 rounded-full font-bold border border-rose-200 text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-mono font-bold">{exp.expense_date}</td>
                      <td className="p-3 text-right font-black text-rose-700 font-mono text-sm">
                        Rs. {(parseFloat(exp.amount) || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}