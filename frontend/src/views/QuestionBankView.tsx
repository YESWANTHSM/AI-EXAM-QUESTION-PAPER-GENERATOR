import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Download,
  BookOpen,
  Sparkles,
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Subject, Question, Template } from '../types';
import { api } from '../api';
import { SubjectModal } from '../components/SubjectModal';

interface QuestionBankViewProps {
  subjects: Subject[];
  templates?: Template[];
  onRefreshStats: () => void;
  onPaperGenerated?: (paperId: number) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  subjects,
  templates = [],
  onRefreshStats,
  onPaperGenerated
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedUnit, setSelectedUnit] = useState<number | ''>('');
  const [selectedMarks, setSelectedMarks] = useState<number | ''>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Add/Edit Single Question Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Upload Question Bank Modal & State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState<number>(subjects[0]?.id || 1);
  const [uploadTab, setUploadTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessResult, setUploadSuccessResult] = useState<{
    extracted_count: number;
    filename?: string;
    message?: string;
  } | null>(null);

  // Quick Paper Generation State
  const [isGeneratingPaper, setIsGeneratingPaper] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync uploadSubjectId when subjects change
  useEffect(() => {
    if (subjects.length > 0 && !uploadSubjectId) {
      setUploadSubjectId(subjects[0].id);
    }
  }, [subjects]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getQuestions({
        subject_id: selectedSubjectId || undefined,
        unit: selectedUnit || undefined,
        marks: selectedMarks || undefined,
        difficulty: selectedDifficulty || undefined,
        question_type: selectedType || undefined,
        search: searchTerm || undefined
      });
      setQuestions(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedSubjectId, selectedUnit, selectedMarks, selectedDifficulty, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  // 1-Click Generate Question Paper in Photo Pattern (50 Marks / 100 Mins)
  const handleQuickGenerate = async (targetSubjectId?: number) => {
    const subId = targetSubjectId || (typeof selectedSubjectId === 'number' ? selectedSubjectId : (subjects[0]?.id || 1));
    if (!subId) {
      alert('Please add or select a subject first.');
      return;
    }
    setIsGeneratingPaper(true);
    try {
      // Find 50 Marks V.S.B. Template
      const vsbTmpl = templates.find((t) => t.total_marks === 50) || templates[0] || { id: 1 };
      const payload = {
        subject_id: subId,
        selected_units: [1, 2, 3, 4, 5],
        template_id: vsbTmpl.id,
        duration_minutes: 100,
        generation_mode: 'bank',
        difficulty_distribution: {
          Easy: 30,
          Medium: 50,
          Hard: 20
        }
      };

      const res = await api.generatePaper(payload);
      if (res.success && res.paper_id) {
        onRefreshStats();
        if (onPaperGenerated) {
          onPaperGenerated(res.paper_id);
        }
      }
    } catch (err: any) {
      alert('Paper generation failed: ' + (err.message || 'Please check question bank'));
    } finally {
      setIsGeneratingPaper(false);
    }
  };

  // Upload File Handler
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccessResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject_id', String(uploadSubjectId || subjects[0]?.id || 1));
      formData.append('doc_category', 'question_bank');

      const res = await api.uploadDocument(formData);
      if (res.success) {
        setUploadSuccessResult({
          extracted_count: res.extracted_count,
          filename: file.name,
          message: `Successfully read and extracted ${res.extracted_count} questions from "${file.name}"!`
        });
        fetchQuestions();
        onRefreshStats();
      } else {
        setUploadError(res.error || 'Failed to extract questions from file.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Paste Text Handler
  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccessResult(null);

    try {
      const subId = uploadSubjectId || subjects[0]?.id || 1;
      const res = await api.parseTextQuestions(subId, pastedText);
      if (res.success) {
        setUploadSuccessResult({
          extracted_count: res.extracted_count,
          filename: 'Pasted Question Bank Text',
          message: `Successfully read and extracted ${res.extracted_count} questions from your text input!`
        });
        setPastedText('');
        fetchQuestions();
        onRefreshStats();
      } else {
        setUploadError(res.error || 'Could not parse questions from the provided text.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process pasted text.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAddModal = () => {
    if (subjects.length === 0) {
      alert('Please add a subject first before adding questions to the bank.');
      setIsSubjectModalOpen(true);
      return;
    }
    setEditingQuestion({
      subject_id: subjects[0]?.id || 1,
      unit: 1,
      topic: 'Core Concepts',
      question_text: '',
      marks: 2,
      question_type: 'Short Answer',
      difficulty: 'Medium',
      blooms_level: 'Understand',
      course_outcome: 'CO1',
      sample_answer: '',
      rubric_json: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (q: Question) => {
    setEditingQuestion({ ...q });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this question permanently from the bank?')) {
      try {
        await api.deleteQuestion(id);
        fetchQuestions();
        onRefreshStats();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.question_text) return;

    try {
      if (editingQuestion.id) {
        await api.updateQuestion(editingQuestion.id, editingQuestion);
      } else {
        await api.addQuestion(editingQuestion);
      }
      setIsModalOpen(false);
      setEditingQuestion(null);
      fetchQuestions();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `question_bank_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      {/* Hero Ingestion Announcement Banner - Jayam Automobiles Charcoal & Rust */}
      <div className="bg-[#1C1F24] text-[#EFE8DC] rounded-md p-6 md:p-8 border-2 border-[#2D3128] shadow-[4px_4px_0_#2D3128] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C2571B]/20 text-[#F7F3EC] text-xs font-mono font-bold border border-[#C2571B]">
            <Zap className="w-3.5 h-3.5 text-[#F7F3EC]" />
            AUTOMATIC QUESTION BANK INGESTION & PAPER SYNTHESIS
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-serif tracking-tight text-white">
            Upload Question Bank & Auto-Generate Exam Paper
          </h2>
          <p className="text-xs md:text-sm text-[#EFE8DC]/85 leading-relaxed">
            Upload your subject question bank (<span className="text-[#F7F3EC] font-mono font-bold">Word .docx, PDF, Excel .xlsx, Text</span>). The system automatically reads questions, maps Part A (2M), Part B (8M), Part C (16M) with Bloom’s taxonomy & Course Outcomes—<strong>no need to type questions manually!</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              setUploadSuccessResult(null);
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
            className="btn-rust px-5 py-3 text-xs"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload Question Bank
          </button>

          <button
            onClick={() => handleQuickGenerate()}
            disabled={isGeneratingPaper || questions.length === 0}
            className="px-5 py-3 rounded-md bg-[#2A6E3B] hover:bg-[#235830] disabled:opacity-50 text-white font-serif font-bold text-xs flex items-center justify-center gap-2 border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#2D3128] transition-all"
            title="Generate Question Paper in V.S.B. 50 Marks / 100 Mins pattern"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {isGeneratingPaper ? 'Generating Paper...' : '⚡ Generate Paper (50M)'}
          </button>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="ledger-card p-5 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] max-w-md relative">
          <Search className="w-4 h-4 text-[#8C9683] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions by keyword, topic or CO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-mono text-[#1C1F24] placeholder-[#8C9683] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
          />
        </form>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSubjectModalOpen(true)}
            className="btn-secondary px-3.5 py-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[#C2571B]" />
            Add Subject
          </button>
          <button
            onClick={handleExportJson}
            className="btn-secondary px-3.5 py-2 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-[#5B6354]" />
            Export JSON
          </button>
          <button
            onClick={handleOpenAddModal}
            className="btn-rust px-3.5 py-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Single Q
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="ledger-card p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-[#1C1F24] font-serif font-bold pr-2 border-r-2 border-[#2D3128]/30">
          <Filter className="w-3.5 h-3.5 text-[#C2571B]" />
          Filters:
        </div>

        {/* Subject */}
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-1.5 bg-white border-1.5 border-[#2D3128] rounded font-semibold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} - {s.name}
            </option>
          ))}
        </select>

        {/* Unit */}
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-1.5 bg-white border-1.5 border-[#2D3128] rounded font-semibold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
        >
          <option value="">All Units (1 - 5)</option>
          {[1, 2, 3, 4, 5].map((u) => (
            <option key={u} value={u}>Unit {u}</option>
          ))}
        </select>

        {/* Marks */}
        <select
          value={selectedMarks}
          onChange={(e) => setSelectedMarks(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-1.5 bg-white border-1.5 border-[#2D3128] rounded font-semibold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
        >
          <option value="">All Marks</option>
          <option value={2}>2 Marks (Part A)</option>
          <option value={8}>8 Marks (Part B)</option>
          <option value={13}>13 Marks</option>
          <option value={15}>15 Marks</option>
          <option value={16}>16 Marks (Part C)</option>
        </select>

        {/* Difficulty */}
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-1.5 bg-white border-1.5 border-[#2D3128] rounded font-semibold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
        >
          <option value="">All Difficulty</option>
          <option value="Easy">Easy (L1/L2)</option>
          <option value="Medium">Medium (L2/L3)</option>
          <option value="Hard">Hard (L4/L5)</option>
        </select>

        {/* Question Type */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-1.5 bg-white border-1.5 border-[#2D3128] rounded font-semibold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
        >
          <option value="">All Types</option>
          <option value="Short Answer">Short Answer</option>
          <option value="Very Short Answer">Very Short Answer</option>
          <option value="Long Answer">Long Answer</option>
          <option value="Essay Questions">Essay Questions</option>
          <option value="Programming Questions">Programming Questions</option>
        </select>

        {(selectedSubjectId || selectedUnit || selectedMarks || selectedDifficulty || selectedType || searchTerm) && (
          <button
            onClick={() => {
              setSelectedSubjectId('');
              setSelectedUnit('');
              setSelectedMarks('');
              setSelectedDifficulty('');
              setSelectedType('');
              setSearchTerm('');
            }}
            className="text-[#C2571B] hover:text-[#84340A] font-bold font-mono ml-auto underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Questions List */}
      <div className="ledger-card overflow-hidden">
        <div className="p-4 bg-[#EFE8DC] border-b-2 border-[#2D3128] flex items-center justify-between text-xs font-serif font-bold text-[#1C1F24]">
          <span>Displaying {questions.length} Ingested Questions</span>
          <span className="text-[#5B6354] font-mono text-[11px]">V.S.B. Autonomous Question Ledger</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#8C9683] font-mono text-sm">
            Loading question repository...
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <BookOpen className="w-12 h-12 text-[#8C9683] mx-auto" />
            <div>
              <h3 className="font-bold font-serif text-[#1C1F24] text-base">No Questions Found</h3>
              <p className="text-xs text-[#5B6354] mt-1 leading-relaxed">
                Upload your subject question bank (Word/PDF/Excel/Text) to automatically read all questions without manual typing!
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-rust px-4 py-2 text-xs"
            >
              <UploadCloud className="w-4 h-4 mr-2" /> Upload Question Bank Now
            </button>
          </div>
        ) : (
          <div className="divide-y-2 divide-[#2D3128]/15">
            {questions.map((q) => (
              <div
                key={q.id}
                className="p-5 hover:bg-[#FDFBF7] transition-colors flex items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-[#1C1F24] px-2 py-0.5 rounded bg-[#EFE8DC] border border-[#2D3128] font-mono">
                      #{q.id}
                    </span>
                    <span className="font-bold text-[#84340A] px-2 py-0.5 rounded bg-[#FDF5EF] border border-[#C2571B] font-mono">
                      {q.subject_code} • Unit {q.unit}
                    </span>
                    <span className="font-bold text-[#1C1F24] font-serif truncate max-w-xs">
                      {q.topic}
                    </span>
                    <span className="text-[#8C9683]">•</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                      q.marks === 2 ? 'bg-[#FDF5EF] text-[#84340A] border-[#C2571B]' :
                      q.marks === 8 ? 'bg-[#EFF7F1] text-[#2A6E3B] border-[#2A6E3B]' :
                      'bg-[#1C1F24] text-[#F7F3EC] border-[#2D3128]'
                    }`}>
                      {q.marks} Marks {q.marks === 2 ? '(Part A)' : q.marks === 8 ? '(Part B)' : '(Part C)'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                      q.difficulty === 'Easy' ? 'bg-[#EFF7F1] text-[#2A6E3B] border-[#2A6E3B]' :
                      q.difficulty === 'Medium' ? 'bg-[#FDF5EF] text-[#84340A] border-[#C2571B]' : 'bg-[#FAF0F0] text-[#9A2626] border-[#9A2626]'
                    }`}>
                      {q.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#EFE8DC] text-[#2D3128] border border-[#2D3128] text-[11px] font-mono font-bold">
                      [{q.blooms_level ? q.blooms_level.slice(0, 2).toUpperCase() : 'UN'}] {q.blooms_level}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#EFE8DC] text-[#2D3128] border border-[#2D3128] text-[11px] font-mono font-bold">
                      ({q.course_outcome || `CO${q.unit}`})
                    </span>
                  </div>

                  <p className="text-sm font-medium text-[#1C1F24] leading-relaxed font-serif">
                    {q.question_text}
                  </p>

                  {q.sample_answer && (
                    <div className="p-2.5 rounded bg-[#F7F3EC] border-2 border-[#2D3128]/30 text-xs text-[#2D3128] font-mono">
                      <span className="font-bold text-[#84340A]">Evaluation Scheme: </span>
                      {q.sample_answer}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(q)}
                    className="p-2 rounded bg-white hover:bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24] transition-colors shadow-[1px_1px_0_#2D3128]"
                    title="Edit Question"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-2 rounded bg-white hover:bg-rose-50 border border-rose-600 text-rose-700 transition-colors shadow-[1px_1px_0_#2D3128]"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPLOAD QUESTION BANK MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1F24]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-md shadow-[6px_6px_0_#1C1F24] flex flex-col overflow-hidden border-2 border-[#2D3128]">
            <div className="p-5 border-b-2 border-[#2D3128] flex items-center justify-between bg-[#EFE8DC]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-[#C2571B] text-white border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128]">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#1C1F24]">
                    Upload Subject Question Bank
                  </h3>
                  <p className="text-xs text-[#5B6354] font-medium">
                    System reads your document and automatically extracts questions & tags
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded bg-white border border-[#2D3128] text-[#1C1F24] hover:bg-[#EFE8DC] shadow-[1px_1px_0_#2D3128]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] bg-[#F7F3EC]">
              {/* Select Target Subject */}
              <div>
                <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1.5">
                  Select Subject for Ingestion *
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={uploadSubjectId}
                    onChange={(e) => setUploadSubjectId(Number(e.target.value))}
                    className="flex-1 px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded-md text-xs font-semibold text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name} (Semester {s.semester})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsSubjectModalOpen(true)}
                    className="btn-secondary px-3 py-2.5 text-xs whitespace-nowrap"
                  >
                    + Add Subject
                  </button>
                </div>
              </div>

              {/* Upload Method Tabs */}
              <div className="flex border-b-2 border-[#2D3128] text-xs font-serif font-bold">
                <button
                  type="button"
                  onClick={() => setUploadTab('file')}
                  className={`pb-2.5 px-4 flex items-center gap-2 border-b-3 transition-all ${
                    uploadTab === 'file'
                      ? 'border-[#C2571B] text-[#C2571B]'
                      : 'border-transparent text-[#5B6354] hover:text-[#1C1F24]'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Upload Document File (.docx, .pdf, .xlsx, .txt)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab('paste')}
                  className={`pb-2.5 px-4 flex items-center gap-2 border-b-3 transition-all ${
                    uploadTab === 'paste'
                      ? 'border-[#C2571B] text-[#C2571B]'
                      : 'border-transparent text-[#5B6354] hover:text-[#1C1F24]'
                  }`}
                >
                  <BookOpen className="w-4 h-4" /> Paste Question Bank Text
                </button>
              </div>

              {/* Tab 1: File Upload */}
              {uploadTab === 'file' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2D3128] hover:border-[#C2571B] bg-white hover:bg-[#EFE8DC] rounded-md p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 shadow-[2px_2px_0_#2D3128]"
                  >
                    <div className="w-12 h-12 rounded bg-[#FDF5EF] border-2 border-[#C2571B] text-[#C2571B] flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold font-serif text-[#1C1F24]">
                        Drop your Question Bank file here, or <span className="text-[#C2571B] underline">browse</span>
                      </p>
                      <p className="text-xs text-[#5B6354] mt-1 font-mono">
                        Supported: Microsoft Word (.docx), PDF (.pdf), Excel (.xlsx), Text (.txt), CSV
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.doc,.pdf,.xlsx,.xls,.txt,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </div>

                  {isUploading && (
                    <div className="p-4 rounded-md bg-[#EFF7F1] border-2 border-[#2A6E3B] shadow-[2px_2px_0_#2A6E3B] flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#2A6E3B] border-t-transparent"></div>
                      <div className="text-xs text-[#2A6E3B] font-mono font-bold">
                        Reading document, extracting questions, and tagging Bloom's & COs...
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Paste Raw Text */}
              {uploadTab === 'paste' && (
                <form onSubmit={handlePasteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
                      Paste Questions Text from syllabus, Word doc, or PDF:
                    </label>
                    <textarea
                      rows={8}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`Example format:\nPART - A (2 Marks)\n1. Analyze the importance of grammar rules in English language processing. (CO3) [AN]\n2. Compare Chomsky Normal Form and standard CFG representations. (CO3) [AN]\n\nPART - B (8 Marks)\n6. (a) Evaluate the Centering Theory approach for anaphora resolution. (CO5) [EV] (8)\n(b) Analyze coreference resolution and distinguish it from anaphora resolution. (CO5) [AN] (8)\n\nPART - C (16 Marks)\n7. (a) Discuss Shallow Parsing and compare with Full Parsing. (CO3) [AN] (16)`}
                      className="w-full px-4 py-3 bg-white border-2 border-[#2D3128] rounded-md text-xs font-mono text-[#1C1F24] focus:outline-none focus:border-[#C2571B] leading-relaxed shadow-[1px_1px_0_#2D3128]"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading || !pastedText.trim()}
                    className="btn-rust w-full py-2.5 text-xs font-bold"
                  >
                    {isUploading ? 'Reading Questions...' : 'Read & Ingest Questions'}
                  </button>
                </form>
              )}

              {/* Error Alert */}
              {uploadError && (
                <div className="p-4 rounded-md bg-[#FAF0F0] border-2 border-rose-600 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Success Card with 1-Click Generate Paper Action! */}
              {uploadSuccessResult && (
                <div className="p-5 rounded-md bg-[#EFF7F1] border-2 border-[#2A6E3B] shadow-[3px_3px_0_#2A6E3B] space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#2A6E3B] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold font-serif text-[#2A6E3B]">
                        {uploadSuccessResult.message}
                      </h4>
                      <p className="text-xs text-[#2A6E3B] mt-1 font-medium">
                        All questions are read, categorized by unit and marks, and stored in your bank. You can immediately synthesize the official examination paper!
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadModalOpen(false);
                        handleQuickGenerate(uploadSubjectId);
                      }}
                      disabled={isGeneratingPaper}
                      className="px-5 py-2.5 rounded-md bg-[#2A6E3B] hover:bg-[#235830] text-white text-xs font-serif font-bold flex items-center gap-2 border-2 border-[#2D3128] shadow-[2px_2px_0_#2D3128] active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      {isGeneratingPaper ? 'Generating Paper...' : '⚡ Generate Question Paper in Photo Pattern (50M)'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="btn-secondary px-4 py-2.5 text-xs font-bold"
                    >
                      View in Question Bank
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Single Question Modal */}
      {isModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 bg-[#1C1F24]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-md shadow-[6px_6px_0_#1C1F24] flex flex-col overflow-hidden border-2 border-[#2D3128]">
            <div className="p-5 border-b-2 border-[#2D3128] flex items-center justify-between bg-[#EFE8DC]">
              <h3 className="text-base font-bold font-serif text-[#1C1F24]">
                {editingQuestion.id ? `Edit Question #${editingQuestion.id}` : 'Add New Question to Bank'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded bg-white border border-[#2D3128] text-[#1C1F24] hover:bg-[#EFE8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 overflow-y-auto max-h-[80vh] bg-[#F7F3EC]">
              <div>
                <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
                  Question Statement *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingQuestion.question_text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  placeholder="Type full examination question statement..."
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded-md text-xs font-serif text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Subject</label>
                  <select
                    value={editingQuestion.subject_id}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, subject_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-semibold text-[#1C1F24]"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Unit Number</label>
                  <select
                    value={editingQuestion.unit}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, unit: Number(e.target.value), course_outcome: `CO${e.target.value}` })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-semibold text-[#1C1F24]"
                  >
                    {[1, 2, 3, 4, 5].map((u) => (
                      <option key={u} value={u}>Unit {u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Marks</label>
                  <select
                    value={editingQuestion.marks}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-semibold text-[#1C1F24]"
                  >
                    <option value={2}>2 Marks (Part A)</option>
                    <option value={8}>8 Marks (Part B)</option>
                    <option value={13}>13 Marks</option>
                    <option value={15}>15 Marks</option>
                    <option value={16}>16 Marks (Part C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Difficulty</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-semibold text-[#1C1F24]"
                  >
                    <option value="Easy">Easy (L1/L2)</option>
                    <option value="Medium">Medium (L2/L3)</option>
                    <option value="Hard">Hard (L4/L5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Bloom's Taxonomy</label>
                  <select
                    value={editingQuestion.blooms_level}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, blooms_level: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-semibold text-[#1C1F24]"
                  >
                    <option value="Remember">Remember [RE]</option>
                    <option value="Understand">Understand [UN]</option>
                    <option value="Apply">Apply [AP]</option>
                    <option value="Analyze">Analyze [AN]</option>
                    <option value="Evaluate">Evaluate [EV]</option>
                    <option value="Create">Create [CR]</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Topic / Concept</label>
                  <input
                    type="text"
                    value={editingQuestion.topic || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })}
                    placeholder="e.g. Grammar Rules & Parsing"
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-mono text-[#1C1F24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Course Outcome (CO)</label>
                  <input
                    type="text"
                    value={editingQuestion.course_outcome || 'CO1'}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, course_outcome: e.target.value })}
                    placeholder="e.g. CO3"
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-mono text-[#1C1F24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
                  Model Answer / Marking Scheme Rubric
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.sample_answer || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, sample_answer: e.target.value, rubric_json: e.target.value })}
                  placeholder="Key points: Definition (1M), Formulation (1M)..."
                  className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-mono text-[#1C1F24]"
                ></textarea>
              </div>

              <div className="pt-4 border-t-2 border-[#2D3128] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-rust px-5 py-2 text-xs"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Subject Addition Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSubjectSaved={() => {
          onRefreshStats();
          fetchQuestions();
        }}
      />
    </div>
  );
};
