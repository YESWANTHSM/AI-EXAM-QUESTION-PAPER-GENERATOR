import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Download,
  Printer,
  RotateCcw,
  RotateCw,
  Plus,
  RefreshCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  CheckCircle2,
  Sparkles,
  BookOpen,
  X,
  AlertCircle,
  HelpCircle,
  Layers,
  Award,
  Scissors,
  Split,
  Settings2,
  Eye,
  Sliders,
  Check
} from 'lucide-react';
import { GeneratedPaper, PaperSection, PaperQuestion, Question } from '../types';
import { api } from '../api';

interface PaperEditorViewProps {
  paperId: number | null;
  onRefreshStats: () => void;
  onNavigateToPapers: () => void;
}

export const PaperEditorView: React.FC<PaperEditorViewProps> = ({
  paperId,
  onRefreshStats,
  onNavigateToPapers
}) => {
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<GeneratedPaper[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Modals & Drawers
  const [replacingQuestion, setReplacingQuestion] = useState<PaperQuestion | null>(null);
  const [alternatives, setAlternatives] = useState<Question[]>([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);

  // Pick question from bank modal for adding to section
  const [pickingFromBankSectionId, setPickingFromBankSectionId] = useState<number | null>(null);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankMarksFilter, setBankMarksFilter] = useState<number | ''>('');

  // Add custom question modal
  const [addingToSectionId, setAddingToSectionId] = useState<number | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionMarks, setNewQuestionMarks] = useState(2);
  const [newQuestionUnit, setNewQuestionUnit] = useState(1);
  const [newQuestionBlooms, setNewQuestionBlooms] = useState('Understand');

  // Edit Header Modal
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);

  const [regeneratingQId, setRegeneratingQId] = useState<number | null>(null);

  // Focused/active question for expanded bar
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);

  // Fetch paper
  const loadPaper = async (id: number) => {
    setIsLoading(true);
    try {
      const data = await api.getPaper(id);
      setPaper(data);
      setHistory([JSON.parse(JSON.stringify(data))]);
      setHistoryIndex(0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (paperId) {
      loadPaper(paperId);
    } else {
      setIsLoading(false);
    }
  }, [paperId]);

  // Push new state to history stack
  const updatePaperState = (newPaper: GeneratedPaper) => {
    // Recalculate grand total
    let total = 0;
    const countedOrGroups = new Set<string>();

    newPaper.sections?.forEach((sec) => {
      sec.questions.forEach((q) => {
        if (q.is_or_choice && q.or_group_id) {
          if (!countedOrGroups.has(q.or_group_id)) {
            total += Number(q.marks) || 0;
            countedOrGroups.add(q.or_group_id);
          }
        } else {
          total += Number(q.marks) || 0;
        }
      });
    });
    newPaper.total_marks = total;

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(JSON.parse(JSON.stringify(newPaper)));
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setPaper(newPaper);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setPaper(JSON.parse(JSON.stringify(history[prevIdx])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setPaper(JSON.parse(JSON.stringify(history[nextIdx])));
    }
  };

  // 1. INLINE EDIT QUESTION FIELD
  const handleEditQuestion = (secIdx: number, qIdx: number, field: keyof PaperQuestion, value: any) => {
    if (!paper || !paper.sections) return;
    const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;
    (cloned.sections![secIdx].questions[qIdx] as any)[field] = value;
    updatePaperState(cloned);
  };

  // 2. DELETE QUESTION
  const handleDeleteQuestion = (secIdx: number, qIdx: number) => {
    if (!paper || !paper.sections) return;
    const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;
    cloned.sections![secIdx].questions.splice(qIdx, 1);
    updatePaperState(cloned);
  };

  // 3. REORDER QUESTIONS (MOVE UP / DOWN)
  const handleMoveQuestion = (secIdx: number, qIdx: number, direction: 'up' | 'down') => {
    if (!paper || !paper.sections) return;
    const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;
    const questions = cloned.sections![secIdx].questions;
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;

    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const temp = questions[qIdx];
    questions[qIdx] = questions[targetIdx];
    questions[targetIdx] = temp;

    // Refresh orders
    questions.forEach((q, idx) => {
      q.question_order = idx + 1;
    });

    updatePaperState(cloned);
  };

  // 4. OPEN REPLACE QUESTION MODAL
  const handleOpenReplace = async (q: PaperQuestion) => {
    setReplacingQuestion(q);
    setIsLoadingAlternatives(true);
    try {
      if (paper) {
        const alts = await api.getAlternatives(paper.id, q.id);
        setAlternatives(alts);
      }
    } catch (err: any) {
      alert('Could not fetch alternatives: ' + err.message);
    } finally {
      setIsLoadingAlternatives(false);
    }
  };

  // 5. CONFIRM REPLACE QUESTION
  const handleConfirmReplace = (alt: Question) => {
    if (!paper || !paper.sections || !replacingQuestion) return;
    const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;

    cloned.sections?.forEach((sec) => {
      sec.questions.forEach((q) => {
        if (q.id === replacingQuestion.id) {
          q.question_text = alt.question_text;
          q.marks = alt.marks;
          q.difficulty = alt.difficulty;
          q.blooms_level = alt.blooms_level;
          q.course_outcome = alt.course_outcome;
          q.unit = alt.unit;
          q.topic = alt.topic;
          q.sample_answer = alt.sample_answer;
          q.rubric_text = alt.rubric_json;
        }
      });
    });

    updatePaperState(cloned);
    setReplacingQuestion(null);
  };

  // 6. REGENERATE QUESTION WITH AI
  const handleRegenerate = async (q: PaperQuestion) => {
    if (!paper) return;
    setRegeneratingQId(q.id);
    try {
      const res = await api.regeneratePaperQuestion(paper.id, q.id);
      if (res.success) {
        const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;
        cloned.sections?.forEach((sec) => {
          sec.questions.forEach((item) => {
            if (item.id === q.id) {
              item.question_text = res.question_text;
              item.sample_answer = res.sample_answer;
              item.rubric_text = res.rubric_text;
            }
          });
        });
        updatePaperState(cloned);
      }
    } catch (err: any) {
      alert('Regeneration failed: ' + err.message);
    } finally {
      setRegeneratingQId(null);
    }
  };

  // 7. SPLIT QUESTION INTO SUB-PARTS (e.g. 16M -> (i) 8M + (ii) 8M like Question 7(b) in photo!)
  const handleSplitQuestion = (secIdx: number, qIdx: number) => {
    if (!paper || !paper.sections) return;
    const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;
    const targetQ = cloned.sections![secIdx].questions[qIdx];

    const originalMarks = targetQ.marks || 16;
    const part1Marks = Math.ceil(originalMarks / 2);
    const part2Marks = originalMarks - part1Marks;

    // Update target question to be sub-part (i)
    targetQ.sub_part = targetQ.sub_part ? `${targetQ.sub_part} (i)` : '(i)';
    targetQ.marks = part1Marks;

    // Create sibling sub-part (ii)
    const newSiblingQ: PaperQuestion = {
      id: Date.now(),
      section_id: targetQ.section_id,
      question_number: targetQ.question_number,
      sub_part: '(ii)',
      is_or_choice: targetQ.is_or_choice,
      or_group_id: targetQ.or_group_id,
      choice_side: targetQ.choice_side,
      question_text: 'Critically evaluate the effectiveness of Grammar Rules for English in computational language processing.',
      marks: part2Marks,
      difficulty: 'Hard',
      blooms_level: 'Evaluate',
      course_outcome: targetQ.course_outcome || 'CO3',
      unit: targetQ.unit || 3,
      topic: targetQ.topic || 'Core Concepts',
      question_order: targetQ.question_order + 1,
      sample_answer: `Sub-division evaluation rubric: ${part2Marks} Marks`,
      rubric_text: `Sub-division evaluation rubric: ${part2Marks} Marks`
    };

    // Insert directly after target question
    cloned.sections![secIdx].questions.splice(qIdx + 1, 0, newSiblingQ);

    // Refresh orders
    cloned.sections![secIdx].questions.forEach((q, idx) => {
      q.question_order = idx + 1;
    });

    updatePaperState(cloned);
  };

  // 8. ADD EITHER/OR PAIR ((a) and (b))
  const handleAddOrPair = (secIdx: number) => {
    if (!paper || !paper.sections) return;
    const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;
    const sec = cloned.sections![secIdx];

    const maxNum = Math.max(...cloned.sections!.flatMap((s) => s.questions.map((q) => q.question_number)), 0);
    const nextQNum = maxNum + 1;
    const orGroupId = `Q${nextQNum}_OR`;
    const defaultMarks = sec.marks_per_question || 8;

    const optionA: PaperQuestion = {
      id: Date.now(),
      section_id: sec.id,
      question_number: nextQNum,
      sub_part: '(a)',
      is_or_choice: true,
      or_group_id: orGroupId,
      choice_side: 'A',
      question_text: 'Evaluate the theoretical foundation and operational architecture with suitable diagrams.',
      marks: defaultMarks,
      difficulty: 'Medium',
      blooms_level: 'Analyze',
      course_outcome: 'CO3',
      unit: 3,
      topic: 'Core Architecture',
      question_order: sec.questions.length + 1,
      sample_answer: `Comprehensive evaluation: ${defaultMarks} Marks`,
      rubric_text: `Comprehensive evaluation: ${defaultMarks} Marks`
    };

    const optionB: PaperQuestion = {
      id: Date.now() + 1,
      section_id: sec.id,
      question_number: nextQNum,
      sub_part: '(b)',
      is_or_choice: true,
      or_group_id: orGroupId,
      choice_side: 'B',
      question_text: 'Analyze the algorithmic performance and implementation trade-offs under varying workloads.',
      marks: defaultMarks,
      difficulty: 'Medium',
      blooms_level: 'Analyze',
      course_outcome: 'CO3',
      unit: 3,
      topic: 'Algorithmic Optimization',
      question_order: sec.questions.length + 2,
      sample_answer: `Comprehensive evaluation: ${defaultMarks} Marks`,
      rubric_text: `Comprehensive evaluation: ${defaultMarks} Marks`
    };

    sec.questions.push(optionA, optionB);
    updatePaperState(cloned);
  };

  // 9. OPEN PICK FROM BANK MODAL FOR SECTION
  const handleOpenPickFromBank = async (secId: number) => {
    setPickingFromBankSectionId(secId);
    if (!paper) return;
    try {
      const qs = await api.getQuestions({ subject_id: paper.subject_id });
      setBankQuestions(qs);
    } catch (err: any) {
      alert('Could not load question bank: ' + err.message);
    }
  };

  // 10. CONFIRM ADD FROM BANK TO SECTION
  const handleConfirmAddFromBank = (bankQ: Question) => {
    if (!paper || !paper.sections || !pickingFromBankSectionId) return;
    const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;
    const sec = cloned.sections?.find((s) => s.id === pickingFromBankSectionId);
    if (!sec) return;

    const maxNum = Math.max(...cloned.sections!.flatMap((s) => s.questions.map((q) => q.question_number)), 0);

    const newQ: PaperQuestion = {
      id: Date.now(),
      section_id: sec.id,
      question_number: maxNum + 1,
      sub_part: null,
      is_or_choice: false,
      question_text: bankQ.question_text,
      marks: bankQ.marks,
      difficulty: bankQ.difficulty,
      blooms_level: bankQ.blooms_level,
      course_outcome: bankQ.course_outcome,
      unit: bankQ.unit,
      topic: bankQ.topic,
      question_order: sec.questions.length + 1,
      sample_answer: bankQ.sample_answer || 'Academic model answer.',
      rubric_text: bankQ.rubric_json || `${bankQ.marks} Marks`
    };

    sec.questions.push(newQ);
    updatePaperState(cloned);
    setPickingFromBankSectionId(null);
  };

  // 11. ADD CUSTOM QUESTION
  const handleAddCustomQuestionConfirm = () => {
    if (!paper || !paper.sections || !addingToSectionId || !newQuestionText.trim()) return;

    const cloned = JSON.parse(JSON.stringify(paper)) as GeneratedPaper;
    const sec = cloned.sections?.find((s) => s.id === addingToSectionId);
    if (!sec) return;

    const maxNum = Math.max(...cloned.sections!.flatMap((s) => s.questions.map((q) => q.question_number)), 0);

    const newQ: PaperQuestion = {
      id: Date.now(),
      section_id: sec.id,
      question_number: maxNum + 1,
      sub_part: null,
      is_or_choice: false,
      question_text: newQuestionText.trim(),
      marks: newQuestionMarks,
      difficulty: 'Medium',
      blooms_level: newQuestionBlooms,
      course_outcome: `CO${newQuestionUnit}`,
      unit: newQuestionUnit,
      topic: 'Core Concepts',
      question_order: sec.questions.length + 1,
      sample_answer: 'Academic model key and rubric.',
      rubric_text: `Correct formulation: ${newQuestionMarks} Marks`
    };

    sec.questions.push(newQ);
    updatePaperState(cloned);

    setAddingToSectionId(null);
    setNewQuestionText('');
  };

  // 12. SAVE CHANGES TO DATABASE
  const handleSaveChanges = async () => {
    if (!paper) return;
    setIsSaving(true);
    try {
      await api.updatePaper(paper.id, paper);
      setSaveSuccess(true);
      onRefreshStats();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <FileText className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No Question Paper Loaded</h3>
        <p className="text-xs text-slate-500">
          Upload a question bank or generate a new paper using the Question Bank tab.
        </p>
        <button
          onClick={onNavigateToPapers}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          View Generated Papers
        </button>
      </div>
    );
  }

  // Filter bank questions for pick-from-bank modal
  const filteredBankQuestions = bankQuestions.filter((q) => {
    const matchesSearch = !bankSearch || q.question_text.toLowerCase().includes(bankSearch.toLowerCase()) || q.topic.toLowerCase().includes(bankSearch.toLowerCase());
    const matchesMarks = !bankMarksFilter || q.marks === bankMarksFilter;
    return matchesSearch && matchesMarks;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Editor Control Toolbar (Sticky Deck) - Jayam Automobiles Ledger Styling */}
      <div className="no-print sticky top-20 z-30 bg-[#1C1F24] text-[#EFE8DC] px-6 py-3.5 rounded-md shadow-[3px_3px_0_#2D3128] border-2 border-[#2D3128] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="font-bold font-serif text-sm tracking-tight flex items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#C2571B]/25 text-[#F7F3EC] border border-[#C2571B] font-bold">
              {paper.exam_code || '23ALT501'}
            </span>
            <span className="truncate max-w-xs">{paper.title}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#8C9683] pl-3 border-l-2 border-[#2D3128]">
            <span className="font-serif">Total Marks:</span>
            <span className="font-bold text-[#F7F3EC] font-mono text-sm">{paper.total_marks}</span>
            <span className="text-[#8C9683] font-mono">({paper.duration_minutes} Mins)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Header Information */}
          <button
            onClick={() => setIsHeaderModalOpen(true)}
            className="btn-secondary px-3 py-1.5 text-xs font-serif"
            title="Edit College Name, QP Code, Academic Year, Subject, etc."
          >
            <Settings2 className="w-3.5 h-3.5 mr-1 text-[#C2571B]" />
            Edit Header
          </button>

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className={`p-1.5 rounded border border-[#2D3128] shadow-[1px_1px_0_#2D3128] ${
              historyIndex > 0 ? 'bg-[#282D34] text-[#EFE8DC] hover:bg-[#333A42]' : 'bg-[#1C1F24] text-[#8C9683]/50 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={`p-1.5 rounded border border-[#2D3128] shadow-[1px_1px_0_#2D3128] ${
              historyIndex < history.length - 1 ? 'bg-[#282D34] text-[#EFE8DC] hover:bg-[#333A42]' : 'bg-[#1C1F24] text-[#8C9683]/50 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-[#2D3128] mx-1"></div>

          {/* Save to DB */}
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`btn-rust px-3.5 py-1.5 text-xs font-serif ${
              saveSuccess ? 'bg-[#2A6E3B] hover:bg-[#235830]' : ''
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1" />
                {isSaving ? 'Saving...' : 'Save Paper'}
              </>
            )}
          </button>

          {/* Export Actions */}
          <a
            href={api.getPdfExportUrl(paper.id)}
            download
            className="btn-secondary px-3 py-1.5 text-xs font-serif"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#C2571B]" />
            PDF
          </a>
          <a
            href={api.getDocxExportUrl(paper.id)}
            download
            className="btn-secondary px-3 py-1.5 text-xs font-serif"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#1C1F24]" />
            Word
          </a>
          <button
            onClick={() => window.print()}
            className="btn-secondary px-3 py-1.5 text-xs font-serif"
            title="Print Question Paper"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-[#5B6354]" />
            Print
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* AUTHENTIC UNIVERSITY EXAMINATION QUESTION PAPER SHEET (PHOTO LAYOUT) */}
      {/* ============================================================== */}
      <div className="exam-sheet bg-white rounded-md border-2 border-[#2D3128] shadow-[4px_4px_0_#2D3128] p-8 md:p-14 space-y-6 text-[#1C1F24] transition-all font-serif">
        
        {/* 1. TOP RIGHT REGISTER NUMBER BOXES (12 boxes, matching photo) */}
        <div className="flex justify-end items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
            REGISTER NO.:
          </span>
          <div className="flex border border-slate-900 bg-white">
            {['9', '2', '2', '5', '2', '4', '1', '4', '8', '1', '2', '4'].map((digit, i) => (
              <div
                key={i}
                className="w-5 h-6 border-r last:border-r-0 border-slate-900 flex items-center justify-center font-mono text-xs font-medium text-slate-700 hover:text-indigo-600"
                title={`Box ${i + 1}`}
              >
                {/* Blank or sample digit */}
              </div>
            ))}
          </div>
        </div>

        {/* 2. INSTITUTION & ANNA UNIVERSITY AFFILIATION */}
        <div className="text-center space-y-0.5">
          <h1 className="font-bold text-base md:text-lg tracking-wide uppercase text-slate-950 font-serif">
            {paper.institution_name || 'V.S.B. ENGINEERING COLLEGE, KARUR.'}
          </h1>
          <p className="text-xs text-slate-800 font-serif">
            (An Autonomous Institution, Affiliated to Anna University, Chennai)
          </p>
        </div>

        {/* 3. BORDERED QUESTION PAPER CODE BOX (Center, matching photo) */}
        <div className="flex justify-center my-2">
          <div className="border border-slate-900 px-5 py-1 text-xs font-bold font-mono tracking-wide bg-white">
            Question Paper Code: {paper.exam_code || '23ALT501'}
          </div>
        </div>

        {/* 4. EXAM TITLE & ACADEMIC DETAILS (Centered, matching photo) */}
        <div className="text-center space-y-0.5 text-xs text-slate-900 font-serif">
          <div className="font-bold tracking-wider uppercase text-sm">
            {paper.exam_title || 'INTERNAL TEST - II'}
          </div>
          <div>
            Academic Year: {paper.academic_year || '2026 - 27 (ODD Semester)'}
          </div>
          <div>
            {paper.semester || 'Fifth Semester'}
          </div>
          <div>
            {paper.department_name || 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)'}
          </div>
          <div className="font-bold text-xs tracking-wider uppercase">
            {paper.subject_code} - {paper.subject_name}
          </div>
          <div className="italic text-slate-700">
            (Regulations 2023)
          </div>
        </div>

        {/* 5. TIME, DATE, MAX MARKS ROW (3 Columns, matching photo) */}
        <div className="flex justify-between items-center text-xs font-serif font-bold pt-2 border-t border-slate-300">
          <div>Time: {paper.duration_minutes} Mins.</div>
          <div>Date: {paper.date_str || '05-10-2026'}</div>
          <div>Max. Marks: {paper.total_marks}</div>
        </div>

        {/* 6. GENERAL DIRECTIVE */}
        <div className="text-center font-bold text-xs uppercase tracking-wider font-serif pt-1 border-b border-slate-200 pb-2">
          {paper.instructions || 'Answer ALL Questions'}
        </div>

        {/* ============================================================== */}
        {/* SECTIONS & QUESTIONS WITH INTERACTIVE EDITABLE QUESTION BAR */}
        {/* ============================================================== */}
        <div className="space-y-8 font-serif pt-2">
          {paper.sections?.map((sec, secIdx) => (
            <div key={sec.id || secIdx} className="space-y-4">
              {/* Section Header: PART - A (5 X 2 = 10 Marks), etc. */}
              <div className="text-center space-y-1">
                <div className="font-bold text-sm tracking-wider uppercase text-slate-950 font-serif">
                  {sec.section_title || `${sec.section_name} (${sec.total_questions_to_answer} X ${sec.marks_per_question} = ${sec.total_questions_to_answer * sec.marks_per_question} Marks)`}
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {sec.questions?.map((q, qIdx) => {
                  const isActive = activeQuestionId === q.id;

                  // Label logic matching the photo:
                  // Part A: "1.", "2."
                  // Part B/C: "6. (a)", "   (b)", "7. (b) (i)", "   (ii)"
                  let label = `${q.question_number}.`;
                  if (q.sub_part) {
                    if (q.choice_side === 'B') {
                      label = `${q.sub_part}`;
                    } else {
                      label = `${q.question_number}. ${q.sub_part}`;
                    }
                  }

                  return (
                    <div
                      key={q.id || qIdx}
                      className={`group relative p-3 rounded-md transition-all border-2 ${
                        isActive
                          ? 'bg-[#FDF5EF] border-[#C2571B] shadow-[2px_2px_0_#C2571B]'
                          : 'hover:bg-[#FDFBF7] border-transparent hover:border-[#2D3128]/30'
                      }`}
                      onClick={() => setActiveQuestionId(q.id)}
                    >
                      {/* ======================================================== */}
                      {/* INTERACTIVE EDITABLE QUESTION BAR (TOP ACTION DECK) */}
                      {/* ======================================================== */}
                      <div className="no-print mb-2 pb-2 border-b-2 border-[#2D3128]/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Course Outcome Selector */}
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#2D3128] shadow-[1px_1px_0_#2D3128]">
                            <span className="text-[10px] text-[#5B6354] font-mono font-bold uppercase">CO:</span>
                            <select
                              value={q.course_outcome || `CO${q.unit}`}
                              onChange={(e) => handleEditQuestion(secIdx, qIdx, 'course_outcome', e.target.value)}
                              className="bg-transparent font-mono font-bold text-[#84340A] text-xs focus:outline-none cursor-pointer"
                              title="Course Outcome"
                            >
                              <option value="CO1">CO1</option>
                              <option value="CO2">CO2</option>
                              <option value="CO3">CO3</option>
                              <option value="CO4">CO4</option>
                              <option value="CO5">CO5</option>
                            </select>
                          </div>

                          {/* Bloom's Taxonomy Selector */}
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#2D3128] shadow-[1px_1px_0_#2D3128]">
                            <span className="text-[10px] text-[#5B6354] font-mono font-bold uppercase">BT:</span>
                            <select
                              value={q.blooms_level || 'Understand'}
                              onChange={(e) => handleEditQuestion(secIdx, qIdx, 'blooms_level', e.target.value)}
                              className="bg-transparent font-mono font-bold text-[#1C1F24] text-xs focus:outline-none cursor-pointer"
                              title="Bloom's Taxonomy Level"
                            >
                              <option value="Remember">[RE] Remember</option>
                              <option value="Understand">[UN] Understand</option>
                              <option value="Apply">[AP] Apply</option>
                              <option value="Analyze">[AN] Analyze</option>
                              <option value="Evaluate">[EV] Evaluate</option>
                              <option value="Create">[CR] Create</option>
                            </select>
                          </div>

                          {/* Question Marks Editor */}
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#2D3128] shadow-[1px_1px_0_#2D3128]">
                            <span className="text-[10px] text-[#5B6354] font-mono font-bold uppercase">Marks:</span>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={q.marks}
                              onChange={(e) => handleEditQuestion(secIdx, qIdx, 'marks', Number(e.target.value))}
                              className="w-8 font-bold font-mono text-xs text-[#C2571B] bg-transparent text-center focus:outline-none"
                              title="Edit Marks for this question"
                            />
                          </div>

                          {/* Unit Selector */}
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#2D3128] shadow-[1px_1px_0_#2D3128]">
                            <span className="text-[10px] text-[#5B6354] font-mono font-bold uppercase">Unit:</span>
                            <select
                              value={q.unit || 1}
                              onChange={(e) => handleEditQuestion(secIdx, qIdx, 'unit', Number(e.target.value))}
                              className="bg-transparent font-mono font-bold text-[#1C1F24] text-xs focus:outline-none cursor-pointer"
                            >
                              {[1, 2, 3, 4, 5].map((u) => (
                                <option key={u} value={u}>Unit {u}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Bar Quick Actions */}
                        <div className="flex items-center gap-1">
                          {/* 🔄 Replace from Bank */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReplace(q);
                            }}
                            className="px-2 py-1 rounded bg-[#F7F3EC] hover:bg-[#EFE8DC] text-[#1C1F24] font-bold text-[11px] flex items-center gap-1 border border-[#2D3128] shadow-[1px_1px_0_#2D3128] transition-all"
                            title="Replace with matching question from uploaded Question Bank"
                          >
                            <RefreshCw className="w-3 h-3 text-[#C2571B]" /> Replace
                          </button>

                          {/* ✨ AI Regen */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerate(q);
                            }}
                            className="px-2 py-1 rounded bg-[#FDF5EF] hover:bg-[#FBE9DE] text-[#84340A] font-bold text-[11px] flex items-center gap-1 border border-[#C2571B] shadow-[1px_1px_0_#C2571B] transition-all"
                            title="Synthesize fresh alternative with AI"
                          >
                            <Sparkles className="w-3 h-3 text-[#C2571B]" />
                            {regeneratingQId === q.id ? 'Regen...' : 'AI Regen'}
                          </button>

                          {/* ✂️ Split Sub-Part (e.g. 16M -> (i) 8M + (ii) 8M) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSplitQuestion(secIdx, qIdx);
                            }}
                            className="px-2 py-1 rounded bg-[#EFF7F1] hover:bg-[#DFF1E4] text-[#2A6E3B] font-bold text-[11px] flex items-center gap-1 border border-[#2A6E3B] shadow-[1px_1px_0_#2A6E3B] transition-all"
                            title="Split into sub-divisions (i) and (ii) matching official photo pattern"
                          >
                            <Scissors className="w-3 h-3 text-[#2A6E3B]" /> Split (i)&(ii)
                          </button>

                          {/* Move Up / Down */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveQuestion(secIdx, qIdx, 'up');
                            }}
                            disabled={qIdx === 0}
                            className="p-1 rounded bg-white hover:bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24] shadow-[1px_1px_0_#2D3128] disabled:opacity-40"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveQuestion(secIdx, qIdx, 'down');
                            }}
                            disabled={qIdx === sec.questions.length - 1}
                            className="p-1 rounded bg-white hover:bg-[#EFE8DC] border border-[#2D3128] text-[#1C1F24] shadow-[1px_1px_0_#2D3128] disabled:opacity-40"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuestion(secIdx, qIdx);
                            }}
                            className="p-1 rounded bg-white hover:bg-rose-50 border border-rose-600 text-rose-700 shadow-[1px_1px_0_#2D3128]"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question Row (Exact Paper Statement & Right Margin Tags) */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {/* S.No / Sub-part label */}
                          <span className="font-bold text-sm min-w-[32px] text-slate-950 font-serif pt-1 select-none">
                            {label}
                          </span>

                          {/* Inline Question Statement Textarea */}
                          <textarea
                            rows={Math.max(1, Math.ceil(q.question_text.length / 85))}
                            value={q.question_text}
                            onChange={(e) => handleEditQuestion(secIdx, qIdx, 'question_text', e.target.value)}
                            placeholder="Type question statement here..."
                            className="w-full bg-transparent hover:bg-white/90 focus:bg-white p-1 rounded border border-transparent hover:border-[#2D3128]/30 focus:border-[#C2571B] outline-none text-sm leading-relaxed text-[#1C1F24] font-serif resize-none transition-all shadow-none focus:shadow-[1px_1px_0_#2D3128]"
                          />
                        </div>

                        {/* Right Margin Tags: e.g. (CO3) [AN] (8) */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold text-slate-800 font-serif pt-1 whitespace-nowrap">
                          <span>({q.course_outcome || `CO${q.unit}`})</span>
                          <span>[{q.blooms_level ? q.blooms_level.slice(0, 2).toUpperCase() : 'UN'}]</span>
                          {/* Marks in parens: For Part A, some papers omit marks or show (2); for Part B/C, show (8) or (16) */}
                          <span className="font-bold">({q.marks})</span>
                        </div>
                      </div>

                      {/* Centered OR for Either/Or Choice Pair */}
                      {q.is_or_choice && q.choice_side === 'A' && (
                        <div className="text-center font-bold text-xs tracking-widest text-slate-950 py-2 font-serif select-none">
                          OR
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Section Add Question Toolbar (no-print) */}
              <div className="no-print pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPickFromBank(sec.id)}
                  className="btn-secondary flex-1 py-2 px-3 text-xs"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1 text-[#C2571B]" /> Pick from Uploaded Bank
                </button>

                <button
                  type="button"
                  onClick={() => setAddingToSectionId(sec.id)}
                  className="btn-secondary flex-1 py-2 px-3 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#1C1F24]" /> Add Custom Question
                </button>

                <button
                  type="button"
                  onClick={() => handleAddOrPair(secIdx)}
                  className="btn-rust py-2 px-3 text-xs"
                >
                  <Split className="w-3.5 h-3.5 mr-1" /> + Add Either/Or Pair ((a) & (b))
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: REPLACE QUESTION FROM UPLOADED BANK */}
      {/* ============================================================== */}
      {replacingQuestion && (
        <div className="fixed inset-0 z-50 bg-[#1C1F24]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-md shadow-[6px_6px_0_#1C1F24] flex flex-col overflow-hidden border-2 border-[#2D3128] max-h-[85vh]">
            <div className="p-5 border-b-2 border-[#2D3128] flex items-center justify-between bg-[#EFE8DC]">
              <div>
                <h3 className="text-base font-bold font-serif text-[#1C1F24]">
                  Select Alternative Question from Bank
                </h3>
                <p className="text-xs text-[#5B6354] font-mono">
                  Unit {replacingQuestion.unit} • {replacingQuestion.marks} Marks • {replacingQuestion.course_outcome}
                </p>
              </div>
              <button
                onClick={() => setReplacingQuestion(null)}
                className="p-1.5 rounded bg-white border border-[#2D3128] text-[#1C1F24] hover:bg-[#EFE8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 bg-[#F7F3EC]">
              {isLoadingAlternatives ? (
                <div className="py-12 text-center text-[#8C9683] font-mono text-sm">
                  Searching bank for matching questions...
                </div>
              ) : alternatives.length === 0 ? (
                <div className="py-12 text-center text-[#5B6354] text-sm space-y-3">
                  <p>No alternative questions with exactly {replacingQuestion.marks} marks found in Unit {replacingQuestion.unit}.</p>
                  <button
                    onClick={() => {
                      handleRegenerate(replacingQuestion);
                      setReplacingQuestion(null);
                    }}
                    className="btn-rust px-4 py-2 text-xs"
                  >
                    <Sparkles className="w-4 h-4 mr-1 text-white" /> Synthesize Alternative with AI
                  </button>
                </div>
              ) : (
                alternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-4 rounded-md border-2 border-[#2D3128] bg-white hover:bg-[#FDFBF7] shadow-[2px_2px_0_#2D3128] transition-all flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => handleConfirmReplace(alt)}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-bold font-mono">
                        <span className="text-[#84340A] bg-[#FDF5EF] px-2 py-0.5 rounded border border-[#C2571B]">
                          Unit {alt.unit} • {alt.marks}M
                        </span>
                        <span className="text-[#2D3128] bg-[#EFE8DC] px-2 py-0.5 rounded border border-[#2D3128]">
                          ({alt.course_outcome})
                        </span>
                        <span className="text-[#2D3128] bg-[#EFE8DC] px-2 py-0.5 rounded border border-[#2D3128]">
                          [{alt.blooms_level ? alt.blooms_level.slice(0, 2).toUpperCase() : 'UN'}]
                        </span>
                        <span className="text-[#5B6354] font-serif">{alt.topic}</span>
                      </div>
                      <p className="text-sm font-medium text-[#1C1F24] leading-relaxed font-serif">
                        {alt.question_text}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-rust px-3 py-1.5 text-xs whitespace-nowrap"
                    >
                      Select
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PICK QUESTION FROM BANK FOR SECTION */}
      {/* ============================================================== */}
      {pickingFromBankSectionId !== null && (
        <div className="fixed inset-0 z-50 bg-[#1C1F24]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-md shadow-[6px_6px_0_#1C1F24] flex flex-col overflow-hidden border-2 border-[#2D3128] max-h-[85vh]">
            <div className="p-5 border-b-2 border-[#2D3128] flex items-center justify-between bg-[#EFE8DC]">
              <div>
                <h3 className="text-base font-bold font-serif text-[#1C1F24]">
                  Pick Question from Uploaded Question Bank
                </h3>
                <p className="text-xs text-[#5B6354]">
                  Select any question from your subject repository to add into this section
                </p>
              </div>
              <button
                onClick={() => setPickingFromBankSectionId(null)}
                className="p-1.5 rounded bg-white border border-[#2D3128] text-[#1C1F24] hover:bg-[#EFE8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter inputs */}
            <div className="p-4 border-b-2 border-[#2D3128] bg-[#F7F3EC] flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search question text or concept..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="flex-1 min-w-[200px] px-3.5 py-1.5 bg-white border-2 border-[#2D3128] rounded text-xs font-mono focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
              />
              <select
                value={bankMarksFilter}
                onChange={(e) => setBankMarksFilter(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-1.5 bg-white border-2 border-[#2D3128] rounded text-xs font-bold font-mono text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
              >
                <option value="">All Marks</option>
                <option value={2}>2 Marks</option>
                <option value={8}>8 Marks</option>
                <option value={13}>13 Marks</option>
                <option value={16}>16 Marks</option>
              </select>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 bg-[#F7F3EC]">
              {filteredBankQuestions.length === 0 ? (
                <div className="py-12 text-center text-[#8C9683] font-mono text-sm">
                  No questions match your filter.
                </div>
              ) : (
                filteredBankQuestions.map((bq) => (
                  <div
                    key={bq.id}
                    className="p-4 rounded-md border-2 border-[#2D3128] bg-white hover:bg-[#FDFBF7] shadow-[2px_2px_0_#2D3128] transition-all flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => handleConfirmAddFromBank(bq)}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-bold font-mono">
                        <span className="text-[#84340A] bg-[#FDF5EF] px-2 py-0.5 rounded border border-[#C2571B]">
                          Unit {bq.unit} • {bq.marks}M
                        </span>
                        <span className="text-[#2D3128] bg-[#EFE8DC] px-2 py-0.5 rounded border border-[#2D3128]">
                          ({bq.course_outcome})
                        </span>
                        <span className="text-[#2D3128] bg-[#EFE8DC] px-2 py-0.5 rounded border border-[#2D3128]">
                          [{bq.blooms_level ? bq.blooms_level.slice(0, 2).toUpperCase() : 'UN'}]
                        </span>
                        <span className="text-[#5B6354] truncate max-w-xs font-serif">{bq.topic}</span>
                      </div>
                      <p className="text-sm font-medium text-[#1C1F24] leading-relaxed font-serif">
                        {bq.question_text}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-rust px-3 py-1.5 text-xs whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ADD CUSTOM QUESTION */}
      {/* ============================================================== */}
      {addingToSectionId !== null && (
        <div className="fixed inset-0 z-50 bg-[#1C1F24]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-md shadow-[6px_6px_0_#1C1F24] flex flex-col overflow-hidden border-2 border-[#2D3128]">
            <div className="p-5 border-b-2 border-[#2D3128] flex items-center justify-between bg-[#EFE8DC]">
              <h3 className="text-base font-bold font-serif text-[#1C1F24]">
                Add Custom Question
              </h3>
              <button
                onClick={() => setAddingToSectionId(null)}
                className="p-1.5 rounded bg-white border border-[#2D3128] text-[#1C1F24] hover:bg-[#EFE8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-[#F7F3EC]">
              <div>
                <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">
                  Question Statement *
                </label>
                <textarea
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Enter complete question statement..."
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2D3128] rounded-md text-xs font-serif text-[#1C1F24] focus:outline-none focus:border-[#C2571B] shadow-[1px_1px_0_#2D3128]"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Marks</label>
                  <input
                    type="number"
                    value={newQuestionMarks}
                    onChange={(e) => setNewQuestionMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-bold font-mono text-[#1C1F24]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Unit</label>
                  <select
                    value={newQuestionUnit}
                    onChange={(e) => setNewQuestionUnit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-semibold text-[#1C1F24]"
                  >
                    {[1, 2, 3, 4, 5].map((u) => (
                      <option key={u} value={u}>Unit {u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Bloom's</label>
                  <select
                    value={newQuestionBlooms}
                    onChange={(e) => setNewQuestionBlooms(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-semibold text-[#1C1F24]"
                  >
                    <option value="Remember">Remember</option>
                    <option value="Understand">Understand</option>
                    <option value="Apply">Apply</option>
                    <option value="Analyze">Analyze</option>
                    <option value="Evaluate">Evaluate</option>
                    <option value="Create">Create</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingToSectionId(null)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomQuestionConfirm}
                  disabled={!newQuestionText.trim()}
                  className="btn-rust px-5 py-2 text-xs"
                >
                  Add Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: EDIT HEADER INFORMATION (COLLEGE, QP CODE, DATES) */}
      {/* ============================================================== */}
      {isHeaderModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1F24]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-md shadow-[6px_6px_0_#1C1F24] flex flex-col overflow-hidden border-2 border-[#2D3128] max-h-[85vh]">
            <div className="p-5 border-b-2 border-[#2D3128] flex items-center justify-between bg-[#EFE8DC]">
              <h3 className="text-base font-bold font-serif text-[#1C1F24]">
                Edit Examination Paper Header Details
              </h3>
              <button
                onClick={() => setIsHeaderModalOpen(false)}
                className="p-1.5 rounded bg-white border border-[#2D3128] text-[#1C1F24] hover:bg-[#EFE8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto bg-[#F7F3EC]">
              <div>
                <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Institution Name</label>
                <input
                  type="text"
                  value={paper.institution_name}
                  onChange={(e) => updatePaperState({ ...paper, institution_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-bold text-[#1C1F24]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Question Paper Code</label>
                  <input
                    type="text"
                    value={paper.exam_code}
                    onChange={(e) => updatePaperState({ ...paper, exam_code: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-mono font-bold text-[#84340A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Exam Title</label>
                  <input
                    type="text"
                    value={paper.exam_title || 'INTERNAL TEST - II'}
                    onChange={(e) => updatePaperState({ ...paper, exam_title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-bold text-[#1C1F24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={paper.academic_year}
                    onChange={(e) => updatePaperState({ ...paper, academic_year: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs text-[#1C1F24]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Semester</label>
                  <input
                    type="text"
                    value={paper.semester}
                    onChange={(e) => updatePaperState({ ...paper, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs text-[#1C1F24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Department / Degree</label>
                <input
                  type="text"
                  value={paper.department_name}
                  onChange={(e) => updatePaperState({ ...paper, department_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs text-[#1C1F24]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Subject Code</label>
                  <input
                    type="text"
                    value={paper.subject_code}
                    onChange={(e) => updatePaperState({ ...paper, subject_code: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-mono font-bold text-[#1C1F24]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={paper.subject_name}
                    onChange={(e) => updatePaperState({ ...paper, subject_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-bold text-[#1C1F24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={paper.duration_minutes}
                    onChange={(e) => updatePaperState({ ...paper, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-bold font-mono text-[#1C1F24]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Exam Date</label>
                  <input
                    type="text"
                    value={paper.date_str || '05-10-2026'}
                    onChange={(e) => updatePaperState({ ...paper, date_str: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-bold font-mono text-[#1C1F24]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={paper.total_marks}
                    onChange={(e) => updatePaperState({ ...paper, total_marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs font-bold font-mono text-[#84340A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold font-serif text-[#1C1F24] mb-1">Instructions</label>
                <input
                  type="text"
                  value={paper.instructions}
                  onChange={(e) => updatePaperState({ ...paper, instructions: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border-2 border-[#2D3128] rounded-md text-xs italic text-[#1C1F24]"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsHeaderModalOpen(false)}
                  className="btn-rust px-5 py-2 text-xs"
                >
                  Apply & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
