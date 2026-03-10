import { Plus, Trash2, Calendar, FileText, LogOut, LayoutGrid, Search, User, AlertCircle, Menu, BarChart3, Tag } from 'lucide-react';
import React, { useState } from 'react';
import { formatCurrency } from './App';

/**
 * ------------------------------------------------------------------
 * COMPONENT: DASHBOARD VIEW
 * ------------------------------------------------------------------
 */
export const DashboardView = ({ user, savedEstimates, onCreateNew, onOpenEstimate, onDeleteEstimate, onLogout, onSwitchRole, onMenuClick, onNavigateToReports }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('all'); // 'all' or 'pending'
  const [imgError, setImgError] = useState(false);

  // Filter Logic
  const filteredEstimates = savedEstimates.filter(est => {
    const matchesSearch = est.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (est.jiraRef && est.jiraRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      est.lastModified.includes(searchTerm);
    if (viewFilter === 'pending') {
      return matchesSearch && est.status === 'Pending SPOE Check';
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            <div>
              {!imgError ? (
                <img
                  src="logo.png"
                  alt="FirstBaseIT"
                  className="h-10 object-contain"
                  onError={() => setImgError(true)} />
              ) : (
                <span className="text-xl font-bold tracking-tighter text-slate-800"><span className="text-[#5ABBCE]">FirstBaseIT</span> Ltd.</span>
              )}
            </div>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            <h1 className="font-bold text-slate-700 text-lg hidden md:block">Estimation Dashboard</h1>
            {/* ADDED REPORTS LINK HERE */}
            <button onClick={onNavigateToReports} className="text-sm font-medium text-slate-500 hover:text-[#5ABBCE] transition-colors ml-4 flex items-center gap-1">
              <BarChart3 size={16} /> Reports
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* ROLE SWITCHER FOR TESTING */}
            <button
              onClick={onSwitchRole}
              className={`text-xs px-3 py-1 rounded-full border font-bold transition-all ${user.role === 'Manager'
                  ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'}`}
            >
              Role: {user.role} (Switch)
            </button>

            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700">{user.name}</span>
              <span className="text-xs text-slate-500">{user.email}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-[#5ABBCE]/20 text-[#5ABBCE] flex items-center justify-center font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-slate-600">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Manager Pending Alert */}
        {user.role === 'Manager' && (
          <div className="mb-8">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-1 flex p-1 gap-2">
              <button
                onClick={() => setViewFilter('all')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${viewFilter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All Projects
              </button>
              <button
                onClick={() => setViewFilter('pending')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${viewFilter === 'pending' ? 'bg-purple-600 shadow-sm text-white' : 'text-purple-600 hover:bg-purple-100'}`}
              >
                <AlertCircle size={16} /> Pending Reviews
                {savedEstimates.filter(e => e.status === 'Pending SPOE Check').length > 0 && (
                  <span className="bg-white text-purple-600 text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                    {savedEstimates.filter(e => e.status === 'Pending SPOE Check').length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search estimates or JIRA ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#5ABBCE] outline-none" />
          </div>
          <button
            onClick={onCreateNew}
            className="bg-[#5ABBCE] hover:brightness-95 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus size={18} /> Create New Estimate
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium mb-1">Total Estimates</p>
            <p className="text-3xl font-bold text-slate-800">{savedEstimates.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium mb-1">Pending Approval</p>
            <p className="text-3xl font-bold text-purple-600">{savedEstimates.filter(e => e.status === 'Pending SPOE Check').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium mb-1">Total Value Pipeline</p>
            <p className="text-3xl font-bold text-[#5ABBCE]">
              {formatCurrency(savedEstimates.reduce((acc, est) => acc + (est.grandTotal || 0), 0))}
            </p>
          </div>
        </div>

        {/* List of Estimates */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <LayoutGrid size={18} className="text-slate-400" />
              {viewFilter === 'pending' ? 'Pending Reviews' : 'All Projects'}
            </h2>
          </div>

          {filteredEstimates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No estimates found</h3>
              <p className="text-slate-500 mb-6">Create your first project estimate to get started.</p>
              <button onClick={onCreateNew} className="text-[#5ABBCE] font-bold hover:underline">Create New</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEstimates.map((est) => (
                <div key={est.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex-1 cursor-pointer" onClick={() => onOpenEstimate(est)}>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-slate-800 text-lg group-hover:text-[#5ABBCE] transition-colors">{est.projectName}</h3>
                      {/* Status Badge */}
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${est.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                          est.status === 'Pending SPOE Check' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {est.status || 'Draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><User size={12} /> {est.owner || 'Unknown'}</span>
                      {est.jiraRef && <span className="flex items-center gap-1"><Tag size={12} /> {est.jiraRef}</span>}
                      <span className="flex items-center gap-1"><Calendar size={12} /> {est.projectDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold">Total</p>
                      <p className="text-lg font-bold text-slate-800">{formatCurrency(est.grandTotal)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenEstimate(est)}
                        className="p-2 text-slate-400 hover:text-[#5ABBCE] transition-colors rounded-lg hover:bg-[#5ABBCE]/10"
                        title="Edit Estimate"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteEstimate(est.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Delete Estimate"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
