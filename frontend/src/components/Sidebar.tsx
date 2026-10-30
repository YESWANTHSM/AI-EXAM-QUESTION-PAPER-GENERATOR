import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  Sparkles,
  FileEdit,
  FileCheck2,
  Settings,
  GraduationCap,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'upload'
  | 'question_bank'
  | 'generate'
  | 'editor'
  | 'generated_papers'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activePaperId: number | null;
  stats?: {
    total_questions?: number;
    total_papers?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activePaperId,
  stats
}) => {
  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'upload' as TabType,
      label: 'Upload Documents',
      icon: UploadCloud,
      badge: 'Auto-Parse'
    },
    {
      id: 'question_bank' as TabType,
      label: 'Question Bank',
      icon: Database,
      badge: stats?.total_questions ? `${stats.total_questions} Qs` : null
    },
    {
      id: 'generate' as TabType,
      label: 'Generate Paper',
      icon: Sparkles,
      badge: 'AI Wizard',
      highlight: true
    },
    {
      id: 'editor' as TabType,
      label: 'Paper Editor',
      icon: FileEdit,
      badge: activePaperId ? 'Active' : null,
      sublabel: activePaperId ? `Paper #${activePaperId}` : 'Select or Generate'
    },
    {
      id: 'generated_papers' as TabType,
      label: 'Generated Papers',
      icon: FileCheck2,
      badge: stats?.total_papers ? `${stats.total_papers}` : null
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="w-72 bg-[#1C1F24] text-[#EFE8DC] border-r-2 border-[#2D3128] shadow-[2px_0_0_#2D3128] flex flex-col flex-shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b-2 border-[#2D3128] bg-[#171A1E] flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-[#C2571B] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-base font-bold font-serif text-[#F7F3EC] tracking-tight flex items-center gap-1.5">
            AutoExam <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C2571B]/30 text-[#F7F3EC] font-mono font-bold border border-[#C2571B]">LEDGER</span>
          </div>
          <div className="text-xs text-[#8C9683] font-medium">Academic Assessment System</div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="p-4">
        <button
          onClick={() => onSelectTab('generate')}
          className="w-full py-2.5 px-3.5 rounded-md bg-[#C2571B] hover:bg-[#A64612] text-white font-serif font-bold text-sm flex items-center justify-between border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#2D3128] transition-all group"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-200" />
            Quick Generate (50M)
          </span>
          <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1.5 py-2 overflow-y-auto">
        <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-[#8C9683] uppercase font-mono">
          Assessment Ledger
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-sm font-semibold transition-all duration-150 text-left ${
                isActive
                  ? 'bg-[#F7F3EC] text-[#1C1F24] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128]'
                  : 'text-[#EFE8DC]/85 hover:text-white hover:bg-[#282D34] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-[#C2571B]' : 'text-[#8C9683]'
                  }`}
                />
                <div className="truncate">
                  <div className={isActive ? 'font-serif font-bold text-[#1C1F24]' : 'font-medium'}>
                    {item.label}
                  </div>
                  {item.sublabel && (
                    <div className={`text-[11px] truncate font-mono ${isActive ? 'text-[#5B6354]' : 'text-[#8C9683]'}`}>
                      {item.sublabel}
                    </div>
                  )}
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-tight flex-shrink-0 border ${
                    isActive
                      ? 'bg-[#C2571B] text-white border-[#84340A]'
                      : item.highlight
                      ? 'bg-[#C2571B]/20 text-[#F7F3EC] border-[#C2571B]/60'
                      : 'bg-[#282D34] text-[#8C9683] border-[#2D3128]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Accreditation & Academic Badge */}
      <div className="p-4 border-t-2 border-[#2D3128] bg-[#171A1E]">
        <div className="p-3 rounded-md bg-[#282D34] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] text-xs text-[#EFE8DC] flex items-start gap-2.5">
          <BookOpen className="w-4 h-4 text-[#C2571B] mt-0.5 flex-shrink-0" />
          <div className="leading-snug">
            <span className="font-serif font-bold text-[#F7F3EC] block text-[11px]">OBE & Bloom's Compliant</span>
            <span className="text-[#8C9683] text-[11px]">
              V.S.B. Autonomous & Anna University Examination Blueprint Standards
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
