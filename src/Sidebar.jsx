import { Plus, X, LogOut, Search, Home, BarChart3, Settings } from 'lucide-react';
import React, { useState } from 'react';

/**
 * ------------------------------------------------------------------
 * COMPONENT: SIDEBAR (Off-Canvas Drawer)
 * ------------------------------------------------------------------
 */
export const Sidebar = ({ isOpen, onClose, user, onLogout, onNavigate }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose} />

      {/* Drawer */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            {!imgError ? (
              <img
                src="logo.png"
                alt="FirstBaseIT"
                className="h-8 object-contain"
                onError={() => setImgError(true)} />
            ) : (
              <span className="text-lg font-bold tracking-tighter text-slate-800"><span className="text-[#5ABBCE]">FirstBaseIT</span></span>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Menu</p>

            <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-[#5ABBCE] rounded-lg transition-colors group">
              <Home size={18} className="group-hover:text-[#5ABBCE]" />
              <span className="font-medium">Dashboard</span>
            </button>

            <button onClick={() => onNavigate('create')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-[#5ABBCE] rounded-lg transition-colors group">
              <Plus size={18} className="group-hover:text-[#5ABBCE]" />
              <span className="font-medium">New Estimate</span>
            </button>

            <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-[#5ABBCE] rounded-lg transition-colors group">
              <Search size={18} className="group-hover:text-[#5ABBCE]" />
              <span className="font-medium">Search / Archive</span>
            </button>

            {/* Reports Group with Hover Submenu */}
            <div className="group relative">
              <button onClick={() => onNavigate('reports')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-[#5ABBCE] rounded-lg transition-colors">
                <BarChart3 size={18} className="group-hover:text-[#5ABBCE]" />
                <span className="font-medium">Reports</span>
              </button>
              {/* Submenu container that appears on hover */}
              <div className="hidden group-hover:block pl-4 pr-4 pb-2">
                <div className="pl-9 border-l-2 border-slate-100 space-y-1">
                  <button
                    onClick={() => onNavigate('reports')}
                    className="block w-full text-left text-sm text-slate-500 hover:text-[#5ABBCE] hover:bg-slate-50 py-1.5 pl-3 rounded-r-md transition-colors"
                  >
                    Approved Estimates
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">

            {/* NEW: Added onClick handler here to navigate to settings */}
            <button onClick={() => onNavigate('settings')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 hover:text-[#5ABBCE] rounded-lg transition-colors mb-2 group">
              <Settings size={18} className="group-hover:text-[#5ABBCE]" />
              <span className="font-medium">Settings / Admin</span>
            </button>

            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white">
              <div className="h-9 w-9 rounded-full bg-[#5ABBCE]/10 text-[#5ABBCE] flex items-center justify-center font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <button onClick={onLogout} className="text-slate-400 hover:text-red-500" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
