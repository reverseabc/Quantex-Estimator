import { FileText, Download, Coins, CheckCircle, Menu, BarChart3, Filter } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { formatCurrency } from './App';

/**
 * ------------------------------------------------------------------
 * COMPONENT: LOGIN VIEW
 * ------------------------------------------------------------------
 */
export const LoginView = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const userPart = email.split('@')[0] || 'User';
      const formattedName = userPart.charAt(0).toUpperCase() + userPart.slice(1);
      // Default to Estimator on login
      onLogin({ email, name: formattedName, role: 'Estimator' });
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-white p-8 border-b border-slate-100 flex justify-center">
          {!imgError ? (
            <img
              src="logo.png"
              alt="FirstBaseIT Ltd."
              className="h-16 object-contain"
              onError={() => setImgError(true)} />
          ) : (
            <span className="text-3xl font-bold tracking-tighter text-slate-800"><span className="text-[#5ABBCE]">FirstBaseIT</span> Ltd.</span>
          )}
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-slate-500 mt-2 text-sm">Sign in to access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5ABBCE] focus:border-[#5ABBCE] outline-none transition-all"
                placeholder="name@firstbaseit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5ABBCE] focus:border-[#5ABBCE] outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5ABBCE] hover:brightness-95 text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-400">
          © 2026 FirstBaseIT Ltd.
        </div>
      </div>
    </div>
  );
};
/**
 * ------------------------------------------------------------------
 * COMPONENT: REPORTS VIEW
 * ------------------------------------------------------------------
 */
export const ReportsView = ({ user, savedEstimates, onMenuClick }) => {
  const [filterType, setFilterType] = useState('30days'); // 30days, 90days, ytd, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate Date Range based on filter type
  const dateRange = useMemo(() => {
    const end = new Date();
    let start = new Date();

    if (filterType === '30days') {
      start.setDate(end.getDate() - 30);
    } else if (filterType === '90days') {
      start.setDate(end.getDate() - 90);
    } else if (filterType === 'ytd') {
      start = new Date(new Date().getFullYear(), 0, 1);
    } else if (filterType === 'custom') {
      if (!customStartDate) return null;
      start = new Date(customStartDate);
      end.setTime(customEndDate ? new Date(customEndDate).getTime() : new Date().getTime());
    }

    // Set boundaries to start/end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [filterType, customStartDate, customEndDate]);

  // Filter Data
  const filteredEstimates = useMemo(() => {
    if (!savedEstimates || !dateRange) return [];

    return savedEstimates.filter(est => {
      // 1. Must be Approved
      if (est.status !== 'Approved') return false;

      // 2. Must be within date range
      const estDate = new Date(est.projectDate);
      estDate.setHours(12, 0, 0, 0); // Avoid timezone offset issues

      return estDate >= dateRange.start && estDate <= dateRange.end;
    }).sort((a, b) => new Date(b.projectDate) - new Date(a.projectDate)); // Newest first
  }, [savedEstimates, dateRange]);

  // Calculate Summary Metrics
  const totalValue = filteredEstimates.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const averageValue = filteredEstimates.length > 0 ? totalValue / filteredEstimates.length : 0;

  // Simple CSV Export for this specific report
  const handleExportReport = () => {
    const headers = ['Project Name', 'JIRA Ref', 'Owner', 'Date', 'Grand Total Excl. VAT'];
    const rows = filteredEstimates.map(e => [
      `"${e.projectName}"`,
      `"${e.jiraRef || ''}"`,
      `"${e.owner}"`,
      e.projectDate,
      e.grandTotal
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Approved_Estimates_${filterType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-slate-700 text-lg">Reports & Analytics</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-[#5ABBCE]/20 text-[#5ABBCE] flex items-center justify-center font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Report Header & Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle size={24} className="text-green-600" />
              Approved Estimates Report
            </h2>
            <p className="text-slate-500 mt-1">A complete list of all estimates currently marked as Approved.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setFilterType('30days')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === '30days' ? 'bg-white text-[#5ABBCE] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setFilterType('90days')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === '90days' ? 'bg-white text-[#5ABBCE] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Last 90 Days
              </button>
              <button
                onClick={() => setFilterType('ytd')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'ytd' ? 'bg-white text-[#5ABBCE] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                YTD
              </button>
              <button
                onClick={() => setFilterType('custom')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'custom' ? 'bg-white text-[#5ABBCE] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Custom
              </button>
            </div>

            {filterType === 'custom' && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:ring-[#5ABBCE] focus:border-[#5ABBCE]" />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:ring-[#5ABBCE] focus:border-[#5ABBCE]" />
              </div>
            )}
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Approved Count</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{filteredEstimates.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <FileText size={20} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Value (Gross)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalValue)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Coins size={20} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Average Value</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(averageValue)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <BarChart3 size={20} />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter size={16} />
              <span>Showing estimates from <strong>{dateRange?.start.toLocaleDateString()}</strong> to <strong>{dateRange?.end.toLocaleDateString()}</strong></span>
            </div>
            <button
              onClick={handleExportReport}
              className="text-xs font-bold text-[#5ABBCE] hover:text-[#4a9bb0] flex items-center gap-1 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {filteredEstimates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No approved estimates found</h3>
              <p className="text-slate-500">Try adjusting the date range or Approve more estimates.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-xs">
                  <th className="px-6 py-3 font-bold">Project Name</th>
                  <th className="px-6 py-3 font-bold">JIRA Ref</th>
                  <th className="px-6 py-3 font-bold">Owner</th>
                  <th className="px-6 py-3 font-bold">Date Approved</th>
                  <th className="px-6 py-3 font-bold text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEstimates.map(est => (
                  <tr key={est.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">{est.projectName}</td>
                    <td className="px-6 py-3 text-slate-500">{est.jiraRef || '-'}</td>
                    <td className="px-6 py-3 text-slate-500">{est.owner}</td>
                    <td className="px-6 py-3 text-slate-500">{new Date(est.projectDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-600">{formatCurrency(est.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  );
};
