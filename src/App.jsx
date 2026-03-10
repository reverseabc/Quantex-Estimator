import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, Calendar, Briefcase, FileText, Layers, Clock, Download, Coins, X, Server, Save, User, Shield, CheckCircle, Send, AlertTriangle, Table, ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { LoginView, ReportsView } from './LoginView';
import { DashboardView } from './DashboardView';

/**
 * ------------------------------------------------------------------
 * UTILITIES
 * ------------------------------------------------------------------
 */
export const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDays = (days) => {
  return Number(days || 0).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' Days';
};

/**
 * ------------------------------------------------------------------
 * CONSTANTS & DATA
 * ------------------------------------------------------------------
 */

const DEFAULT_CONSTANTS = [
  { id: 'c1', name: 'Project Management', days: 5, description: 'Weekly syncs, Sprint planning, Status reports' },
  { id: 'c2', name: 'Project Documentation', days: 3, description: 'SOW, Architecture diagrams, Handover docs' },
  { id: 'c3', name: 'Discovery & Requirements Analysis', days: 4, description: 'Initial scoping and requirements gathering' },
  { id: 'c4', name: 'UAT Refresh & Deployment', days: 2, description: 'Preparing UAT environment and deployment' },
  { id: 'c5', name: 'Live & DR Deployment', days: 2, description: 'Production deployment and disaster recovery setup' }
];

const STANDARD_SERVICE_ITEMS = [
  { id: 'ss1', name: 'New Regional Portal with one Client and one Product', price: 43000.00, category: 'Portal' },
  { id: 'ss2', name: 'New Regional Portal Client with one Product', price: 29000.00, category: 'Portal' },
  { id: 'ss3', name: 'Addition of an Existing Product to an Existing Client', price: 19005.00, category: 'Config' },
  { id: 'ss4', name: 'New Upload Routine', price: 17738.00, category: 'Config' },
  { id: 'ss5', name: 'Add a new field to Danni and to the Data Warehouse', price: 8869.00, category: 'Data' },
  { id: 'ss6', name: 'Product Level Validation', price: 3801.00, category: 'Config' },
  { id: 'ss7', name: 'New Rate Logic Band(s) or Update to Existing without Disb Change', price: 5068.00, category: 'Logic' },
  { id: 'ss8', name: 'New Rate Logic Band(s) or Update to Existing with Disb Change', price: 6335.00, category: 'Logic' },
  { id: 'ss9', name: 'Displaying an Existing Disbursement on the UI', price: 3167.50, category: 'UI' },
  { id: 'ss10', name: 'Adding a new Disbursement to Danni and to the UI', price: 4434.50, category: 'Config' },
  { id: 'ss11', name: 'New Spare Disbursement Addition', price: 3801.00, category: 'Config' },
  { id: 'ss12', name: 'Add a new Bespoke Help File', price: 1900.50, category: 'Docs' }
];

const API_SERVICE_ITEMS = [
  { id: 'api1', name: 'New Client Endpoint / Integration (incl. GetPrice & SavePolicy)', days: 74.3, category: 'Integration' },
  { id: 'api2', name: 'Add existing Call to existing Client', days: 14.3, category: 'Config' },
  { id: 'api3', name: 'Add New Field', days: 10.4, category: 'Data' },
  { id: 'api4', name: 'Update Existing Field', days: 6.62, category: 'Data' }
];

const DEFAULT_TM_SECTIONS = {
  danniApp: { title: 'Danni Application', items: [{ id: 'da1', workItem: 'Application Framework Setup', days: 5 }] },
  danniApi: { title: 'Danni API', items: [] },
  fbitOngoing: { title: 'FBIT Ongoing Costs', items: [] },
  fbitIt: { title: 'FBIT IT Costs', items: [] },
  thirdParty: { title: 'Third Party Costs', items: [] }
};


/**
 * ------------------------------------------------------------------
 * COMPONENT: TAB NAVIGATION
 * ------------------------------------------------------------------
 */
const TabNavigation = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-6 py-3 text-sm font-bold rounded-t-lg transition-all border-t border-x relative -mb-px whitespace-nowrap ${
            activeTab === tab.id 
              ? `bg-${tab.color}-50 text-${tab.color}-900 border-${tab.color}-200 border-b-white z-10 shadow-sm` 
              : `bg-slate-50 border-transparent text-slate-500 hover:bg-${tab.color}-50 hover:text-${tab.color}-700`
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};


/**
 * ------------------------------------------------------------------
 * COMPONENT: ESTIMATOR TOOL (The main logic)
 * ------------------------------------------------------------------
 */
