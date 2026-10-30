import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Subject, Template } from '../types';
import { api } from '../api';
import { SubjectModal } from '../components/SubjectModal';

interface GeneratePaperWizardViewProps {
  subjects: Subject[];
  templates: Template[];
  onPaperGenerated: (paperId: number) => void;
  onRefreshStats: () => void;
  onSubjectAdded?: (subject: Subject) => void;
}

export const GeneratePaperWizardView: React.FC<GeneratePaperWizardViewProps> = ({
  subjects,
  templates,
  onPaperGenerated,
  onRefreshStats
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(subjects[0]?.id || 0);
  const [selectedUnits, setSelectedUnits] = useState<number[]>([1, 2, 3, 4, 5]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(templates[0]?.id || 1);
  const [durationMinutes, setDurationMinutes] = useState<number>(100);
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [generationMode, setGenerationMode] = useState<'bank' | 'ai'>('bank');

  // Subject Modal state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Partial<Subject> | null>(null);

  // Difficulty sliders (percentages)
  const [easyPct, setEasyPct] = useState<number>(30);
  const [medPct, setMedPct] = useState<number>(50);
  const [hardPct, setHardPct] = useState<number>(20);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (s: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(s);
    setIsSubjectModalOpen(true);
  };

  const handleDeleteSubject = async (s: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete subject "${s.name}" (${s.code}) and all its questions?`)) {
      try {
        await api.deleteSubject(s.id);
        onRefreshStats();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSubjectSaved = (saved: Subject) => {
    setSelectedSubjectId(saved.id);
    onRefreshStats();
  };

  const toggleUnit = (u: number) => {
    if (selectedUnits.includes(u)) {
      if (selectedUnits.length > 1) {
        setSelectedUnits(selectedUnits.filter((x: number) => x !== u));
      }
    } else {
      setSelectedUnits([...selectedUnits, u].sort());
    }
  };

  const selectAllUnits = () => {
    setSelectedUnits([1, 2, 3, 4, 5]);
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!selectedSubjectId || subjects.length === 0) {
        setErrorMessage('Please add or select a subject to proceed.');
        return;
      }
    }
    if (currentStep === 2 && selectedUnits.length === 0) {
      setErrorMessage('Please select at least one syllabus unit.');
      return;
    }
    setCurrentStep((prev: number) => Math.min(prev + 1, 6));
  };

  const handlePrev = () => {
    setErrorMessage(null);
    setCurrentStep((prev: number) => Math.max(prev - 1, 1));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const payload = {
        subject_id: selectedSubjectId,
        selected_units: selectedUnits,
        template_id: selectedTemplateId,
        duration_minutes: durationMinutes,
        generation_mode: generationMode,
        difficulty_distribution: {
          Easy: easyPct,
          Medium: medPct,
          Hard: hardPct
        }
      };

      const result = await api.generatePaper(payload);

      if (result.success && result.paper_id) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        onRefreshStats();
        setTimeout(() => {
          onPaperGenerated(result.paper_id);
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Generation failed. Please verify subject questions.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Step Progress Stepper - Jayam Ledger Styling */}
      <div className="ledger-card p-6">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Subject' },
            { num: 2, label: 'Units' },
            { num: 3, label: 'Pattern' },
            { num: 4, label: 'Metrics' },
            { num: 5, label: 'Mode' },
            { num: 6, label: 'Review' }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold border-2 transition-all ${
                  currentStep === s.num
                    ? 'bg-[#C2571B] text-white border-[#2D3128] shadow-[2px_2px_0_#2D3128]'
                    : currentStep > s.num
                    ? 'bg-[#2A6E3B] text-white border-[#2D3128]'
                    : 'bg-[#EFE8DC] text-[#5B6354] border-[#2D3128]/40'
                }`}
              >
                {currentStep > s.num ? <Check className="w-4 h-4 text-white" /> : s.num}
              </div>
              <span
                className={`text-xs hidden md:inline font-serif font-bold ${
                  currentStep === s.num ? 'text-[#C2571B]' : 'text-[#5B6354]'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-md bg-[#FAF0F0] border-2 border-rose-600 text-rose-800 text-xs font-bold font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Step Content */}
      <div className="ledger-card p-8 min-h-[420px] flex flex-col justify-between">
        {/* STEP 1: SELECT SUBJECT */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2D3128]/20 pb-4">
              <div>
                <h3 className="text-lg font-bold font-serif text-[#1C1F24]">Step 1: Select Examination Subject</h3>
                <p className="text-xs text-[#5B6354]">
                  Select your course or manually add your subject name and particulars below.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddSubject}
                className="btn-rust px-4 py-2 text-xs"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add New Subject
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="p-10 rounded-md border-2 border-dashed border-[#2D3128] bg-[#F7F3EC] text-center space-y-4">
                <div className="w-14 h-14 rounded-md bg-[#FDF5EF] border-2 border-[#C2571B] text-[#C2571B] flex items-center justify-center mx-auto shadow-[2px_2px_0_#C2571B]">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-serif text-[#1C1F24]">No Subjects Added Yet</h4>
                  <p className="text-xs text-[#5B6354] max-w-md mx-auto mt-1">
                    Please manually add your subject name, course code, semester, and department to begin assembling your examination question paper.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddSubject}
                  className="btn-rust px-5 py-2.5 text-xs font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Your Subject Details
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((s) => {
                  const isSelected = selectedSubjectId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`p-5 rounded-md border-2 cursor-pointer transition-all relative group shadow-[2px_2px_0_#2D3128] ${
                        isSelected
                          ? 'border-[#C2571B] bg-[#FDF5EF] shadow-[2px_2px_0_#C2571B]'
                          : 'border-[#2D3128] hover:border-[#2D3128] bg-white hover:bg-[#FDFBF7]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24]">
                          {s.code}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditSubject(s, e)}
                            className="p-1 rounded bg-white hover:bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24] transition-colors"
                            title="Edit Subject Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSubject(s, e)}
                            className="p-1 rounded bg-white hover:bg-rose-50 border border-rose-600 text-rose-700 transition-colors"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-[#C2571B] ml-1" />
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-bold font-serif text-[#1C1F24] mb-1">{s.name}</div>
                      <div className="text-xs text-[#5B6354] line-clamp-2 mb-3">
                        {s.description || `${s.department} • ${s.regulation}`}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-[#84340A]">
                        Semester {s.semester} • {s.question_count || 0} Questions in Bank
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SELECT UNITS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-[#2D3128]/20 pb-4">
              <div>
                <h3 className="text-lg font-bold font-serif text-[#1C1F24]">Step 2: Select Syllabus Units</h3>
                <p className="text-xs text-[#5B6354]">
                  Select which units to test. Questions will be balanced evenly across selected units.
                </p>
              </div>
              <button
                onClick={selectAllUnits}
                className="text-xs font-serif font-bold text-[#C2571B] hover:text-[#84340A] underline"
              >
                Select All 5 Units
              </button>
            </div>

            <div className="space-y-3">
              {[
                { u: 1, title: 'Unit I: Foundational Concepts & Linear Formulations' },
                { u: 2, title: 'Unit II: Hierarchical Data Models & Tree Structures' },
                { u: 3, title: 'Unit III: Graph Algorithms & Network Traversal' },
                { u: 4, title: 'Unit IV: Sorting, Hashing & Storage Optimization' },
                { u: 5, title: 'Unit V: Algorithm Design, Dynamic Systems & Case Studies' }
              ].map(({ u, title }) => {
                const isChecked = selectedUnits.includes(u);
                return (
                  <div
                    key={u}
                    onClick={() => toggleUnit(u)}
                    className={`p-4 rounded-md border-2 flex items-center justify-between cursor-pointer transition-all shadow-[2px_2px_0_#2D3128] ${
                      isChecked
                        ? 'border-[#C2571B] bg-[#FDF5EF]'
                        : 'border-[#2D3128] hover:border-[#2D3128] bg-white hover:bg-[#FDFBF7]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold border ${
                          isChecked ? 'bg-[#C2571B] border-[#84340A] text-white' : 'border-[#2D3128] bg-white text-[#5B6354]'
                        }`}
                      >
                        {isChecked ? <Check className="w-3.5 h-3.5 text-white" /> : u}
                      </div>
                      <span className="text-sm font-bold font-serif text-[#1C1F24]">{title}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#84340A]">
                      CO{u} Mapped
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: EXAMINATION PATTERN */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b-2 border-[#2D3128]/20 pb-4">
              <h3 className="text-lg font-bold font-serif text-[#1C1F24]">Step 3: Select Examination Pattern</h3>
              <p className="text-xs text-[#5B6354]">
                Choose the institutional blueprint matching Anna University Autonomous regulations or Continuous Internal Assessment.
              </p>
            </div>

            <div className="space-y-4">
              {templates.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setTotalMarks(tmpl.total_marks);
                      setDurationMinutes(tmpl.duration_minutes);
                    }}
                    className={`p-5 rounded-md border-2 cursor-pointer transition-all shadow-[2px_2px_0_#2D3128] ${
                      isSelected
                        ? 'border-[#C2571B] bg-[#FDF5EF] shadow-[2px_2px_0_#C2571B]'
                        : 'border-[#2D3128] bg-white hover:bg-[#FDFBF7]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold font-serif text-[#1C1F24]">{tmpl.name}</div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-[#C2571B]" />}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#5B6354] mb-3 font-mono">
                      <span className="font-bold text-[#84340A]">{tmpl.total_marks} Marks</span>
                      <span>•</span>
                      <span>{tmpl.duration_minutes} Minutes</span>
                      <span>•</span>
                      <span>{tmpl.sections_config?.length || 3} Sections</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {tmpl.sections_config?.map((sec, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-white border border-[#2D3128] text-xs">
                          <span className="font-bold font-serif text-[#1C1F24] block">{sec.section_name}</span>
                          <span className="text-[#5B6354] font-mono">{sec.total_questions_to_answer} × {sec.marks_per_question}M {sec.has_either_or ? '(Either/Or)' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: CONFIGURE DETAILS & DIFFICULTY */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b-2 border-[#2D3128]/20 pb-4">
              <h3 className="text-lg font-bold font-serif text-[#1C1F24]">Step 4: Configure Marks & Cognitive Distribution</h3>
              <p className="text-xs text-[#5B6354]">
                Adjust examination duration and Bloom's difficulty percentage target.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-serif font-bold text-[#1C1F24] mb-1">Total Marks</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded text-sm font-bold font-mono text-[#1C1F24]"
                />
              </div>

              <div>
                <label className="block text-xs font-serif font-bold text-[#1C1F24] mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded text-sm font-bold font-mono text-[#1C1F24]"
                />
              </div>
            </div>

            <div className="p-5 rounded-md bg-[#F7F3EC] border-2 border-[#2D3128] space-y-4 shadow-[2px_2px_0_#2D3128]">
              <div className="text-xs font-bold font-serif text-[#1C1F24] uppercase tracking-wider">
                Cognitive Difficulty Distribution Target
              </div>

              <div>
                <div className="flex justify-between text-xs font-serif mb-1">
                  <span className="font-bold text-[#2A6E3B]">Easy (Remember / Understand): {easyPct}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={easyPct}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEasyPct(val);
                    setMedPct(100 - val - hardPct);
                  }}
                  className="w-full accent-[#2A6E3B]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-serif mb-1">
                  <span className="font-bold text-[#84340A]">Medium (Apply / Analyze): {medPct}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="70"
                  value={medPct}
                  onChange={(e) => setMedPct(Number(e.target.value))}
                  className="w-full accent-[#C2571B]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-serif mb-1">
                  <span className="font-bold text-[#1C1F24]">Hard (Evaluate / Create): {hardPct}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={hardPct}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setHardPct(val);
                    setMedPct(100 - easyPct - val);
                  }}
                  className="w-full accent-[#1C1F24]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SELECT GENERATION MODE */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b-2 border-[#2D3128]/20 pb-4">
              <h3 className="text-lg font-bold font-serif text-[#1C1F24]">Step 5: Select Generation Engine Mode</h3>
              <p className="text-xs text-[#5B6354]">
                Determine whether to use exclusively curated questions from the bank or synthesize new questions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div
                onClick={() => setGenerationMode('bank')}
                className={`p-6 rounded-md border-2 cursor-pointer transition-all shadow-[2px_2px_0_#2D3128] ${
                  generationMode === 'bank'
                    ? 'border-[#C2571B] bg-[#FDF5EF] shadow-[2px_2px_0_#C2571B]'
                    : 'border-[#2D3128] bg-white hover:bg-[#FDFBF7]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded bg-[#EFE8DC] border-2 border-[#2D3128] text-[#1C1F24] flex items-center justify-center font-bold font-mono text-sm">
                    A
                  </div>
                  {generationMode === 'bank' && <CheckCircle2 className="w-5 h-5 text-[#C2571B]" />}
                </div>
                <div className="text-base font-bold font-serif text-[#1C1F24] mb-1">Mode A: Question Bank Mode</div>
                <p className="text-xs text-[#5B6354] leading-relaxed mb-4">
                  Generates paper strictly using validated questions extracted from your uploaded question banks. Zero hallucinations or fabricated questions.
                </p>
                <span className="inline-block px-2.5 py-1 rounded bg-[#EFF7F1] border border-[#2A6E3B] text-[#2A6E3B] text-[11px] font-mono font-bold">
                  Recommended for Official University Exams
                </span>
              </div>

              <div
                onClick={() => setGenerationMode('ai')}
                className={`p-6 rounded-md border-2 cursor-pointer transition-all shadow-[2px_2px_0_#2D3128] ${
                  generationMode === 'ai'
                    ? 'border-[#C2571B] bg-[#FDF5EF] shadow-[2px_2px_0_#C2571B]'
                    : 'border-[#2D3128] bg-white hover:bg-[#FDFBF7]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded bg-[#FDF5EF] border-2 border-[#C2571B] text-[#84340A] flex items-center justify-center font-bold font-mono text-sm">
                    B
                  </div>
                  {generationMode === 'ai' && <CheckCircle2 className="w-5 h-5 text-[#C2571B]" />}
                </div>
                <div className="text-base font-bold font-serif text-[#1C1F24] mb-1">Mode B: AI Generation Mode</div>
                <p className="text-xs text-[#5B6354] leading-relaxed mb-4">
                  Uses uploaded question banks and syllabus as reference, synthesizing novel technical questions, rubrics, and either/or pairs parameterized by cognitive tier.
                </p>
                <span className="inline-block px-2.5 py-1 rounded bg-[#FDF5EF] border border-[#C2571B] text-[#84340A] text-[11px] font-mono font-bold">
                  AI Procedural & LLM Synthesis
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & ASSEMBLE */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b-2 border-[#2D3128]/20 pb-4">
              <h3 className="text-lg font-bold font-serif text-[#1C1F24]">Step 6: Review Blueprint & Generate Paper</h3>
              <p className="text-xs text-[#5B6354]">
                Confirm your configuration before generating. Once generated, you can edit, replace, delete, and add individual questions.
              </p>
            </div>

            <div className="p-6 rounded-md bg-[#F7F3EC] border-2 border-[#2D3128] space-y-4 shadow-[2px_2px_0_#2D3128]">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#5B6354] block font-mono">Subject:</span>
                  <span className="font-bold font-serif text-[#1C1F24] text-sm">{selectedSubject.code} - {selectedSubject.name}</span>
                </div>
                <div>
                  <span className="text-[#5B6354] block font-mono">Pattern:</span>
                  <span className="font-bold font-serif text-[#1C1F24] text-sm">{selectedTemplate.name}</span>
                </div>
                <div>
                  <span className="text-[#5B6354] block font-mono">Selected Syllabus Units:</span>
                  <span className="font-bold font-mono text-[#84340A] text-sm">Units {selectedUnits.join(', ')}</span>
                </div>
                <div>
                  <span className="text-[#5B6354] block font-mono">Generation Engine:</span>
                  <span className="font-bold font-mono text-[#2A6E3B] text-sm">
                    {generationMode === 'bank' ? 'Mode A (Question Bank Strict)' : 'Mode B (AI Synthesis)'}
                  </span>
                </div>
                <div>
                  <span className="text-[#5B6354] block font-mono">Max Marks:</span>
                  <span className="font-bold font-mono text-[#1C1F24] text-sm">{totalMarks} Marks</span>
                </div>
                <div>
                  <span className="text-[#5B6354] block font-mono">Duration:</span>
                  <span className="font-bold font-mono text-[#1C1F24] text-sm">{durationMinutes} Minutes</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation Controls */}
        <div className="pt-6 border-t-2 border-[#2D3128]/20 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              disabled={isGenerating}
              className="btn-secondary px-4 py-2 text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-rust px-5 py-2.5 text-xs font-bold"
            >
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-rust px-6 py-2.5 text-xs font-bold"
            >
              <Sparkles className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Synthesizing Examination Paper...' : 'Generate Examination Paper'}
            </button>
          )}
        </div>
      </div>

      {/* Manual Subject Addition / Editing Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSubjectSaved={handleSubjectSaved}
        initialSubject={editingSubject}
      />
    </div>
  );
};
