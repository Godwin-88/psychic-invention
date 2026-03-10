import { useNavigate, useLocation } from 'react-router-dom';
import { menuItems, type MenuItem } from './navConfig';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(item: MenuItem) {
    if (item.path === '/transact') return location.pathname === '/transact';
    return location.pathname.startsWith(item.path);
  }

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out shrink-0 ${
        collapsed ? 'w-16' : 'w-52'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-6 z-10 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center text-sm"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Platform label */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-4 border-b border-slate-800">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Quanti🔥 Platform</p>
        </div>
      )}
      {collapsed && <div className="h-14 border-b border-slate-800" />}

      {/* Primary nav rail — no inline sub-items; sub-nav lives in the second panel */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {menuItems.map(item => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mx-1.5 transition-all duration-150 text-left ${
                collapsed ? 'justify-center' : ''
              } ${
                active
                  ? 'bg-blue-600/15 text-blue-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              style={{ width: 'calc(100% - 12px)' }}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom status */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Platform Active</span>
          </div>
        </div>
      )}
    </aside>
  );
};
