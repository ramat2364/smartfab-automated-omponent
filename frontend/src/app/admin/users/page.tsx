'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { Users, UserPlus, Shield, Mail, Edit, Trash2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function UserManagementPage() {
  const { user: currentUser, apiFetch } = useAuth();
  const { availablePlants } = usePlant();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalEntries = users.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEntries);
  const currentEntries = users.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(2, activePage - 1);
      let end = Math.min(totalPages - 1, activePage + 1);
      
      if (activePage <= 3) {
        end = 4;
      } else if (activePage >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      pages.push(1);
      if (start > 2) {
        pages.push('...');
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  // Form & Delete States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PRODUCTION_MANAGER');
  const [plantAccessId, setPlantAccessId] = useState('');

  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchUsers();
      setLoading(false);
    };
    init();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('PRODUCTION_MANAGER');
    setPlantAccessId('');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword(''); // leave blank for no change
    setRole(u.role);
    setPlantAccessId(u.plantAccessId || '');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const openDeleteModal = (u: any) => {
    setUserToDelete(u);
    setError('');
    setDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setError('');
    try {
      setDeleteLoading(true);
      const res = await apiFetch(`/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete user.');
      }

      await fetchUsers();
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || (!editingUser && !password)) {
      setError('Name, email, and password (for new users) are required.');
      return;
    }

    try {
      setSubmitLoading(true);
      const url = editingUser ? `/admin/users/${editingUser.id}` : '/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const payload: any = {
        name,
        email,
        role,
        plantAccessId: plantAccessId || null
      };
      if (password) payload.password = password;

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Action failed.');
      }

      setSuccess(editingUser ? 'User details updated!' : 'New user created successfully!');
      await fetchUsers();
      setCurrentPage(1);
      
      setTimeout(() => {
        setModalOpen(false);
        setSuccess('');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  const roleOptions = [
    { value: 'CEO', label: 'CEO / Management' },
    { value: 'PLANT_HEAD', label: 'Plant Head' },
    { value: 'PRODUCTION_MANAGER', label: 'Production Manager' },
    { value: 'MAINTENANCE_ENGINEER', label: 'Maintenance Engineer' },
    { value: 'QUALITY_ENGINEER', label: 'Quality Engineer' },
    { value: 'ADMIN', label: 'System Admin' }
  ];

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <Users className="h-7 w-7 text-brand-blue" />
              <span>User Directory</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Manage user access configurations, security roles, and plant-level permission scopes.</p>
          </div>
          
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-brand-blue/10"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create New User</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="glass-card rounded-xl border border-gray-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Corporate Email</th>
                  <th className="px-6 py-4">Access Role</th>
                  <th className="px-6 py-4">Plant Permission</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {currentEntries.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-gray-900/40 text-gray-300">
                      <td className="px-6 py-4 font-semibold text-white">{u.name}</td>
                      <td className="px-6 py-4 font-medium text-gray-400 flex items-center space-x-1.5 py-4">
                        <Mail className="h-3.5 w-3.5 text-gray-500" />
                        <span>{u.email}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-brand-cyan uppercase tracking-wider">{u.role.replace('_', ' ')}</td>
                      <td className="px-6 py-4 font-medium text-white">
                        {u.plantAccess?.name || 'All Plants (Cross-Plant)'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => openEditModal(u)}
                            title="Edit User Profile"
                            className="p-1.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(u)}
                            title="De-register / Delete User"
                            disabled={currentUser?.id === u.id}
                            className="p-1.5 bg-gray-900 border border-gray-800 hover:border-red-900/50 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-gray-400 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalEntries > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-bg-surface border-t border-border-color gap-4 text-xs text-text-secondary">
              <div>
                Showing <span className="font-semibold text-text-primary">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-text-primary">{endIndex}</span> of{' '}
                <span className="font-semibold text-text-primary">{totalEntries}</span> entries
              </div>
              {totalPages > 1 && (
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={activePage === 1}
                    className="px-3 py-1.5 bg-bg-surface hover:bg-bg-base disabled:opacity-40 disabled:hover:bg-bg-surface border border-border-color text-text-secondary hover:text-text-primary font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {getPageNumbers().map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-2 py-1.5 text-text-secondary font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum as number)}
                        className={`px-3 py-1.5 border rounded-lg font-semibold transition-colors cursor-pointer ${
                          activePage === pageNum
                            ? 'bg-brand-blue border-brand-blue text-white hover:bg-brand-blue/90'
                            : 'bg-bg-surface border-border-color text-text-secondary hover:bg-bg-base hover:text-text-primary'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={activePage === totalPages}
                    className="px-3 py-1.5 bg-bg-surface hover:bg-bg-base disabled:opacity-40 disabled:hover:bg-bg-surface border border-border-color text-text-secondary hover:text-text-primary font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CREATE/EDIT MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{editingUser ? 'Modify User Profile' : 'Register New User'}</h3>
                <p className="text-xs text-text-secondary mt-1">Configure security credentials and site scopes.</p>
              </div>

              {error && (
                <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-lg p-3 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald rounded-lg p-3 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rahul Deshmukh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Email Address *</label>
                  <input
                    required
                    type="email"
                    placeholder="name@smartfab.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Password {editingUser && '(Leave blank to keep unchanged)'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">System Security Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors animate-none"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Plant Access */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Plant Access restrictions</label>
                  <select
                    value={plantAccessId}
                    onChange={(e) => setPlantAccessId(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors animate-none"
                  >
                    <option value="">All Plants (Cross-Plant Corporate)</option>
                    {availablePlants.map((plant) => (
                      <option key={plant.id} value={plant.id}>{plant.name}</option>
                    ))}
                  </select>
                </div>

                {/* CTA Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-border-color justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-bg-surface hover:bg-bg-base border border-border-color text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-5 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-brand-blue/10"
                  >
                    {submitLoading ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <>
                        <Shield className="h-4.5 w-4.5" />
                        <span>{editingUser ? 'Save Changes' : 'Register User'}</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModalOpen && userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div className="flex items-center space-x-3 text-brand-rose">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="text-lg font-bold text-white">De-register User Account</h3>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Are you sure you want to permanently delete user <span className="font-bold text-white">{userToDelete.name}</span> (<span className="text-brand-cyan">{userToDelete.email}</span>)? This action will revoke all security credentials and cannot be undone.
              </p>

              {error && (
                <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-lg p-3 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-border-color justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-base border border-border-color text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-red-600/10"
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete User Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
