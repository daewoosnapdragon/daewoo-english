'use client';

import { FilterState, CATEGORIES, CATEGORY_LABELS, GRADE_LEVELS } from '@/types';
import Icon, { CATEGORY_ICON_MAP } from './Icon';

interface SidebarProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  resourceCounts: Record<string, number>;
  activeView: string;
  setActiveView: (view: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  onSignOut: () => void;
}

export default function Sidebar({ filters, setFilters, resourceCounts, activeView, setActiveView, collapsed, setCollapsed, onSignOut }: SidebarProps) {
  const setFilter = (key: keyof FilterState, value: any) => setFilters({ ...filters, [key]: value });

  const clearFilters = () => setFilters({
    search: '', category: '', resource_type: '', grade_level: '',
    curriculum: '', topic: '', reading_skill: '',
    favorites_only: false, collection_id: '', tag_id: '',
  });

  const goToView = (view: string) => { clearFilters(); setActiveView(view); };

  const goToCategory = (cat: string) => {
    setActiveView('library');
    setFilters({ ...filters, category: filters.category === cat ? '' : cat, favorites_only: false });
  };

  const hasActiveFilter = Object.entries(filters).some(([k, v]) => v && k !== 'search' && v !== false);
  const w = collapsed ? 'w-14' : 'w-56';

  return (
    <aside className={`${w} bg-white border-r border-sand-200 h-screen overflow-y-auto flex flex-col flex-shrink-0 transition-all duration-200`}>
      {/* Logo + collapse */}
      <div className="p-3 border-b border-sand-200 flex items-center gap-2">
        <div className="w-8 h-8 bg-vault-500 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
          <Icon name={collapsed ? 'menu' : 'library_books'} size={18} className="text-white" />
        </div>
        {!collapsed && <h1 className="font-bold text-sm text-gray-900 truncate">TeacherVault</h1>}
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        <NavBtn icon="folder" label="All" active={activeView === 'library' && !hasActiveFilter && !filters.favorites_only}
          onClick={() => goToView('library')} collapsed={collapsed} count={resourceCounts.total} />

        <NavBtn icon="book" label="Into Reading" active={activeView === 'into_reading'}
          onClick={() => goToView('into_reading')} collapsed={collapsed} count={resourceCounts.into_reading} accent />

        <NavBtn icon="star" label="Favorites" active={activeView === 'library' && filters.favorites_only}
          onClick={() => { setActiveView('library'); clearFilters(); setFilter('favorites_only', true); }}
          collapsed={collapsed} count={resourceCounts.favorites} />

        <NavBtn icon="schedule" label="Recent" active={activeView === 'recent'}
          onClick={() => goToView('recent')} collapsed={collapsed} />

        {!collapsed && <div className="pt-2 pb-1"><p className="text-[9px] font-bold text-sand-400 uppercase tracking-widest px-2">Category</p></div>}
        {collapsed && <div className="border-t border-sand-100 my-1" />}

        {CATEGORIES.map(cat => (
          <NavBtn key={cat} icon={CATEGORY_ICON_MAP[cat] || 'folder'} label={CATEGORY_LABELS[cat]}
            active={activeView === 'library' && filters.category === cat}
            onClick={() => goToCategory(cat)} collapsed={collapsed} count={resourceCounts[cat]} />
        ))}

        {!collapsed && (
          <>
            <div className="pt-2 pb-1"><p className="text-[9px] font-bold text-sand-400 uppercase tracking-widest px-2">Grade</p></div>
            <div className="flex flex-wrap gap-1 px-1">
              {GRADE_LEVELS.map(g => (
                <button key={g} onClick={() => { setActiveView('library'); setFilter('grade_level', filters.grade_level === g ? '' : g); }}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                    filters.grade_level === g ? 'bg-vault-500 text-white' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                  }`}>
                  {g === 'K' ? 'K' : g}
                </button>
              ))}
            </div>
          </>
        )}

        {!collapsed && hasActiveFilter && (
          <button onClick={() => { clearFilters(); setActiveView('library'); }}
            className="w-full mt-2 px-2 py-1.5 text-[10px] text-vault-600 bg-vault-50 hover:bg-vault-100 rounded-lg font-medium flex items-center gap-1 justify-center">
            <Icon name="close" size={12} /> Clear filters
          </button>
        )}
      </nav>

      <div className="p-2 border-t border-sand-200">
        <NavBtn icon="logout" label="Sign Out" active={false} onClick={onSignOut} collapsed={collapsed} />
      </div>
    </aside>
  );
}

function NavBtn({ icon, label, active, onClick, collapsed, count, accent }: {
  icon: string; label: string; active: boolean; onClick: () => void;
  collapsed: boolean; count?: number; accent?: boolean;
}) {
  return (
    <button onClick={onClick} title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-2 rounded-lg transition-colors text-left ${
        collapsed ? 'justify-center p-2' : 'px-2 py-1.5'
      } ${active
        ? accent ? 'bg-vault-100 text-vault-800' : 'bg-vault-50 text-vault-700'
        : accent ? 'text-vault-700 hover:bg-vault-50' : 'text-gray-600 hover:bg-sand-50'
      }`}>
      <Icon name={icon} size={18} filled={active}
        className={active ? 'text-vault-600' : accent ? 'text-vault-500' : 'text-sand-500'} />
      {!collapsed && (
        <>
          <span className="flex-1 text-xs font-medium truncate">{label}</span>
          {count !== undefined && count > 0 && <span className="text-[9px] text-sand-400">{count}</span>}
        </>
      )}
    </button>
  );
}
