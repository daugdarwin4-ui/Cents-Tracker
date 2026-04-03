import { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { Link } from 'react-router-dom';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/categories': 'Categories',
  '/reports': 'Reports',
  '/budget': 'Budget',
  '/investments': 'Investments',
  '/notifications': 'Notifications',
};

const Header = memo(function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Cents Tracker';
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-5
                        bg-dark-400/95 backdrop-blur-sm border-b border-dark-50">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white
                     hover:bg-dark-100 transition-colors duration-150"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-white">{title}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-gray-400 hover:text-white
                     hover:bg-dark-100 transition-colors duration-150"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary-500
                             flex items-center justify-center text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
});

export default Header;
