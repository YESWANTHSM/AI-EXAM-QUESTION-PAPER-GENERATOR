import React from 'react';
import {
  FileText,
  HelpCircle,
  FileCheck,
  Sparkles,
  ArrowRight,
  Upload,
  Layers,
  Award,
  PieChart
} from 'lucide-react';
import { DashboardStats } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  onNavigate: (tab: any, paperId?: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, onNavigate }) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C2571B]"></div>
      </div>
    );
  }

  // Calculate percentage of difficulty
  const easyCount = stats.difficulty_dist?.Easy || 0;
  const medCount = stats.difficulty_dist?.Medium || 0;
  const hardCount = stats.difficulty_dist?.Hard || 0;
  const totalDiff = Math.max(easyCount + medCount + hardCount, 1);
  const easyPct = Math.round((easyCount / totalDiff) * 100);
  const medPct = Math.round((medCount / totalDiff) * 100);
  const hardPct = 100 - easyPct - medPct;

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Welcome Banner - Jayam Automobiles Ledger Styling */}
      <div className="relative overflow-hidden rounded-md bg-[#1C1F24] border-2 border-[#2D3128] p-8 text-[#EFE8DC] shadow-[4px_4px_0_#2D3128]">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C2571B]/20 text-[#F7F3EC] border border-[#C2571B] text-xs font-mono font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#F7F3EC]" />
            ACADEMIC ASSESSMENT LEDGER v1.0
          </div>
          <h2 className="text-3xl font-bold font-serif tracking-tight text-white mb-2">
            Automated University Examination Paper Generator
          </h2>
          <p className="text-[#EFE8DC]/85 text-sm leading-relaxed mb-6 font-normal">
            Ingest question banks, sample formats, and syllabus documents. Synthesize outcome-based examination papers strictly aligned with Bloom’s Taxonomy and Course Outcomes with 100% editable real-time control.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('generate')}
              className="btn-rust px-5 py-2.5 text-sm font-bold"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Question Paper
            </button>
            <button
              onClick={() => onNavigate('upload')}
              className="btn-secondary px-4 py-2.5 text-sm font-bold"
            >
              <Upload className="w-4 h-4 mr-2 text-[#C2571B]" />
              Upload Question Bank
            </button>
          </div>
        </div>

        {/* Subtle corner badge watermark */}
        <div className="absolute right-4 bottom-4 opacity-10 pointer-events-none select-none text-right font-serif">
          <div className="text-6xl font-bold">VSB</div>
          <div className="text-xs font-mono">AUTONOMOUS</div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="ledger-card p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-serif font-bold text-[#5B6354] uppercase tracking-wider mb-1">
              Uploaded Documents
            </div>
            <div className="text-3xl font-bold font-mono text-[#1C1F24]">
              {stats.total_documents}
            </div>
            <div className="text-xs text-[#5B6354] mt-1 flex items-center gap-1 font-mono">
              <span className="text-[#2A6E3B] font-bold">DOCX, PDF, XLSX, TXT</span> parsed
            </div>
          </div>
          <div className="w-13 h-13 rounded-md bg-[#EFE8DC] text-[#1C1F24] border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#C2571B]" />
          </div>
        </div>

        <div className="ledger-card p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-serif font-bold text-[#5B6354] uppercase tracking-wider mb-1">
              Curated Question Bank
            </div>
            <div className="text-3xl font-bold font-mono text-[#1C1F24]">
              {stats.total_questions}
            </div>
            <div className="text-xs text-[#5B6354] mt-1 flex items-center gap-1 font-mono">
              <span className="text-[#84340A] font-bold">Tagged with CO & Bloom’s</span>
            </div>
          </div>
          <div className="w-13 h-13 rounded-md bg-[#FDF5EF] text-[#84340A] border-2 border-[#C2571B] shadow-[2px_2px_0_#C2571B] flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-[#C2571B]" />
          </div>
        </div>

        <div className="ledger-card p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-serif font-bold text-[#5B6354] uppercase tracking-wider mb-1">
              Generated Exam Papers
            </div>
            <div className="text-3xl font-bold font-mono text-[#1C1F24]">
              {stats.total_papers}
            </div>
            <div className="text-xs text-[#5B6354] mt-1 flex items-center gap-1 font-mono">
              <span className="text-[#2A6E3B] font-bold">Ready for PDF / Word Export</span>
            </div>
          </div>
          <div className="w-13 h-13 rounded-md bg-[#EFF7F1] text-[#2A6E3B] border-2 border-[#2A6E3B] shadow-[2px_2px_0_#2A6E3B] flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-[#2A6E3B]" />
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Difficulty Distribution Card */}
        <div className="ledger-card p-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#2D3128]/20 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#C2571B]" />
              <h3 className="text-sm font-bold font-serif text-[#1C1F24]">Cognitive Difficulty Balance</h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#84340A]">OBE TARGET</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-serif mb-1.5">
                <span className="font-bold text-[#2A6E3B]">Easy (L1 / L2 Remember & Understand)</span>
                <span className="font-bold font-mono text-[#1C1F24]">{easyCount} ({easyPct}%)</span>
              </div>
              <div className="w-full bg-[#EFE8DC] h-3 rounded border border-[#2D3128] overflow-hidden">
                <div className="bg-[#2A6E3B] h-full transition-all duration-500" style={{ width: `${easyPct}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-serif mb-1.5">
                <span className="font-bold text-[#84340A]">Medium (L2 / L3 Apply & Analyze)</span>
                <span className="font-bold font-mono text-[#1C1F24]">{medCount} ({medPct}%)</span>
              </div>
              <div className="w-full bg-[#EFE8DC] h-3 rounded border border-[#2D3128] overflow-hidden">
                <div className="bg-[#C2571B] h-full transition-all duration-500" style={{ width: `${medPct}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-serif mb-1.5">
                <span className="font-bold text-[#1C1F24]">Hard (L4 / L5 Evaluate & Create)</span>
                <span className="font-bold font-mono text-[#1C1F24]">{hardCount} ({hardPct}%)</span>
              </div>
              <div className="w-full bg-[#EFE8DC] h-3 rounded border border-[#2D3128] overflow-hidden">
                <div className="bg-[#1C1F24] h-full transition-all duration-500" style={{ width: `${hardPct}%` }}></div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t-2 border-[#2D3128]/20 flex items-center justify-between text-xs font-mono text-[#5B6354]">
            <span>NBA Recommended:</span>
            <span className="font-bold text-[#1C1F24]">20% / 50% / 30%</span>
          </div>
        </div>

        {/* Subject-Wise Repository Card */}
        <div className="ledger-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#2D3128]/20 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C2571B]" />
              <h3 className="text-sm font-bold font-serif text-[#1C1F24]">Subject-wise Question Inventory</h3>
            </div>
            <button
              onClick={() => onNavigate('question_bank')}
              className="text-xs font-serif font-bold text-[#C2571B] hover:text-[#84340A] flex items-center gap-1"
            >
              View All Questions <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats.subject_stats.length === 0 ? (
              <div className="p-8 text-center text-[#8C9683] text-xs space-y-2">
                <p>No subjects added yet. Manually add your subjects and questions to populate your academic repository.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('generate')}
                  className="btn-rust px-3.5 py-1.5 text-xs"
                >
                  Add Subject in Wizard
                </button>
              </div>
            ) : (
              stats.subject_stats.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-md border-2 border-[#2D3128] bg-[#F7F3EC] flex items-center justify-between hover:bg-[#EFE8DC] transition-colors shadow-[2px_2px_0_#2D3128]"
                >
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 rounded bg-white border border-[#2D3128] font-mono text-xs font-bold text-[#1C1F24]">
                      {s.code}
                    </div>
                    <div>
                      <div className="text-sm font-bold font-serif text-[#1C1F24]">{s.name}</div>
                      <div className="text-xs text-[#5B6354] font-mono">Curriculum Units 1 to 5 mapped</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded bg-[#FDF5EF] text-[#84340A] text-xs font-bold font-mono border border-[#C2571B]">
                      {s.question_count} Questions
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity: Papers and Uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Generated Papers */}
        <div className="ledger-card p-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#2D3128]/20 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C2571B]" />
              <h3 className="text-sm font-bold font-serif text-[#1C1F24]">Recently Generated Papers</h3>
            </div>
            <button
              onClick={() => onNavigate('generated_papers')}
              className="text-xs font-serif font-bold text-[#C2571B] hover:text-[#84340A] flex items-center gap-1"
            >
              Browse All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.recent_papers.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#8C9683] font-mono">
              No question papers generated yet.
            </div>
          ) : (
            <div className="divide-y-2 divide-[#2D3128]/15">
              {stats.recent_papers.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <div
                      className="text-sm font-bold font-serif text-[#1C1F24] hover:text-[#C2571B] cursor-pointer"
                      onClick={() => onNavigate('editor', p.id)}
                    >
                      {p.title}
                    </div>
                    <div className="text-xs text-[#5B6354] flex items-center gap-2 mt-0.5 font-mono">
                      <span className="font-bold text-[#84340A]">{p.subject_code}</span>
                      <span>•</span>
                      <span>{p.total_marks} Marks</span>
                      <span>•</span>
                      <span>{p.date_str}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('editor', p.id)}
                    className="btn-secondary px-3 py-1.5 text-xs font-serif"
                  >
                    Open Editor
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Document Uploads */}
        <div className="ledger-card p-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#2D3128]/20 pb-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#C2571B]" />
              <h3 className="text-sm font-bold font-serif text-[#1C1F24]">Recent Uploads & Extraction</h3>
            </div>
            <button
              onClick={() => onNavigate('upload')}
              className="text-xs font-serif font-bold text-[#C2571B] hover:text-[#84340A] flex items-center gap-1"
            >
              Upload More <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.recent_uploads.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#8C9683] font-mono">
              No files uploaded yet. Drag & drop question banks to get started.
            </div>
          ) : (
            <div className="divide-y-2 divide-[#2D3128]/15">
              {stats.recent_uploads.map((u) => (
                <div key={u.id} className="py-3.5 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <div className="text-sm font-semibold font-serif text-[#1C1F24] truncate">
                      {u.filename}
                    </div>
                    <div className="text-xs text-[#5B6354] flex items-center gap-2 mt-0.5 font-mono">
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 bg-[#EFE8DC] border border-[#2D3128] rounded text-[#1C1F24]">
                        {u.file_type}
                      </span>
                      <span>{Math.round(u.file_size / 1024)} KB</span>
                      <span>•</span>
                      <span className="text-[#2A6E3B] font-bold">{u.extracted_count} questions extracted</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-[#EFF7F1] text-[#2A6E3B] border border-[#2A6E3B] flex-shrink-0">
                    Processed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
