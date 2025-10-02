'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FaHome,
  FaCar,
  FaChartPie,
  FaExchangeAlt,
  FaUser,
  FaUsers,
  FaCog,
  FaTimes,
  FaBars,
  FaChevronDown,
  FaChevronUp,
  FaUserShield,
} from 'react-icons/fa';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type NavItem = {
  name: string;
  path?: string;
  icon?: React.ReactNode;
  children?: { name: string; path: string; icon?: React.ReactNode }[];
};

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState<boolean>(isOpen);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  // handleClose memoizado para evitar recreación en cada render
  const handleClose = useCallback(() => {
    setOpen(false);
    if (onClose) onClose();
  }, [onClose]);

  // Escuchar Escape para cerrar — dependencias estables
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open, handleClose]);

  const navItems: NavItem[] = [
    { name: t('sidebar.home'), path: '/dashboard', icon: <FaHome /> },
    { name: t('sidebar.summary'), path: '/dashboard/summary', icon: <FaChartPie /> },
    { name: t('sidebar.vehicles'), path: '/dashboard/vehicles', icon: <FaCar /> },
    { name: t('sidebar.movements'), path: '/dashboard/movements', icon: <FaExchangeAlt /> },
    {
      name: t('sidebar.users'),
      icon: <FaUsers />,
      children: [
        { name: t('sidebar.all'), path: '/dashboard/users', icon: <FaUsers /> },
        { name: t('sidebar.roles'), path: '/dashboard/users/roles', icon: <FaUserShield /> },
      ],
    },
    { name: t('sidebar.profile'), path: '/dashboard/profile', icon: <FaUser /> },
    { name: t('sidebar.configuration'), path: '/dashboard/configuration', icon: <FaCog /> },
  ];

  const handleToggle = () => setOpen((v) => !v);

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <>
      {/* Botón hamburguesa (solo visible si sidebar está cerrado) */}
      {!open && (
        <button
          onClick={handleToggle}
          aria-label={t('sidebar.openMenu')}
          className="fixed top-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-lg shadow-md hover:bg-blue-700 transition"
        >
          <FaBars size={20} />
        </button>
      )}

      {/* Overlay: sutil y con blur */}
      {open && (
        <div
          aria-hidden="true"
          onClick={handleClose}
          className="fixed inset-0 z-30 flex items-start"
        >
          <div
            className="absolute inset-0 w-full h-full transition-colors duration-200 ease-in-out bg-black/10 dark:bg-white/5 backdrop-blur-sm"
            style={{ willChange: 'background-color, opacity' }}
          />
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 shadow-lg transform ${open ? 'translate-x-0' : '-translate-x-full'
          } transition-transform duration-300 ease-in-out z-40`}
        aria-hidden={!open}
      >
        {/* Header con logo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={72} height={72} priority className="rounded-md" />
            <div>
              <span className="text-lg font-bold text-gray-800 dark:text-white">{t('sidebar.appName')}</span>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('sidebar.adminPanel')}</div>
            </div>
          </div>

          <button onClick={handleToggle} aria-label={t('sidebar.closeMenu') ?? 'Cerrar menú'} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="mt-6 px-2 space-y-2 overflow-y-auto h-[calc(100vh-80px)]" aria-label={t('sidebar.nav') ?? 'Main navigation'}>
          {navItems.map((item) => {
            const isActive = item.path ? pathname === item.path : false;

            if (item.children && item.children.length > 0) {
              const groupOpen = !!openGroups[item.name];
              const childActive = item.children.some((c) => pathname === c.path);

              return (
                <div key={item.name} className="px-2">
                  <button
                    onClick={() => toggleGroup(item.name)}
                    aria-expanded={groupOpen}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition ${childActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                    <span>{groupOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                  </button>

                  {groupOpen && (
                    <div className="mt-2 ml-4 space-y-1">
                      {item.children.map((child) => {
                        const childIsActive = pathname === child.path;
                        return (
                          <Link
                            key={child.path ?? child.name}
                            href={child.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${childIsActive
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            onClick={handleClose}
                          >
                            <span className="text-base">{child.icon}</span>
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path ?? item.name}
                href={item.path ?? '#'}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition mx-2 ${isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                onClick={handleClose}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
