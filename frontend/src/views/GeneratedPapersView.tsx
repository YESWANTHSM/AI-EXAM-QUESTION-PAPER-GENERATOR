import React from 'react';
import {
  FileCheck2,
  FileText,
  Download,
  Edit3,
  Calendar,
  Sparkles
} from 'lucide-react';
import { GeneratedPaper } from '../types';
import { api } from '../api';

interface GeneratedPapersViewProps {
  papers: GeneratedPaper[];
  onOpenEditor: (paperId: number) => void;
  onNavigateToWizard: () => void;
}

export const GeneratedPapersView: React.FC<GeneratedPapersViewProps> = ({
  papers,
  onOpenEditor,
  onNavigateToWizard
}) => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="ledger-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-[#1C1F24]">Archived Examination Question Papers</h2>
          <p className="text-xs text-[#5B6354]">
            View, revise, and download final examination papers in official PDF and Word formats.
          </p>
        </div>

        <button
          onClick={onNavigateToWizard}
          className="btn-rust px-4 py-2.5 text-xs font-bold"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          Generate New Paper
        </button>
      </div>

      {/* Papers Grid */}
      {papers.length === 0 ? (
        <div className="ledger-card p-12 text-center space-y-4">
          <FileCheck2 className="w-12 h-12 text-[#8C9683] mx-auto" />
          <h3 className="text-base font-bold font-serif text-[#1C1F24]">No Generated Papers Found</h3>
          <p className="text-xs text-[#5B6354] max-w-sm mx-auto">
            Use the Question Paper Generation Wizard to assemble your first balanced university examination paper.
          </p>
          <button
            onClick={onNavigateToWizard}
            className="btn-rust px-4 py-2 text-xs font-bold"
          >
            Launch Generation Wizard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {papers.map((p) => (
            <div
              key={p.id}
              className="ledger-card p-6 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FDF5EF] text-[#84340A] border border-[#C2571B]">
                    {p.exam_code}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-[#5B6354] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#8C9683]" />
                    {p.date_str || 'Nov 2026'}
                  </span>
                </div>

                <div>
                  <h3
                    className="text-base font-bold font-serif text-[#1C1F24] group-hover:text-[#C2571B] transition-colors line-clamp-1 cursor-pointer"
                    onClick={() => onOpenEditor(p.id)}
                  >
                    {p.title}
                  </h3>
                  <div className="text-xs text-[#5B6354] font-medium mt-0.5 font-serif">
                    {p.subject_code} • {p.subject_name}
                  </div>
                </div>

                <div className="p-3 rounded-md bg-[#F7F3EC] border border-[#2D3128] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#5B6354] block text-[11px] font-serif">Maximum Marks</span>
                    <span className="font-bold text-[#1C1F24] text-sm font-mono">{p.total_marks}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5B6354] block text-[11px] font-serif">Duration</span>
                    <span className="font-bold font-mono text-[#1C1F24]">{p.duration_minutes} Mins</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5B6354] block text-[11px] font-serif">Engine</span>
                    <span className="font-bold text-[#84340A] uppercase text-[10px] font-mono">
                      {p.generation_mode === 'bank' ? 'Bank Mode' : 'AI Synth'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t-2 border-[#2D3128]/20 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenEditor(p.id)}
                  className="btn-rust flex-1 py-2 px-3 text-xs font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Open Editor
                </button>

                <a
                  href={api.getPdfExportUrl(p.id)}
                  download
                  className="btn-secondary p-2 text-xs"
                  title="Download PDF Exam Paper"
                >
                  <Download className="w-4 h-4 text-[#C2571B]" />
                </a>

                <a
                  href={api.getDocxExportUrl(p.id)}
                  download
                  className="btn-secondary p-2 text-xs"
                  title="Download Word Document"
                >
                  <FileText className="w-4 h-4 text-[#1C1F24]" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
