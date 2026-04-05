import { useState, useCallback, memo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  BarChart3,
  Wallet,
  TrendingUp,
  Bell,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
  { to: '/investments', icon: TrendingUp, label: 'Investments' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/checklist', icon: ClipboardList, label: 'Checklist' },
];

const Sidebar = memo(function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    await signOut();
    success('Signed out successfully');
    navigate('/login');
  }, [signOut, success, navigate]);

  const sidebarContent = (
    <div className={`h-full flex flex-col bg-dark-400 border-r border-dark-50 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-dark-50 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <DollarSign size={15} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-base text-white tracking-tight">Cents Tracker</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all duration-150 group
               ${collapsed ? 'justify-center' : ''}
               ${
                 isActive
                   ? 'bg-primary-950 text-primary-400 font-medium'
                   : 'text-gray-400 hover:bg-dark-100 hover:text-gray-100'
               }`
            }
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className={`p-3 border-t border-dark-50 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && (
          <div className="px-2 py-2 mb-1">
            <p className="text-xs text-gray-500 truncate">Signed in as</p>
            <p className="text-xs font-medium text-gray-300 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={`flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs
                      transition-colors duration-150 px-2 py-1.5 rounded-lg hover:bg-dark-100
                      ${collapsed ? 'justify-center w-full' : 'w-full'}`}
        >
          <LogOut size={15} />
          {!collapsed && 'Sign out'}
        </button>
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="hidden md:flex items-center justify-center h-9 border-t border-dark-50
                   text-gray-500 hover:text-primary-400 hover:bg-dark-100 transition-colors duration-150"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 md:hidden animate-slide-in">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
});

export default Sidebar;