const Estimator = ({ initialData, onSave, onBack, user, onMenuClick }) => {
  // State Initialization
  const [projectName, setProjectName] = useState(initialData?.projectName || 'New Project Estimate');
  const [jiraRef, setJiraRef] = useState(initialData?.jiraRef || ''); 
  const [projectDate, setProjectDate] = useState(initialData?.projectDate || new Date().toISOString().split('T')[0]);
  const [globalDailyRate, setGlobalDailyRate] = useState(initialData?.globalDailyRate || 600);
  const [owner, setOwner] = useState(initialData?.owner || user?.name || 'Unknown');
  const [status, setStatus] = useState(initialData?.status || 'Draft'); 
  const [activeTab, setActiveTab] = useState('summary');
  const [imgError, setImgError] = useState(false);
  
  const [constants, setConstants] = useState(initialData?.constants || DEFAULT_CONSTANTS);
  const [selectedStandardItems, setSelectedStandardItems] = useState(initialData?.selectedStandardItems || []);
  const [selectedApiItems, setSelectedApiItems] = useState(initialData?.selectedApiItems || []);
  const [tmSections, setTmSections] = useState(initialData?.tmSections || DEFAULT_TM_SECTIONS);
  const [bufferPercent, setBufferPercent] = useState(initialData?.bufferPercent || 10);
  
  // UI State
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  
  // Validation Modal State
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [missingSections, setMissingSections] = useState([]);

  // Calculations
  const totals = useMemo(() => {
    const constantsSum = constants.reduce((acc, item) => acc + ((Number(globalDailyRate) || 0) * (Number(item.days) || 0)), 0);
    const standardMenuSum = selectedStandardItems.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
    const apiMenuSum = selectedApiItems.reduce((acc, item) => acc + ((Number(item.days) || 0) * (Number(globalDailyRate) || 0) * (Number(item.quantity) || 1)), 0);
    
    let tmSum = 0;
    let tmDays = 0;
    Object.values(tmSections).forEach(section => {
      const sectionDays = section.items.reduce((acc, item) => acc + (Number(item.days) || 0), 0);
      const sectionTotal = sectionDays * (Number(globalDailyRate) || 0);
      
      tmDays += sectionDays;
      tmSum += sectionTotal;
    });
    
    // Calculate total days for fixed price items (Standard Menu)
    const standardMenuDays = (Number(globalDailyRate) > 0) ? (standardMenuSum / Number(globalDailyRate)) : 0;
    
    // Calculate total days for API items
    const apiDays = selectedApiItems.reduce((acc, item) => acc + ((Number(item.days) || 0) * (Number(item.quantity) || 1)), 0);
    
    // Calculate total days for constants
    const constantsDays = constants.reduce((acc, item) => acc + (Number(item.days) || 0), 0);

    const totalDays = constantsDays + standardMenuDays + apiDays + tmDays;

    const baseTotal = constantsSum + standardMenuSum + apiMenuSum + tmSum;
    const bufferAmount = (baseTotal * bufferPercent) / 100;
    const subtotal = baseTotal + bufferAmount;
    const grandTotal = subtotal; // No VAT added

    return { constantsSum, standardMenuSum, apiMenuSum, tmSum, baseTotal, bufferAmount, subtotal, grandTotal, totalDays };
  }, [constants, selectedStandardItems, selectedApiItems, tmSections, bufferPercent, globalDailyRate]);


  // --- Workflow Actions ---

  const showNotification = (msg) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  const executeSPOEUpdate = () => {
    const newStatus = 'Pending SPOE Check';
    setStatus(newStatus);
    handleSaveProject(newStatus); 
    // Simulate Email
    alert("📧 Email notification sent to all Manager users: 'New Estimate Pending SPOE Check'");
    showNotification('SPOE Check Requested');
    setShowValidationModal(false);
  };

  const handleRequestSPOE = () => {
    // Validation: Check for empty cost sections
    const sectionsToCheck = [
      { key: 'fbitOngoing', label: 'FBIT Ongoing Costs' },
      { key: 'fbitIt', label: 'FBIT IT Costs' },
      { key: 'thirdParty', label: 'Third Party Costs' }
    ];

    const emptySections = sectionsToCheck.filter(section => tmSections[section.key].items.length === 0);

    if (emptySections.length > 0) {
      setMissingSections(emptySections);
      setShowValidationModal(true);
      return;
    }

    executeSPOEUpdate();
  };

  const handleApproveSPOE = () => {
    const newStatus = 'Approved';
    setStatus(newStatus);
    handleSaveProject(newStatus);
    showNotification('Estimate Approved');
  };

  const handleSaveProject = (overrideStatus) => {
    const currentStatus = overrideStatus && typeof overrideStatus === 'string' ? overrideStatus : status;
    
    const projectData = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      projectName,
      jiraRef,
      projectDate,
      owner,
      status: currentStatus,
      globalDailyRate,
      constants,
      selectedStandardItems,
      selectedApiItems,
      tmSections,
      bufferPercent,
      grandTotal: totals.grandTotal,
      lastModified: new Date().toISOString()
    };
    
    onSave(projectData);
    if (!overrideStatus || typeof overrideStatus !== 'string') {
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2500);
    }
  };

  const handleSaveCsv = () => {
    const headers = ['Category', 'Sub-Category', 'Item', 'Description', 'Price/Rate', 'Qty/Days', 'Total'];
    const rows = [];
    rows.push(['PROJECT ESTIMATE', projectName]);
    rows.push(['JIRA REF', jiraRef]);
    rows.push(['OWNER', owner]);
    rows.push(['STATUS', status]);
    rows.push(['DATE', projectDate]);
    rows.push([]); 
    rows.push(headers);
    constants.forEach(c => {
      const total = (Number(globalDailyRate) || 0) * (Number(c.days) || 0);
      rows.push(['Admin & Project Costs', '-', c.name, c.description, globalDailyRate, c.days, total]);
    });
    Object.keys(tmSections).forEach(key => {
      const section = tmSections[key];
      section.items.forEach(t => {
        const total = (Number(globalDailyRate) || 0) * (Number(t.days) || 0);
        rows.push(['T&M', section.title, t.workItem, `Standard Daily Rate`, globalDailyRate, t.days, total]);
      });
    });
    selectedStandardItems.forEach(m => {
      const qty = m.quantity || 1;
      rows.push(['Standard Service', m.category, m.name, '-', m.price, qty, m.price * qty]);
    });
    selectedApiItems.forEach(m => {
      const qty = m.quantity || 1;
      const unitPrice = m.days * globalDailyRate;
      const total = unitPrice * qty;
      const totalDays = m.days * qty;
      rows.push(['API Service', m.category, m.name, '-', globalDailyRate, totalDays, total]);
    });
    rows.push([]);
    rows.push(['', '', '', '', '', 'Total Effort', formatDays(totals.totalDays)]);
    rows.push(['', '', '', '', '', 'Base Total', totals.baseTotal]);
    rows.push(['', '', '', '', '', `Buffer (${bufferPercent}%)`, totals.bufferAmount]);
    rows.push(['', '', '', '', '', 'Subtotal', totals.subtotal]);
    // Removed VAT Row
    rows.push(['', '', '', '', '', 'GRAND TOTAL (Excl. VAT)', totals.grandTotal]);
    
    const csvContent = rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"')) { return `"${cellStr.replace(/"/g, '""')}"`; }
        return cellStr;
      }).join(',')
    ).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${projectName.replace(/\s+/g, '_')}_estimate.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    const tableData = [
      `PROJECT ESTIMATE - FirstBaseIT Ltd.`,
      `Project: ${projectName}`,
      `JIRA Ref: ${jiraRef}`,
      `Owner: ${owner}`,
      `Status: ${status}`,
      `Date: ${projectDate}`,
      `------------------------------------------------`,
      `ADMIN & PROJECT COSTS: ${formatCurrency(totals.constantsSum)}`,
      `T&M WORK: ${formatCurrency(totals.tmSum)}`,
      `SERVICE MENU: ${formatCurrency(totals.standardMenuSum)}`,
      `API SERVICE MENU: ${formatCurrency(totals.apiMenuSum)}`,
      `------------------------------------------------`,
      `TOTAL EFFORT: ${formatDays(totals.totalDays)}`,
      `SUBTOTAL: ${formatCurrency(totals.subtotal)}`,
      `GRAND TOTAL (Excl. VAT): ${formatCurrency(totals.grandTotal)}`
    ].join('\n');
    const el = document.createElement('textarea');
    el.value = tableData;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2500);
  };

  // State Updates helpers
  const updateConstantDays = (id, days) => setConstants(constants.map(c => c.id === id ? { ...c, days: Number(days) } : c));
  const toggleStandardItem = (item) => {
    if (selectedStandardItems.find(m => m.id === item.id)) setSelectedStandardItems(selectedStandardItems.filter(m => m.id !== item.id));
    else setSelectedStandardItems([...selectedStandardItems, { ...item, quantity: 1 }]);
  };
  const updateStandardItemQuantity = (id, newQty) => {
    if (newQty < 1) return;
    setSelectedStandardItems(selectedStandardItems.map(item => item.id === id ? { ...item, quantity: Number(newQty) } : item));
  };
  const toggleApiItem = (item) => {
    if (selectedApiItems.find(m => m.id === item.id)) setSelectedApiItems(selectedApiItems.filter(m => m.id !== item.id));
    else setSelectedApiItems([...selectedApiItems, { ...item, quantity: 1 }]);
  };
  const updateApiItemQuantity = (id, newQty) => {
    if (newQty < 1) return;
    setSelectedApiItems(selectedApiItems.map(item => item.id === id ? { ...item, quantity: Number(newQty) } : item));
  };
  const addTmRow = (key) => {
    const newRow = { id: Math.random().toString(36).substr(2, 9), workItem: '', days: 0 };
    setTmSections(prev => ({ ...prev, [key]: { ...prev[key], items: [...prev[key].items, newRow] } }));
  };
  const updateTmRow = (key, id, field, value) => {
    setTmSections(prev => ({ ...prev, [key]: { ...prev[key], items: prev[key].items.map(item => item.id === id ? { ...item, [field]: value } : item) } }));
  };
  const removeTmRow = (key, id) => {
    setTmSections(prev => ({ ...prev, [key]: { ...prev[key], items: prev[key].items.filter(item => item.id !== id) } }));
  };
  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    const key = newSectionName.toLowerCase().replace(/[^a-z0-9]/g, '_') + Math.random().toString(36).substr(2, 5);
    setTmSections(prev => ({ ...prev, [key]: { title: newSectionName, items: [] } }));
    setNewSectionName('');
    setIsAddingSection(false);
  };
  const handleDeleteSection = (key) => {
    if (confirm('Are you sure you want to remove this entire section and its items?')) {
      const newSections = { ...tmSections };
      delete newSections[key];
      setTmSections(newSections);
    }
  };
  const getSectionTotal = (items) => items.reduce((acc, item) => acc + ((Number(globalDailyRate) || 0) * (Number(item.days) || 0)), 0);

  // Tabs Configuration with Colors (Pastel Palette)
  const tabs = [
    { id: 'summary', label: 'Summary', color: 'blue' },
    { id: 'admin', label: 'Administration & Project Costs', color: 'sky' },
    { id: 'tm', label: 'Time & Materials', color: 'emerald' },
    { id: 'standard', label: 'Service Menu', color: 'teal' },
    { id: 'api', label: 'API Service Menu', color: 'amber' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-40 relative">
      
      {/* --- MODALS --- */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100 transform transition-all">
            <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertTriangle className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900">Missing Cost Sections</h3>
                <p className="text-sm text-amber-700 mt-1">The following sections have no items added:</p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                {missingSections.map(section => (
                  <li key={section.key} className="flex items-center gap-3 text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    {section.label}
                  </li>
                ))}
              </ul>
              <p className="text-slate-500 text-sm mb-6">Do you wish to continue requesting the SPOE check without adding these costs?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowValidationModal(false)} className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors">Go Back</button>
                <button onClick={executeSPOEUpdate} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-sm transition-colors">Yes, Continue</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TOASTS --- */}
      {showCopiedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Check size={18} className="text-green-400" /> <span className="font-medium">Summary copied</span>
        </div>
      )}
      {showSavedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Check size={18} className="text-[#5ABBCE]" /> <span className="font-medium">Project Saved</span>
        </div>
      )}
      {notificationMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-purple-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Send size={18} /> <span className="font-medium">{notificationMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-t-4 border-t-[#5ABBCE] border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft size={24} />
              </button>
              <div>
                {!imgError ? (
                  <img 
                    src="logo.png" 
                    alt="FirstBaseIT Ltd." 
                    className="h-10 object-contain"
                    onError={() => setImgError(true)} 
                  />
                ) : (
                  <span className="text-xl font-bold tracking-tighter text-slate-800"><span className="text-[#5ABBCE]">FirstBaseIT</span> Ltd.</span>
                )}
              </div>
            </div>
            {/* ... rest of header is same ... */}
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-start gap-4 w-full">
                
                {/* JIRA Ref - Now on the left */}
                <div className="w-32 flex-shrink-0">
                  <label className="text-xs font-bold text-[#5ABBCE] uppercase tracking-wider block mb-1">JIRA Ref</label>
                  <input 
                    type="text" 
                    value={jiraRef} 
                    onChange={(e) => setJiraRef(e.target.value)} 
                    className="text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded px-3 py-2 focus:ring-[#5ABBCE] focus:border-[#5ABBCE] w-full" 
                    placeholder="PROJ-123" 
                  />
                </div>

                {/* Project Name - Now on the right, reduced size */}
                <div className="flex-1">
                  <label className="text-xs font-bold text-[#5ABBCE] uppercase tracking-wider block mb-1">Project Name</label>
                  <input 
                    type="text" 
                    value={projectName} 
                    onChange={(e) => setProjectName(e.target.value)} 
                    className="text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded px-3 py-2 focus:ring-[#5ABBCE] focus:border-[#5ABBCE] w-full placeholder:text-slate-300" 
                    placeholder="Enter Project Name" 
                  />
                </div>

              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <User size={14} className="text-slate-400"/> Owner: <span className="font-bold text-slate-700">{owner}</span>
                </div>
                <div className={`flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${
                  status === 'Approved' ? 'bg-green-50 border-green-100 text-green-700' : 
                  status === 'Pending SPOE Check' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                  'bg-slate-50 border-slate-100 text-slate-500'
                }`}>
                  <Shield size={14} /> Status: <span className="font-bold">{status}</span>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-2 pb-2">
              <button onClick={() => handleSaveProject()} className="p-2 bg-slate-100 hover:bg-[#5ABBCE]/10 text-slate-600 hover:text-[#5ABBCE] rounded-lg transition-colors border border-slate-200" title="Save Project"><Save size={20} /></button>
              <button onClick={handleSaveCsv} className="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors border border-slate-200" title="Export to Excel"><Download size={20} /></button>
              <button onClick={handleCopy} className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-colors border border-slate-200" title="Copy to Clipboard"><Copy size={20} /></button>
            </div>

            <div className="w-full md:w-48 space-y-2">
              <label className="text-xs font-bold text-[#5ABBCE] uppercase tracking-wider flex items-center gap-2"><Coins size={14} /> Standard Daily Rate</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">£</span>
              <input type="number" value={globalDailyRate} onChange={(e) => setGlobalDailyRate(e.target.value)} className="w-full pl-7 pr-3 py-2 bg-slate-100 border-transparent rounded-lg text-lg font-bold text-slate-800 focus:ring-[#5ABBCE] focus:border-[#5ABBCE] hover:bg-slate-200 transition-colors" /></div>
            </div>
            <div className="w-full md:w-48 space-y-2">
              <label className="text-xs font-bold text-[#5ABBCE] uppercase tracking-wider flex items-center gap-2"><Calendar size={14} /> Estimate Date</label>
              <input type="date" value={projectDate} onChange={(e) => setProjectDate(e.target.value)} className="w-full bg-slate-100 border-transparent rounded-lg text-sm font-medium focus:ring-[#5ABBCE] focus:border-[#5ABBCE] hover:bg-slate-200 transition-colors" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ONE-NOTE STYLE TABS */}
        <TabNavigation tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="min-h-[400px]">
          
          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-blue-100 bg-blue-50">
                  <h2 className="font-bold text-lg text-blue-900 flex items-center gap-2"><Table size={18} className="text-blue-400" /> Executive Estimate Summary</h2>
                </div>
                <div className="p-6 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-xs">
                        <th className="pb-3 pl-2 font-bold w-1/2">Item</th>
                        <th className="pb-3 font-bold text-center">Effort (Days)</th>
                        <th className="pb-3 pr-2 font-bold text-right">Estimate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {constants.filter(c => c.days > 0).map(c => (
                        <tr key={c.id}>
                          <td className="py-3 pl-2">
                            <div className="font-medium text-slate-800">{c.name}</div>
                            <div className="text-xs text-slate-400">Administration</div>
                          </td>
                          <td className="py-3 text-center text-slate-600">{Number(c.days).toFixed(2)}</td>
                          <td className="py-3 pr-2 text-right font-bold text-slate-700">{formatCurrency(c.days * globalDailyRate)}</td>
                        </tr>
                      ))}
                      {selectedStandardItems.map(item => {
                        const totalCost = item.price * (item.quantity || 1);
                        const calculatedDays = globalDailyRate > 0 ? totalCost / globalDailyRate : 0;
                        return (
                          <tr key={item.id}>
                            <td className="py-3 pl-2">
                              <div className="font-medium text-slate-800">{item.name} {item.quantity > 1 && <span className="text-xs text-slate-400">x{item.quantity}</span>}</div>
                              <div className="text-xs text-slate-400">Service Menu</div>
                            </td>
                            <td className="py-3 text-center text-slate-600">{calculatedDays.toFixed(2)}</td>
                            <td className="py-3 pr-2 text-right font-bold text-slate-700">{formatCurrency(totalCost)}</td>
                          </tr>
                        );
                      })}
                      {selectedApiItems.map(item => {
                        const totalDays = item.days * (item.quantity || 1);
                        const totalCost = totalDays * globalDailyRate;
                        return (
                          <tr key={item.id}>
                            <td className="py-3 pl-2">
                              <div className="font-medium text-slate-800">{item.name} {item.quantity > 1 && <span className="text-xs text-slate-400">x{item.quantity}</span>}</div>
                              <div className="text-xs text-slate-400">API Service</div>
                            </td>
                            <td className="py-3 text-center text-slate-600">{totalDays.toFixed(2)}</td>
                            <td className="py-3 pr-2 text-right font-bold text-slate-700">{formatCurrency(totalCost)}</td>
                          </tr>
                        );
                      })}
                      {Object.values(tmSections).flatMap(s => s.items).filter(i => i.days > 0).map(item => (
                        <tr key={item.id}>
                          <td className="py-3 pl-2">
                            <div className="font-medium text-slate-800">{item.workItem}</div>
                            <div className="text-xs text-slate-400">Time & Materials</div>
                          </td>
                          <td className="py-3 text-center text-slate-600">{Number(item.days).toFixed(2)}</td>
                          <td className="py-3 pr-2 text-right font-bold text-slate-700">{formatCurrency(item.days * globalDailyRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-100">
                      <tr>
                         <td colSpan="2" className="pt-4 text-right text-slate-500 font-medium">Total Effort</td>
                         <td className="pt-4 pr-2 text-right font-bold text-slate-800">{formatDays(totals.totalDays)}</td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="pt-2 text-right text-slate-500 font-medium">Subtotal (Net)</td>
                        <td className="pt-2 pr-2 text-right font-bold text-slate-800">{formatCurrency(totals.baseTotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="pt-2 text-right text-slate-500 font-medium">Contingency Buffer ({bufferPercent}%)</td>
                        <td className="pt-2 pr-2 text-right font-bold text-slate-800">{formatCurrency(totals.bufferAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="pt-2 text-right text-slate-500 font-medium">Subtotal (Gross)</td>
                        <td className="pt-2 pr-2 text-right font-bold text-slate-800">{formatCurrency(totals.subtotal)}</td>
                      </tr>
                      {/* Removed VAT Row */}
                      <tr>
                        <td colSpan="2" className="pt-4 text-right text-slate-800 font-bold text-lg">Grand Total Excl. VAT</td>
                        <td className="pt-4 pr-2 text-right font-bold text-emerald-600 text-lg">{formatCurrency(totals.grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: SERVICE MENU (Renamed from Standard Service Menu) */}
          {activeTab === 'standard' && (
            <section className="bg-teal-50/50 rounded-xl border border-teal-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="px-6 py-4 border-b border-teal-100 bg-teal-50 flex items-center justify-between">
                <h2 className="font-bold text-lg text-teal-900 flex items-center gap-2"><Layers className="text-teal-500" size={20} /> Service Menu</h2>
                <div className="text-xs font-semibold px-2 py-1 bg-white text-teal-700 rounded border border-teal-200">{formatCurrency(totals.standardMenuSum)}</div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                {STANDARD_SERVICE_ITEMS.map(item => {
                  const isSelected = selectedStandardItems.find(m => m.id === item.id);
                  return (
                    <button key={item.id} onClick={() => toggleStandardItem(item)} className={`flex flex-col p-4 rounded-lg border text-left transition-all relative ${isSelected ? 'bg-teal-50 border-teal-200 shadow-sm ring-1 ring-teal-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start w-full mb-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>{item.category}</span>{isSelected && <div className="bg-teal-500 text-white rounded-full p-0.5"><Check size={12} /></div>}</div>
                      <span className={`font-semibold text-sm mb-1 ${isSelected ? 'text-teal-900' : 'text-slate-700'}`}>{item.name}</span>
                      <span className={`text-sm font-bold mt-auto ${isSelected ? 'text-teal-600' : 'text-slate-400'}`}>{formatCurrency(item.price)}</span>
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-2 bg-white/60 p-1.5 rounded border border-teal-100" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-bold text-teal-700 uppercase">Qty:</label>
                            <input type="number" min="1" value={isSelected.quantity || 1} onChange={(e) => updateStandardItemQuantity(item.id, e.target.value)} className="w-16 h-7 text-sm text-center border border-teal-200 rounded focus:ring-teal-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB 3: API SERVICES */}
          {activeTab === 'api' && (
            <section className="bg-amber-50/50 rounded-xl border border-amber-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                <h2 className="font-bold text-lg text-amber-900 flex items-center gap-2"><Server className="text-amber-500" size={20} /> API Service Menu</h2>
                <div className="text-xs font-semibold px-2 py-1 bg-white text-amber-700 rounded border border-amber-200">{formatCurrency(totals.apiMenuSum)}</div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                {API_SERVICE_ITEMS.map(item => {
                  const isSelected = selectedApiItems.find(m => m.id === item.id);
                  const calculatedPrice = item.days * globalDailyRate;
                  return (
                    <button key={item.id} onClick={() => toggleApiItem(item)} className={`flex flex-col p-4 rounded-lg border text-left transition-all relative ${isSelected ? 'bg-amber-50 border-amber-200 shadow-sm ring-1 ring-amber-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start w-full mb-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{item.category}</span>{isSelected && <div className="bg-amber-500 text-white rounded-full p-0.5"><Check size={12} /></div>}</div>
                      <span className={`font-semibold text-sm mb-1 ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>{item.name}</span>
                      <span className={`text-sm font-bold mt-auto pt-2 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`}>{formatCurrency(calculatedPrice)}</span>
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-2 bg-white/60 p-1.5 rounded border border-amber-100" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-bold text-amber-700 uppercase">Qty:</label>
                            <input type="number" min="1" value={isSelected.quantity || 1} onChange={(e) => updateApiItemQuantity(item.id, e.target.value)} className="w-16 h-7 text-sm text-center border border-amber-200 rounded focus:ring-amber-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB 4: ADMIN COSTS */}
          {activeTab === 'admin' && (
            <section className="bg-sky-50/50 rounded-xl border border-sky-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="px-6 py-4 border-b border-sky-100 bg-sky-50 flex items-center justify-between">
                <h2 className="font-bold text-lg text-sky-900 flex items-center gap-2"><FileText className="text-[#5ABBCE]" size={20} /> Administration & Project Costs</h2>
                <div className="text-xs font-semibold px-2 py-1 bg-white text-[#5ABBCE] rounded border border-[#5ABBCE]/20">{formatCurrency(totals.constantsSum)}</div>
              </div>
              <div className="p-6 space-y-5 bg-white">
                {constants.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-4 p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-700 text-base">{item.name}</p>
                      <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div><label className="block text-[10px] font-bold text-slate-400 uppercase text-center mb-1">Days</label>
                      <input type="number" value={item.days} onChange={(e) => updateConstantDays(item.id, e.target.value)} className="w-20 px-3 py-2 bg-white border border-slate-200 rounded text-base text-center font-medium focus:ring-[#5ABBCE] focus:border-[#5ABBCE]" /></div>
                      <div className="text-right w-24"><label className="block text-[10px] font-bold text-slate-400 uppercase text-right mb-1">Total</label>
                      <span className="text-base font-bold text-slate-700">{formatCurrency((Number(item.days) || 0) * (Number(globalDailyRate) || 0))}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 5: TIME & MATERIALS */}
          {activeTab === 'tm' && (
            <section className="bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center justify-between">
                <h2 className="font-bold text-lg text-emerald-900 flex items-center gap-2"><Clock className="text-emerald-500" size={20} /> Time & Materials</h2>
                <div className="text-xs font-semibold px-2 py-1 bg-white text-emerald-700 rounded border border-emerald-200">{formatCurrency(totals.tmSum)}</div>
              </div>
              <div className="p-6 flex-1 space-y-8 bg-white">
                {Object.entries(tmSections).map(([key, section]) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{section.title}</h3>
                        <button onClick={() => handleDeleteSection(key)} className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50"><Trash2 size={12} /></button>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">{formatCurrency(getSectionTotal(section.items))}</span>
                    </div>
                    <div className="space-y-3">
                      {section.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-100 rounded-lg group transition-colors">
                          <div className="flex-1">
                             <input type="text" placeholder="Description..." value={item.workItem} onChange={(e) => updateTmRow(key, item.id, 'workItem', e.target.value)} className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:ring-0" />
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase text-center mb-1">Days</label>
                                <input type="number" value={item.days} onChange={(e) => updateTmRow(key, item.id, 'days', e.target.value)} className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded text-sm text-center font-medium focus:ring-[#5ABBCE] focus:border-[#5ABBCE]" />
                            </div>
                            <div className="text-right w-24">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase text-right mb-1">Total</label>
                                <span className="text-sm font-bold text-slate-700">{formatCurrency((Number(globalDailyRate) || 0) * (Number(item.days) || 0))}</span>
                            </div>
                            <div className="flex items-end h-full pb-1">
                                <button onClick={() => removeTmRow(key, item.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addTmRow(key)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded flex items-center gap-1"><Plus size={12} /> Add Item</button>
                  </div>
                ))}
                <div className="pt-4 border-t border-slate-200 mt-4">
                  {isAddingSection ? (
                    <div className="flex items-center gap-2"><input type="text" autoFocus placeholder="New Section Name" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} className="flex-1 text-sm border-slate-300 rounded-md shadow-sm" onKeyDown={(e) => e.key === 'Enter' && handleAddSection()} /><button onClick={handleAddSection} className="bg-emerald-600 text-white p-2 rounded-md"><Check size={16} /></button><button onClick={() => setIsAddingSection(false)} className="bg-slate-200 text-slate-600 p-2 rounded-md"><X size={16} /></button></div>
                  ) : (
                    <button onClick={() => setIsAddingSection(true)} className="w-full py-2 border-2 border-dashed border-emerald-200 rounded-lg text-emerald-600 text-sm font-bold hover:bg-emerald-50 flex items-center justify-center gap-2"><Plus size={16} /> Add New Section</button>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {status === 'Draft' && (
                <button onClick={handleRequestSPOE} className="flex items-center gap-2 bg-[#5ABBCE] hover:brightness-95 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all shadow-sm"><Send size={14} /> Request SPOE Check</button>
              )}
              {status === 'Pending SPOE Check' && user.role === 'Manager' && (
                <button onClick={handleApproveSPOE} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors shadow-sm"><CheckCircle size={14} /> Approve SPOE</button>
              )}
            </div>
            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-500 hidden sm:block">Buffer</label>
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setBufferPercent(Math.max(0, bufferPercent - 5))} className="px-3 py-1 hover:bg-white rounded shadow-sm text-sm font-bold text-slate-600">-</button>
                  <span className="w-12 text-center text-sm font-bold text-slate-800">{bufferPercent}%</span>
                  <button onClick={() => setBufferPercent(bufferPercent + 5)} className="px-3 py-1 hover:bg-white rounded shadow-sm text-sm font-bold text-slate-600">+</button>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
              <div className="text-right"><p className="text-xs text-slate-400 font-bold uppercase">Subtotal (Net)</p><p className="font-semibold text-slate-600">{formatCurrency(totals.subtotal)}</p></div>
              <div className="text-right"><p className="text-xs text-slate-400 font-bold uppercase">Buffer ({bufferPercent}%)</p><p className="font-semibold text-slate-600">+ {formatCurrency(totals.bufferAmount)}</p></div>
              <div className="bg-slate-900 text-white px-6 py-3 rounded-lg text-right min-w-[180px]"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Grand Total Excl. VAT</p><p className="text-2xl font-bold leading-none">{formatCurrency(totals.grandTotal)}</p></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('dashboard'); 
  const [user, setUser] = useState({ name: 'Test User', email: 'test@firstbaseit.com', role: 'Estimator', isSidebarOpen: false });
  const [savedEstimates, setSavedEstimates] = useState([]);
  const [currentEstimateData, setCurrentEstimateData] = useState(null);

  useEffect(() => {
    fetch('/api/estimates')
      .then(res => res.json())
      .then(data => setSavedEstimates(data))
      .catch(err => console.error("Error loading estimates:", err));
  }, []);

  useEffect(() => {
    localStorage.setItem('fbit_estimates', JSON.stringify(savedEstimates));
  }, [savedEstimates]);

  const setSidebarOpen = (isOpen) => {
      setUser(prev => ({...prev, isSidebarOpen: isOpen}));
  };

  const handleSwitchRole = () => {
    const newRole = user.role === 'Estimator' ? 'Manager' : 'Estimator';
    setUser({ ...user, role: newRole });
  };

  const handleLogin = (userData) => {
    setUser({ ...userData, role: 'Estimator', isSidebarOpen: false });
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  const handleCreateNew = () => {
    setCurrentEstimateData(null); 
    setView('estimate');
  };

  const handleOpenEstimate = (estimate) => {
    setCurrentEstimateData(estimate);
    setView('estimate');
  };

  const handleDeleteEstimate = async (id) => {
    if (confirm('Are you sure you want to delete this estimate?')) {
      // 2. Tell the Backend to delete it
      try {
        await fetch(`/api/estimates/${id}`, { method: 'DELETE' });
        setSavedEstimates(savedEstimates.filter(e => e.id !== id));
      } catch (err) {
        console.error("Failed to delete:", err);
      }
    }
  };

  const handleSaveEstimate = async (estimateData) => {
    try {
      const exists = savedEstimates.find(e => e.id === estimateData.id);
      if (exists) {
        // 3. Tell the Backend to UPDATE (PUT) the existing estimate
        await fetch(`/api/estimates/${estimateData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(estimateData)
        });
        setSavedEstimates(savedEstimates.map(e => e.id === estimateData.id ? estimateData : e));
      } else {
        // 4. Tell the Backend to CREATE (POST) a new estimate
        await fetch('/api/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(estimateData)
        });
        setSavedEstimates([estimateData, ...savedEstimates]);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleNavigate = (page) => {
      setSidebarOpen(false);
      if (page === 'create') handleCreateNew();
      else if (page === 'dashboard') setView('dashboard');
      else if (page === 'reports') setView('reports');
  };

  // RENDER ROUTING
  if (view === 'login') {
    return <LoginView onLogin={handleLogin} />;
  }

  const commonProps = {
      user: { ...user, setSidebarOpen, onLogout: handleLogout, onCreateNew: handleCreateNew, onChangeView: handleNavigate },
      onMenuClick: () => setSidebarOpen(true)
  };

  if (view === 'dashboard') {
    return (
      <>
        <Sidebar isOpen={user.isSidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} onNavigate={handleNavigate} />
        <DashboardView 
          {...commonProps}
          savedEstimates={savedEstimates} 
          onCreateNew={handleCreateNew} 
          onOpenEstimate={handleOpenEstimate} 
          onDeleteEstimate={handleDeleteEstimate}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
          onNavigateToReports={() => handleNavigate('reports')}
        />
      </>
    );
  }
  
  if (view === 'reports') {
      return (
        <>
            <Sidebar isOpen={user.isSidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} onNavigate={handleNavigate} />
            <ReportsView {...commonProps} savedEstimates={savedEstimates} />
        </>
      )
  }

  if (view === 'estimate') {
    return (
      <>
        <Sidebar isOpen={user.isSidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} onNavigate={handleNavigate} />
        <Estimator 
          {...commonProps}
          initialData={currentEstimateData} 
          onSave={handleSaveEstimate} 
          onBack={() => setView('dashboard')} 
        />
      </>
    );
  }

  return null;
}