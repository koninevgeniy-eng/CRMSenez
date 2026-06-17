'use client';

import React from 'react';
import {
  BookOpen, Shield, Crown, ClipboardList, BarChart3, ChevronRight,
  Briefcase, ShieldCheck, Building2, Sun, Moon, Monitor,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import { EventData, DEPARTMENTS, AppDepartment, Department, UserData } from '@/lib/crm-types';

interface SidebarProps {
  activeDept: AppDepartment;
  setActiveDept: (dept: AppDepartment) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  events: EventData[];
  pendingUsers: UserData[];
  isAdmin: boolean;
  isManager: boolean;
  userDepartment: string | undefined;
  fetchPersonalData: () => void;
  fetchUsers: () => void;
  fetchPendingUsers: () => void;
}

// Department icon mapping
const deptIconMap: Record<string, React.ReactNode> = {
  dashboard: <BarChart3 className="h-5 w-5" />,
  methodology: <BookOpen className="h-5 w-5" />,
  coordination: <Shield className="h-5 w-5" />,
  agd: <Crown className="h-5 w-5" />,
  organization: <ClipboardList className="h-5 w-5" />,
  analytics: <BarChart3 className="h-5 w-5" />,
};

export function Sidebar({
  activeDept,
  setActiveDept,
  sidebarOpen,
  setSidebarOpen,
  events,
  pendingUsers,
  isAdmin,
  isManager,
  userDepartment,
  fetchPersonalData,
  fetchUsers,
  fetchPendingUsers,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  const deptIconBgColors: Record<string, string> = {
    methodology: activeDept === 'methodology' ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    coordination: activeDept === 'coordination' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    agd: activeDept === 'agd' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    organization: activeDept === 'organization' ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    analytics: activeDept === 'analytics' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    admin: activeDept === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    cabinet: activeDept === 'cabinet' ? 'bg-[#FFE0E5] text-[#E4002B] dark:bg-[#E4002B]/20 dark:text-[#FF9DAF]' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
  };

  // Determine which departments the user can see
  const visibleDepartments = DEPARTMENTS.filter(d => {
    if (d.id === 'dashboard') return true;
    if (isAdmin) return true;
    if (isManager && userDepartment === d.id) return true;
    if (!isManager && userDepartment === d.id) return true;
    return false;
  });

  return (
    <div className="flex flex-col h-full crm-sidebar-bg">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src="/logos/senezh-monogram-red.svg" alt="Сенеж" className="h-8 w-8" />
          <div>
            <img src="/logos/senezh-logo-red.svg" alt="Мастерская управления Сенеж" className="h-5" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Президентская платформа «Россия — страна возможностей»</p>
          </div>
        </div>
      </div>
      {/* Dashboard at top */}
      <nav className="px-2 pt-3 pb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`crm-sidebar-item crm-focus-ring w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                ${activeDept === 'dashboard' ? 'active text-[#E4002B] dark:text-[#FF9DAF] font-semibold' : 'text-gray-600 dark:text-gray-300'}`}
              onClick={() => { setActiveDept('dashboard'); setSidebarOpen(false); }}
            >
              <div className={`p-1.5 rounded-lg ${activeDept === 'dashboard' ? 'bg-[#FFE0E5] text-[#E4002B] dark:bg-[#E4002B]/20 dark:text-[#FF9DAF]' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                {deptIconMap['dashboard']}
              </div>
              <span className="truncate">Обзор</span>
              {activeDept === 'dashboard' && <ChevronRight className="h-3 w-3 ml-auto text-[#E4002B] dark:text-[#FF9DAF]" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Панель управления</TooltipContent>
        </Tooltip>

        {/* Personal Cabinet */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`crm-sidebar-item crm-focus-ring w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mt-0.5
                ${activeDept === 'cabinet' ? 'active text-[#E4002B] dark:text-[#FF9DAF] font-semibold' : 'text-gray-600 dark:text-gray-300'}`}
              onClick={() => { setActiveDept('cabinet'); setSidebarOpen(false); fetchPersonalData(); }}
            >
              <div className={`p-1.5 rounded-lg ${deptIconBgColors['cabinet']}`}>
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="truncate text-sm font-medium block">Мой кабинет</span>
                <span className="truncate text-[10px] text-muted-foreground block leading-tight">Личные задачи и мероприятия</span>
              </div>
              {activeDept === 'cabinet' && <ChevronRight className="h-3 w-3 ml-auto text-[#E4002B] dark:text-[#FF9DAF] shrink-0" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Личный кабинет</TooltipContent>
        </Tooltip>
      </nav>

      <div className="px-4 py-1">
        <Separator />
      </div>

      <div className="px-4 pb-1 pt-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Подразделения</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {visibleDepartments.filter(d => d.id !== 'dashboard').map(dept => (
          <Tooltip key={dept.id}>
            <TooltipTrigger asChild>
              <button
                className={`crm-sidebar-item crm-focus-ring w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  ${activeDept === dept.id ? 'active text-[#E4002B] dark:text-[#FF9DAF] font-semibold' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => { setActiveDept(dept.id); setSidebarOpen(false); }}
              >
                <div className={`p-1.5 rounded-lg ${deptIconBgColors[dept.id] || 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                  {deptIconMap[dept.id]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="truncate text-sm font-medium block">{dept.shortName}</span>
                  <span className="truncate text-[10px] text-muted-foreground block leading-tight">{dept.name.replace('Департамент ', '').replace('Аппарат ', '')}</span>
                </div>
                {activeDept === dept.id && <ChevronRight className="h-3 w-3 ml-auto text-[#E4002B] dark:text-[#FF9DAF] shrink-0" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{dept.name}</TooltipContent>
          </Tooltip>
        ))}

        {/* Admin Cabinet - only for admin */}
        {isAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`crm-sidebar-item crm-focus-ring w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  ${activeDept === 'admin' ? 'active text-red-700 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => { setActiveDept('admin'); setSidebarOpen(false); fetchUsers(); fetchPendingUsers(); }}
              >
                <div className={`p-1.5 rounded-lg ${deptIconBgColors['admin']}`}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="truncate text-sm font-medium block">Администрирование</span>
                  <span className="truncate text-[10px] text-muted-foreground block leading-tight">Управление системой</span>
                </div>
                {pendingUsers.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#E4002B] text-white text-[10px] flex items-center justify-center font-bold shrink-0">{pendingUsers.length}</span>
                )}
                {activeDept === 'admin' && pendingUsers.length === 0 && <ChevronRight className="h-3 w-3 ml-auto text-red-400 shrink-0" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Кабинет администратора</TooltipContent>
          </Tooltip>
        )}
      </nav>
      <div className="p-3 border-t bg-gray-50/50 dark:bg-gray-800/50">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Тема</span>
          <div className="flex items-center gap-1 bg-gray-200/60 dark:bg-gray-700/60 rounded-lg p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`p-1.5 rounded-md transition-all duration-200 ${theme === 'light' ? 'bg-white dark:bg-gray-600 shadow-sm text-amber-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Светлая тема</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`p-1.5 rounded-md transition-all duration-200 ${theme === 'dark' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Тёмная тема</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E4002B]" />
            <span>Мероприятий: <span className="font-semibold text-gray-700 dark:text-gray-300">{events.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Активных: <span className="font-semibold text-gray-700 dark:text-gray-300">{events.filter(e => !['completed', 'cancelled'].includes(e.status)).length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span>Завершено: <span className="font-semibold text-gray-700 dark:text-gray-300">{events.filter(e => e.status === 'completed').length}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
