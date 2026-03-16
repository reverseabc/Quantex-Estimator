import React, { useState, useEffect } from 'react';
import { Menu, Settings, Building2, Save, CheckCircle, ShieldAlert } from 'lucide-react';

export const SettingsView = ({ user, currentRate, onSaveRate, onMenuClick }) => {
  const [rateInput, setRateInput] = useState(currentRate);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keep input in sync if data loads late
  useEffect(() => {
    setRateInput(currentRate);
  }, [currentRate]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSaveRate(rateInput);
    setIsSaving(false);
    
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden">
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings size={24} className="text-[#5ABBCE]" /> Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage application preferences and global defaults.</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 gap-6">
          
          {/* PRICING & RATES CARD */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={20} className="text-slate-400" /> Pricing & Rates
              </h2>
              {user.role === 'Manager' ? (
                <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  Manager Access
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200 flex items-center gap-1">
                  <ShieldAlert size={12} /> Read Only
                </span>
              )}
            </div>
            
            <div className="p-6">
              <div className="max-w-md">
                <p className="text-sm text-slate-600 mb-6">
                  Set the baseline daily rate applied to all new estimates across the company. Existing estimates will not be affected unless updated manually.
                </p>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Default Daily Rate</label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-[200px]">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">£</span>
                      <input 
                        type="number" 
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                        disabled={user.role !== 'Manager' || isSaving}
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:ring-2 focus:ring-[#5ABBCE] focus:border-[#5ABBCE] disabled:opacity-60 transition-all"
                      />
                    </div>
                    
                    {user.role === 'Manager' && (
                      <button 
                        onClick={handleSave}
                        disabled={isSaving || Number(rateInput) === Number(currentRate)}
                        className="flex items-center gap-2 bg-[#5ABBCE] hover:brightness-95 text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                      </button>
                    )}
                  </div>

                  {showSuccess && (
                    <p className="text-sm text-emerald-600 font-bold flex items-center gap-1 mt-2 animate-in fade-in">
                      <CheckCircle size={16} /> Global rate successfully updated!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};
