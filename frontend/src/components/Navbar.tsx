import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  GraduationCap
} from 'lucide-react';
import { TabType } from './Sidebar';

interface NavbarProps {
  currentTab: TabType;
  institutionName?: string;
  departmentName?: string;
}

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Academic Assessment Ledger',
    subtitle: 'Question repository metrics, syllabus unit distribution, and active question papers'
  },
  upload: {
    title: 'Document Ingestion & Multi-Format Parsing',
    subtitle: 'Upload Question Banks, Previous Exams, Question Sets (.docx, .pdf, .txt, .xlsx)'
  },
  question_bank: {
    title: 'Central Academic Question Bank',
    subtitle: 'Filter, curate, and batch import questions mapped to Bloom’s Taxonomy and Course Outcomes'
  },
  generate: {
    title: 'Question Paper Generation Wizard',
    subtitle: 'Automated 50M & 100M blueprint assembly with Part A, B, and C Either/Or partitions'
  },
  editor: {
    title: 'Interactive Document-Style Paper Editor',
    subtitle: 'V.S.B. Autonomous exam paper layout with instant question replacement, AI regen, and marks recalculation'
  },
  generated_papers: {
    title: 'Examination Paper Repository',
    subtitle: 'Archived test blueprints ready for print preview, Word (.docx), and PDF generation'
  },
  settings: {
    title: 'Institution & Blueprint Configurations',
    subtitle: 'Configure college headers, autonomous regulations, and question bank parameters'
  }
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  institutionName = "V.S.B. ENGINEERING COLLEGE (AUTONOMOUS)",
  departmentName = "DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE"
}) => {
  const info = TAB_TITLES[currentTab] || { title: 'Question Paper Generator', subtitle: '' };

  return (
    <header className="h-20 bg-[#F7F3EC] border-b-2 border-[#2D3128] shadow-[0_2px_0_#2D3128] px-8 flex items-center justify-between flex-shrink-0 z-10 sticky top-0">
      <div>
        <h1 className="text-xl font-bold font-serif text-[#1C1F24] tracking-tight leading-tight">
          {info.title}
        </h1>
        <p className="text-xs text-[#5B6354] font-medium leading-normal">
          {info.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Institution Stamp */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#EFE8DC] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] text-xs text-[#1C1F24]">
          <Building2 className="w-3.5 h-3.5 text-[#C2571B] flex-shrink-0" />
          <span className="font-bold font-serif tracking-tight truncate max-w-[280px]">{institutionName}</span>
        </div>

        {/* Demo Mode / AI Status */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#EFF7F1] border-2 border-[#2A6E3B] shadow-[2px_2px_0_#2A6E3B] text-[#2A6E3B] text-xs font-mono font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2A6E3B]" />
          <span>AUTONOMOUS OBE ACTIVE</span>
        </div>

        {/* Faculty User Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l-2 border-[#2D3128]/30">
          <div className="w-9 h-9 rounded-md bg-[#C2571B] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] text-white font-serif font-bold text-xs flex items-center justify-center">
            COE
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold font-serif text-[#1C1F24] leading-tight">Exam Controller</div>
            <div className="text-[11px] text-[#5B6354] font-mono leading-tight">Autonomous Board</div>
          </div>
        </div>
      </div>
    </header>
  );
};
