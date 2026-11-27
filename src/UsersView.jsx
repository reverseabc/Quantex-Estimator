import React from 'react';
import { Menu, Users, Eye } from 'lucide-react';
import { UserManagement } from './AccountViews';

/**
 * BL-02: User Management as its own page. It's the Admin home page (BL-06).
 */
export const UsersView = ({ user, onMenuClick, onSwitchRole }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Menu"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={24} className="text-[#5ABBCE]" /> User Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Add users, change roles, reset passwords and deactivate accounts.
            </p>
          </div>
        </div>
        {onSwitchRole && (
          <button
            onClick={onSwitchRole}
            title="See the other roles' screens. Admins can't see or change estimates, so they'll be empty."
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-full border font-bold bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200 transition-all"
          >
            <Eye size={14} /> Preview other roles
          </button>
        )}
      </div>
    </header>

    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
      <UserManagement currentUserId={user.id} />
    </main>
  </div>
);
