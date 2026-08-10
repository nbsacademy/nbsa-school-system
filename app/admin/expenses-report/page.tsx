'use client';
import { useState } from 'react';

export default function ExpenseReportPage() {
  // Filter State
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Master Data
  const [financialSummary] = useState({
    totalIncome: 185000, // Fee Collections
    totalSalaries: 75000, // Staff Salaries Paid
    otherExpenses: 48700, // Other Expenses
  });

  const [allExpenses] = useState([
    { id: '1', title: 'Building Rent', category: 'Rent', amount: 35000, date: '2026-08-01', month: '2026-08' },
    { id: '2', title: 'Electricity Bill', category: 'Bills', amount: 12500, date: '2026-08-02', month: '2026-08' },
    { id: '3', title: 'Whiteboard Markers & Paper', category: 'Stationery', amount: 1200, date: '2026-08-04', month: '2026-08' },
    { id: '4', title: 'Tea & Refreshment for Teachers', category: 'Tea/Refreshment', amount: 2500, date: '2026-07-28', month: '2026-07' },
  ]);

  // Filter Logic
  const filteredExpenses = allExpenses.filter((item) => {
    const matchesMonth = selectedMonth ? item.month === selectedMonth : true;
    const matchesCategory = selectedCategory !== 'All' ? item.category === selectedCategory : true;
    return matchesMonth && matchesCategory;
  });

  // Category Total Expense
  const totalFilteredExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Profit/Loss Calculations
  const grandTotalExpenses = financialSummary.totalSalaries + financialSummary.otherExpenses;
  const netProfit = financialSummary.totalIncome - grandTotalExpenses;

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans text-left text-slate-900">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-red-600 flex justify-between items-center flex-wrap gap-4 print:shadow-none print:border-none">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-blue-900">
            Academy Financial & Expense Report
          </h2>
          <p className="text-xs text-gray-500">
            Comprehensive profit, loss and expense analytics
          </p>
        </div>

        <button
          onClick={handlePrintReport}
          className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow flex items-center gap-2 print:hidden"
        >
          <span>🖨️</span>
          <span>Print Statement</span>
        </button>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Income */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-emerald-800 block">Total Income (Fees)</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">Rs. {financialSummary.totalIncome.toLocaleString()}</h3>
          </div>
          <span className="text-3xl bg-emerald-50 p-3 rounded-2xl">💰</span>
        </div>

        {/* Grand Outflow */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-red-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-red-800 block">Total Expenses & Salaries</span>
            <h3 className="text-2xl font-black text-red-600 mt-1">Rs. {grandTotalExpenses.toLocaleString()}</h3>
          </div>
          <span className="text-3xl bg-red-50 p-3 rounded-2xl">💸</span>
        </div>

        {/* Net Balance / Profit */}
        <div className={`p-5 rounded-3xl shadow-sm border flex items-center justify-between ${netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <div>
            <span className="text-xs font-extrabold opacity-80 block">Net Profit / Savings</span>
            <h3 className="text-2xl font-black mt-1">Rs. {netProfit.toLocaleString()}</h3>
          </div>
          <span className="text-3xl bg-white/20 p-3 rounded-2xl">📊</span>
        </div>

      </div>

      {/* Filters Control Box */}
      <div className="bg-white p-5 rounded-3xl shadow border flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Select Month:</label>
          <input
            type="month"
            className="p-2 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-900 bg-slate-50 w-full sm:w-auto"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Category:</label>
          <select
            className="p-2 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-900 bg-slate-50 w-full sm:w-auto"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Bills">Bills</option>
            <option value="Rent">Rent</option>
            <option value="Stationery">Stationery</option>
            <option value="Tea/Refreshment">Tea/Refreshment</option>
          </select>
        </div>
      </div>

      {/* Expense Breakdown List Table */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-base font-extrabold text-slate-800">
            Itemized Expense Statement
          </h3>
          <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-extrabold font-mono">
            Filtered Total: Rs. {totalFilteredExpense.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b text-gray-700 font-extrabold">
                <th className="p-3">#</th>
                <th className="p-3">Expense Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Date</th>
                <th className="p-3">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-gray-400 font-bold">
                    No expense entries found for selected criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <tr key={exp.id} className="border-b hover:bg-slate-50 transition font-medium">
                    <td className="p-3 font-bold text-gray-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-extrabold text-gray-900">{exp.title}</td>
                    <td className="p-3">
                      <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full font-bold border border-red-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 font-mono">{exp.date}</td>
                    <td className="p-3 font-black text-red-600 font-mono">Rs. {exp.amount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}