'use client';

import { useEffect, useState } from 'react';
import { FaEye, FaEdit, FaTrash, FaSearch, FaTimes } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
  document?: string;
  registeredAt?: string;
};

const mockUsers: User[] = [
  { id: 1, name: 'Juan Pérez', email: 'juan@example.com', role: 'usuario', document: '12345678', registeredAt: '2025-08-19' },
  { id: 2, name: 'María López', email: 'maria@example.com', role: 'usuario', document: '87654321', registeredAt: '2025-08-19' },
  { id: 3, name: 'Carlos Gómez', email: 'carlos@example.com', role: 'usuario', document: '11223344', registeredAt: '2025-08-18' },
  { id: 4, name: 'Ana Fernández', email: 'ana@example.com', role: 'editor', document: '55667788', registeredAt: '2025-08-17' },
  { id: 5, name: 'Pedro García', email: 'pedro@example.com', role: 'admin', document: '99001122', registeredAt: '2025-08-16' },
];

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('users');
      if (stored) {
        setUsers(JSON.parse(stored));
      } else {
        localStorage.setItem('users', JSON.stringify(mockUsers));
        setUsers(mockUsers);
      }
    } catch (err) {
      console.error('Error loading users from storage', err);
      setUsers(mockUsers);
    }
  }, []);

  const persist = (next: User[]) => {
    setUsers(next);
    localStorage.setItem('users', JSON.stringify(next));
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(query.toLowerCase()) ||
      (u.document || '').includes(query)
  );

  const handleView = (u: User) => {
    setSelected(u);
    setIsViewing(true);
    setIsEditing(false);
  };

  const handleEdit = (u: User) => {
    setSelected(u);
    setEditForm({ ...u });
    setIsEditing(true);
    setIsViewing(false);
  };

  const handleDelete = (id: number) => {
    const ok = confirm(t('users.deleteConfirm'));
    if (!ok) return;
    const next = users.filter((u) => u.id !== id);
    persist(next);
    if (selected?.id === id) {
      setSelected(null);
      setIsViewing(false);
      setIsEditing(false);
    }
    alert(t('users.userDeleted'));
  };

  const handleSave = () => {
    if (!selected) return;
    if (!editForm.name || !editForm.email) {
      alert(t('users.nameRequired'));
      return;
    }
    const next = users.map((u) => (u.id === selected.id ? { ...u, ...editForm } as User : u));
    persist(next);
    setIsEditing(false);
    setSelected(next.find((x) => x.id === selected.id) || null);
    alert(t('users.changesSaved'));
  };

  const closeModal = () => {
    setIsViewing(false);
    setIsEditing(false);
    setSelected(null);
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('users.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('users.subtitle')}</p>
        </div>

        <div className="w-full sm:w-80 relative">
          <label className="sr-only" htmlFor="search-input">{t('users.searchLabel')}</label>
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FaSearch />
          </span>
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="placeholder:italic placeholder:text-slate-400 block w-full border border-slate-200 rounded-md py-2 pl-10 pr-3 shadow-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        {/* Desktop Table (Visible on md and larger screens) */}
        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('users.nameColumn')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('users.emailColumn')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('users.documentColumn')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('users.roleColumn')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('users.actionsColumn')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                    {t('users.noUsersFound')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-100">{u.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{u.document || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{u.role || t('users.userRole')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                      <button onClick={() => handleView(u)} className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100" title={t('users.view')}>
                        <FaEye />
                      </button>
                      <button onClick={() => handleEdit(u)} className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white" title={t('users.edit')}>
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-2 rounded-md bg-red-600 hover:bg-red-700 text-white" title={t('users.delete')}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (Visible on screens smaller than md) */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">{t('users.noUsersFound')}</div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="p-4 flex flex-col gap-2 bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-base font-semibold text-gray-800 dark:text-gray-100">{u.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-300">{u.email}</div>
                    <div className="text-xs text-gray-400 mt-1 dark:text-gray-400">{t('users.document')}: {u.document || '-'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-gray-500 dark:text-gray-300">{u.role || t('users.userRole')}</div>
                    <div className="flex gap-2">
                      <button onClick={() => handleView(u)} className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100" title={t('users.view')}>
                        <FaEye />
                      </button>
                      <button onClick={() => handleEdit(u)} className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" title={t('users.edit')}>
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700" title={t('users.delete')}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal (view / edit) */}
      {(isViewing || isEditing) && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />

          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 z-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {isEditing ? t('users.editUser') : t('users.userDetails')}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <FaTimes size={20} />
              </button>
            </div>

            {isViewing && (
              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p><span className="font-medium">{t('users.name')}:</span> {selected.name}</p>
                <p><span className="font-medium">{t('users.email')}:</span> {selected.email}</p>
                <p><span className="font-medium">{t('users.document')}:</span> {selected.document || '-'}</p>
                <p><span className="font-medium">{t('users.role')}:</span> {selected.role || t('users.userRole')}</p>
                <p><span className="font-medium">{t('users.registeredAt')}:</span> {selected.registeredAt || '-'}</p>
              </div>
            )}

            {isEditing && (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('users.name')}</span>
                  <input
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('users.email')}</span>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('users.document')}</span>
                  <input
                    value={editForm.document || ''}
                    onChange={(e) => setEditForm((s) => ({ ...s, document: e.target.value }))}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('users.role')}</span>
                  <input
                    value={editForm.role || ''}
                    onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    placeholder={t('users.rolePlaceholder')}
                  />
                </label>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">{t('users.cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition">{t('users.save')}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}