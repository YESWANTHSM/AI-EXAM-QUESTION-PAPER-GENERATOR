import os
import re
import io
import csv
from typing import List, Dict, Any, Tuple
import openpyxl
from pypdf import PdfReader
from docx import Document

BLOOMS_KEYWORDS = {
    "Remember": ["define", "state", "list", "name", "recall", "identify", "what is", "mention", "write short note on"],
    "Understand": ["explain", "describe", "discuss", "distinguish", "differentiate", "summarize", "illustrate", "classify", "compare"],
    "Apply": ["calculate", "compute", "solve", "apply", "demonstrate", "implement", "construct", "show how", "determine"],
    "Analyze": ["analyze", "examine", "compare and contrast", "investigate", "categorize", "outline", "deduce", "differentiate between"],
    "Evaluate": ["evaluate", "justify", "critically analyze", "assess", "judge", "rate", "validate", "recommend"],
    "Create": ["design", "formulate", "develop", "synthesize", "compose", "devise", "propose"]
}

BLOOMS_SHORT_CODE = {
    "AN": "Analyze",
    "EV": "Evaluate",
    "AP": "Apply",
    "UN": "Understand",
    "U": "Understand",
    "RE": "Remember",
    "R": "Remember",
    "CR": "Create",
    "C": "Create"
}

def infer_blooms_and_difficulty(question_text: str, marks: int) -> Tuple[str, str]:
    """Infers Bloom's Taxonomy cognitive level and difficulty level from text and marks."""
    q_str = str(question_text).strip()
    
    # 1. Check for explicit bracketed Bloom's tags e.g. [AN], [EV], [AP], [UN], [RE], [CR]
    tag_match = re.search(r"\[(AN|EV|AP|UN|RE|CR|U|R|Analyze|Evaluate|Apply|Understand|Remember|Create)\]", q_str, re.IGNORECASE)
    if tag_match:
        tag_val = tag_match.group(1).upper()
        blooms = BLOOMS_SHORT_CODE.get(tag_val, tag_val.capitalize())
    else:
        q_lower = q_str.lower()
        blooms = "Understand"
        for level, keywords in BLOOMS_KEYWORDS.items():
            if any(re.search(r"\b" + re.escape(kw) + r"\b", q_lower) for kw in keywords):
                blooms = level
                break

    # Difficulty inference based on marks and cognitive level
    if marks <= 2:
        if blooms in ["Remember", "Understand"]:
            difficulty = "Easy"
        else:
            difficulty = "Medium"
    elif marks <= 8:
        if blooms in ["Remember", "Understand"]:
            difficulty = "Easy"
        elif blooms in ["Apply", "Analyze"]:
            difficulty = "Medium"
        else:
            difficulty = "Hard"
    else: # 13, 15, 16 marks
        if blooms in ["Apply", "Analyze"]:
            difficulty = "Medium"
        elif blooms in ["Evaluate", "Create"]:
            difficulty = "Hard"
        else:
            difficulty = "Medium"

    return blooms, difficulty

def infer_question_type(marks: int, question_text: str) -> str:
    """Infers academic question type."""
    q_lower = question_text.lower()
    if "(a)" in q_lower and "(b)" in q_lower and "(c)" in q_lower:
        return "Multiple Choice Questions"
    if "program" in q_lower or "code" in q_lower or "algorithm" in q_lower or "write a c" in q_lower or "write a python" in q_lower:
        return "Programming Questions"
    if marks <= 2:
        return "Very Short Answer" if marks == 1 else "Short Answer"
    elif marks <= 8:
        return "Long Answer"
    else:
        return "Essay Questions"

def clean_text(text: str) -> str:
    """Cleans up raw text, normalizes whitespace."""
    if not text:
        return ""
    text = re.sub(r"\r\n|\r", "\n", str(text))
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

class DocumentParser:
    """Parses various academic documents into structured questions or format blueprints."""

    @staticmethod
    def parse_file(file_path: str, doc_category: str = "question_bank", default_subject_id: int = 1) -> Dict[str, Any]:
        """Entry point for parsing any supported file type."""
        ext = os.path.splitext(file_path)[1].lower()
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = os.path.getsize(file_path)
        extracted_questions = []
        metadata = {}

        try:
            if ext in [".xlsx", ".xls"]:
                extracted_questions, metadata = DocumentParser.parse_excel(file_path)
            elif ext == ".pdf":
                extracted_questions, metadata = DocumentParser.parse_pdf(file_path, doc_category)
            elif ext in [".docx", ".doc"]:
                extracted_questions, metadata = DocumentParser.parse_docx(file_path, doc_category)
            elif ext in [".txt", ".csv"]:
                extracted_questions, metadata = DocumentParser.parse_txt_csv(file_path)
            else:
                raise ValueError(f"Unsupported file format: {ext}")

            return {
                "success": True,
                "file_type": ext.replace(".", ""),
                "file_size": file_size,
                "questions": extracted_questions,
                "metadata": metadata,
                "extracted_count": len(extracted_questions)
            }
        except Exception as e:
            return {
                "success": False,
                "file_type": ext.replace(".", ""),
                "file_size": file_size,
                "questions": [],
                "metadata": {},
                "extracted_count": 0,
                "error": str(e)
            }

    @staticmethod
    def parse_excel(file_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Parses Excel question banks with intelligent fuzzy column header detection."""
        wb = openpyxl.load_workbook(file_path, data_only=True)
        questions = []
        metadata = {"sheets": wb.sheetnames}

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                continue

            # Detect unit from sheet name if applicable (e.g. "Unit 1", "Unit 2")
            sheet_unit_match = re.search(r"unit\s*(\d+)", sheet_name, re.IGNORECASE)
            sheet_unit = int(sheet_unit_match.group(1)) if sheet_unit_match else None

            # Find header row in first 15 rows
            header_row_idx = -1
            col_map = {}
            for idx, row in enumerate(rows[:15]):
                if not row:
                    continue
                row_strs = [str(cell).strip().lower() if cell is not None else "" for cell in row]
                # Look for question column
                for c_idx, val in enumerate(row_strs):
                    if any(k in val for k in ["question", "particulars", "description", "statement", "problem"]):
                        header_row_idx = idx
                        break
                if header_row_idx != -1:
                    # Map all columns
                    for c_idx, val in enumerate(row_strs):
                        if any(k in val for k in ["question", "particulars", "description", "statement", "problem"]):
                            col_map["question"] = c_idx
                        elif any(k in val for k in ["mark", "weightage", "max marks"]):
                            col_map["marks"] = c_idx
                        elif any(k in val for k in ["unit", "module", "chapter"]):
                            col_map["unit"] = c_idx
                        elif any(k in val for k in ["topic", "concept", "subtopic"]):
                            col_map["topic"] = c_idx
                        elif any(k in val for k in ["bloom", "cognitive", "bt", "level"]):
                            col_map["blooms"] = c_idx
                        elif any(k in val for k in ["co", "course outcome", "outcome"]):
                            col_map["co"] = c_idx
                        elif any(k in val for k in ["diff", "difficulty", "tier"]):
                            col_map["difficulty"] = c_idx
                        elif any(k in val for k in ["type", "question type"]):
                            col_map["type"] = c_idx
                        elif any(k in val for k in ["answer", "key", "rubric", "solution"]):
                            col_map["rubric"] = c_idx
                    break

            # If header found, extract rows
            if header_row_idx != -1 and "question" in col_map:
                for row in rows[header_row_idx + 1:]:
                    if not row or row[col_map["question"]] is None:
                        continue
                    q_text = clean_text(row[col_map["question"]])
                    if len(q_text) < 5:
                        continue

                    # Marks
                    raw_marks = row[col_map["marks"]] if "marks" in col_map and row[col_map["marks"]] is not None else 2
                    try:
                        marks = int(float(raw_marks))
                    except:
                        marks = 2

                    # Unit
                    unit = sheet_unit or 1
                    if "unit" in col_map and row[col_map["unit"]] is not None:
                        try:
                            u_str = str(row[col_map["unit"]])
                            u_match = re.search(r"\d+", u_str)
                            if u_match:
                                unit = int(u_match.group(0))
                        except:
                            pass

                    # Topic
                    topic = str(row[col_map["topic"]]).strip() if "topic" in col_map and row[col_map["topic"]] is not None else f"Unit {unit} Core Concepts"

                    # Bloom's & Difficulty
                    blooms = str(row[col_map["blooms"]]).strip() if "blooms" in col_map and row[col_map["blooms"]] is not None else None
                    diff = str(row[col_map["difficulty"]]).strip() if "difficulty" in col_map and row[col_map["difficulty"]] is not None else None
                    if not blooms or not diff:
                        inferred_blooms, inferred_diff = infer_blooms_and_difficulty(q_text, marks)
                        blooms = blooms or inferred_blooms
                        diff = diff or inferred_diff

                    # CO
                    co = str(row[col_map["co"]]).strip().upper() if "co" in col_map and row[col_map["co"]] is not None else f"CO{unit}"
                    if not co.startswith("CO"):
                        co = f"CO{co}"

                    q_type = str(row[col_map["type"]]).strip() if "type" in col_map and row[col_map["type"]] is not None else infer_question_type(marks, q_text)
                    rubric = str(row[col_map["rubric"]]).strip() if "rubric" in col_map and row[col_map["rubric"]] is not None else f"Accurate concept explanation with diagrams/formulation: {marks} Marks"

                    questions.append({
                        "question_text": q_text,
                        "marks": marks,
                        "unit": unit,
                        "topic": topic,
                        "difficulty": diff.capitalize(),
                        "blooms_level": blooms.capitalize(),
                        "course_outcome": co,
                        "question_type": q_type,
                        "sample_answer": rubric,
                        "rubric_json": rubric
                    })
        return questions, metadata

    @staticmethod
    def parse_text(text: str, default_subject_id: int = 1) -> Dict[str, Any]:
        """Parses raw question text pasted directly by user."""
        try:
            questions = DocumentParser.extract_questions_from_text(text)
            return {
                "success": True,
                "questions": questions,
                "extracted_count": len(questions),
                "metadata": {"source": "direct_text_input"}
            }
        except Exception as e:
            return {
                "success": False,
                "questions": [],
                "extracted_count": 0,
                "error": str(e)
            }

    @staticmethod
    def parse_docx(file_path: str, doc_category: str = "question_bank") -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Parses Word document (.docx). Extracts questions from paragraphs and tables."""
        doc = Document(file_path)
        full_text = []
        questions = []
        metadata = {}

        # 1. First check if any table is a structured question bank table
        for table in doc.tables:
            if not table.rows or len(table.rows) < 2:
                continue
            first_row_cells = [clean_text(cell.text).lower() for cell in table.rows[0].cells]
            
            # Check if this table has a Question column
            q_col_idx = next((i for i, c in enumerate(first_row_cells) if any(k in c for k in ["question", "particular", "problem", "statement"])), -1)
            
            if q_col_idx != -1:
                # Map other columns in header
                m_col = next((i for i, c in enumerate(first_row_cells) if any(k in c for k in ["mark", "weightage", "max marks"])), -1)
                u_col = next((i for i, c in enumerate(first_row_cells) if any(k in c for k in ["unit", "module", "chapter"])), -1)
                co_col = next((i for i, c in enumerate(first_row_cells) if any(k in c for k in ["co", "outcome", "course outcome"])), -1)
                bl_col = next((i for i, c in enumerate(first_row_cells) if any(k in c for k in ["bloom", "cognitive", "bt", "level"])), -1)
                diff_col = next((i for i, c in enumerate(first_row_cells) if any(k in c for k in ["diff", "difficulty", "tier"])), -1)

                for row in table.rows[1:]:
                    cells = [clean_text(cell.text) for cell in row.cells]
                    if len(cells) > q_col_idx and len(cells[q_col_idx]) > 5:
                        q_raw = cells[q_col_idx]
                        
                        # Extract marks
                        m_val = 2
                        if m_col != -1 and len(cells) > m_col:
                            m_match = re.search(r"\d+", cells[m_col])
                            if m_match:
                                m_val = int(m_match.group(0))
                                
                        # Extract unit
                        u_val = 1
                        if u_col != -1 and len(cells) > u_col:
                            u_match = re.search(r"\d+", cells[u_col])
                            if u_match:
                                u_val = int(u_match.group(0))
                                
                        co_val = cells[co_col].upper() if co_col != -1 and len(cells) > co_col and cells[co_col] else f"CO{u_val}"
                        if not co_val.startswith("CO"):
                            co_val = f"CO{co_val}"
                            
                        bl_val = cells[bl_col].capitalize() if bl_col != -1 and len(cells) > bl_col and cells[bl_col] else None
                        diff_val = cells[diff_col].capitalize() if diff_col != -1 and len(cells) > diff_col and cells[diff_col] else None
                        
                        if not bl_val or not diff_val:
                            inferred_b, inferred_d = infer_blooms_and_difficulty(q_raw, m_val)
                            bl_val = bl_val or inferred_b
                            diff_val = diff_val or inferred_d
                            
                        questions.append({
                            "question_text": q_raw,
                            "marks": m_val,
                            "unit": u_val,
                            "topic": f"Unit {u_val} Concepts",
                            "difficulty": diff_val,
                            "blooms_level": bl_val,
                            "course_outcome": co_val,
                            "question_type": infer_question_type(m_val, q_raw),
                            "sample_answer": f"Evaluation based on key criteria: {m_val} Marks",
                            "rubric_json": f"Evaluation based on key criteria: {m_val} Marks"
                        })
            else:
                # Unstructured table: concatenate text rows
                for row in table.rows:
                    cells = [clean_text(cell.text) for cell in row.cells if clean_text(cell.text)]
                    if len(cells) >= 2:
                        full_text.append(" | ".join(cells))

        # 2. Extract paragraphs
        for p in doc.paragraphs:
            text = clean_text(p.text)
            if text:
                full_text.append(text)

        combined_text = "\n".join(full_text)
        if doc_category == "sample_paper":
            metadata = DocumentParser.extract_sample_paper_structure(combined_text)

        text_questions = DocumentParser.extract_questions_from_text(combined_text)
        
        # Merge table questions and text questions avoiding duplicates
        existing_texts = {q["question_text"].lower().strip() for q in questions}
        for tq in text_questions:
            if tq["question_text"].lower().strip() not in existing_texts:
                questions.append(tq)
                existing_texts.add(tq["question_text"].lower().strip())

        return questions, metadata

    @staticmethod
    def parse_pdf(file_path: str, doc_category: str = "question_bank") -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Parses PDF documents using PyPDF."""
        reader = PdfReader(file_path)
        extracted_text_pages = []
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_text_pages.append(page_text)

        combined_text = "\n".join(extracted_text_pages)
        metadata = {"total_pages": len(reader.pages)}

        if doc_category == "sample_paper":
            metadata.update(DocumentParser.extract_sample_paper_structure(combined_text))

        questions = DocumentParser.extract_questions_from_text(combined_text)
        return questions, metadata

    @staticmethod
    def parse_txt_csv(file_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Parses plain text or CSV questions."""
        ext = os.path.splitext(file_path)[1].lower()
        questions = []
        metadata = {}

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        if ext == ".csv":
            reader = csv.reader(io.StringIO(content))
            rows = list(reader)
            if rows:
                header = [c.strip().lower() for c in rows[0]]
                q_idx = next((i for i, c in enumerate(header) if "question" in c), -1)
                m_idx = next((i for i, c in enumerate(header) if "mark" in c), -1)
                u_idx = next((i for i, c in enumerate(header) if "unit" in c), -1)
                if q_idx != -1:
                    for row in rows[1:]:
                        if len(row) > q_idx and row[q_idx].strip():
                            q_text = row[q_idx].strip()
                            marks = int(row[m_idx]) if m_idx != -1 and len(row) > m_idx and row[m_idx].isdigit() else 2
                            unit = int(row[u_idx]) if u_idx != -1 and len(row) > u_idx and row[u_idx].isdigit() else 1
                            blooms, diff = infer_blooms_and_difficulty(q_text, marks)
                            questions.append({
                                "question_text": q_text,
                                "marks": marks,
                                "unit": unit,
                                "topic": f"Unit {unit} Concepts",
                                "difficulty": diff,
                                "blooms_level": blooms,
                                "course_outcome": f"CO{unit}",
                                "question_type": infer_question_type(marks, q_text),
                                "sample_answer": f"Evaluation based on key criteria: {marks} Marks",
                                "rubric_json": f"Evaluation based on key criteria: {marks} Marks"
                            })
                    return questions, metadata

        questions = DocumentParser.extract_questions_from_text(content)
        return questions, metadata

    @staticmethod
    def extract_questions_from_text(text: str) -> List[Dict[str, Any]]:
        """Regex and NLP extraction of questions from unstructured academic text."""
        lines = text.split("\n")
        questions = []
        current_unit = 1
        current_marks = 2

        # Pattern to detect section/part headers like PART - A, PART - B, PART - C, 2 Marks, 8 Marks, 16 Marks
        part_pattern = re.compile(r"^\s*(?:PART|SECTION)\s*[-–:]?\s*([A-C1-3])", re.IGNORECASE)
        explicit_marks_hdr = re.compile(r"(\d+)\s*(?:marks?|m)\b", re.IGNORECASE)

        # Pattern to split questions: e.g. "1. Define ...", "Q2. Explain ...", "(3) Discuss ...", "6. (a) ...", "(a) ...", "(i) ..."
        q_pattern = re.compile(
            r"^(?:(?:Q(?:uestion)?\.?\s*)?(\d{1,3})[\.\)\:]\s*(?:\(([a-d])\)\s*)?|(?:\((\d{1,3})\)\s*)|(?:\(([a-d])\)\s*(?:\(([i|v|x]+)\)\s*)?)|(?:\(([i|v|x]+)\)\s*))(.*)",
            re.IGNORECASE
        )
        unit_pattern = re.compile(r"(?:UNIT|MODULE|CHAPTER)\s*[-:]?\s*([I|V|X|\d]+)", re.IGNORECASE)
        
        # Tags at end or inline
        marks_pattern = re.compile(r"(?:\[|\()(\d+)\s*(?:marks?|m)?(?:\]|\))(?:\s*$)?", re.IGNORECASE)
        co_pattern = re.compile(r"(?:\[|\()?(CO[1-5])(?:\]|\))?", re.IGNORECASE)
        blooms_pattern = re.compile(r"\[(AN|EV|AP|UN|RE|CR|U|R|Analyze|Evaluate|Apply|Understand|Remember|Create)\]", re.IGNORECASE)

        roman_map = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5}

        current_q_text = []
        current_q_meta = {}

        def save_current_q():
            if current_q_text:
                full_q = " ".join(current_q_text).strip()
                # Clean trailing tags e.g. "(CO3) [AN] (8)" or "(CO3) [AN]" or "(16)"
                cleaned_q = full_q
                cleaned_q = re.sub(r"\(CO[1-5]\)", "", cleaned_q, flags=re.IGNORECASE).strip()
                cleaned_q = re.sub(r"\[(?:AN|EV|AP|UN|RE|CR|U|R|Analyze|Evaluate|Apply|Understand|Remember|Create)\]", "", cleaned_q, flags=re.IGNORECASE).strip()
                cleaned_q = re.sub(r"\(\d+\s*(?:marks?|m)?\)\s*$", "", cleaned_q, flags=re.IGNORECASE).strip()
                cleaned_q = re.sub(r"\[\d+\s*(?:marks?|m)?\]\s*$", "", cleaned_q, flags=re.IGNORECASE).strip()
                cleaned_q = re.sub(r"\s+", " ", cleaned_q).strip()

                if len(cleaned_q) > 8 and not cleaned_q.lower().startswith(("table", "page", "reg. no", "roll no", "internal test", "max. marks")):
                    marks = current_q_meta.get("marks", current_marks)
                    unit = current_q_meta.get("unit", current_unit)
                    co = current_q_meta.get("co", f"CO{unit}")
                    blooms = current_q_meta.get("blooms")
                    diff = current_q_meta.get("difficulty")
                    if not blooms or not diff:
                        inferred_b, inferred_d = infer_blooms_and_difficulty(full_q, marks)
                        blooms = blooms or inferred_b
                        diff = diff or inferred_d

                    questions.append({
                        "question_text": cleaned_q,
                        "marks": marks,
                        "unit": unit,
                        "topic": f"Unit {unit} Concepts",
                        "difficulty": diff,
                        "blooms_level": blooms,
                        "course_outcome": co,
                        "question_type": infer_question_type(marks, cleaned_q),
                        "sample_answer": f"Standard academic solution rubric: {marks} Marks",
                        "rubric_json": f"Standard academic solution rubric: {marks} Marks"
                    })
                current_q_text.clear()
                current_q_meta.clear()

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            # Skip standalone "OR" lines
            if line_str.upper() in ["OR", "(OR)"]:
                continue

            # Check unit change
            u_match = unit_pattern.search(line_str)
            if u_match:
                u_val = u_match.group(1).upper()
                current_unit = roman_map.get(u_val, int(u_val) if u_val.isdigit() else current_unit)
                continue

            # Check Part / Section heading and update default marks accordingly
            part_m = part_pattern.search(line_str)
            if part_m:
                part_char = part_m.group(1).upper()
                if part_char == "A":
                    current_marks = 2
                elif part_char == "B":
                    current_marks = 8
                elif part_char == "C":
                    current_marks = 16
                
                # If explicit marks mentioned in header (e.g. "5 X 2 = 10 Marks", "8 Marks", "16 Marks")
                hdr_marks = explicit_marks_hdr.findall(line_str)
                if hdr_marks:
                    # Look for question weightage e.g. 2, 8, 13, 15, 16
                    for hm in hdr_marks:
                        h_val = int(hm)
                        if h_val in [2, 8, 13, 15, 16]:
                            current_marks = h_val
                            break
                continue

            # Check question start
            q_match = q_pattern.match(line_str)
            if q_match:
                save_current_q()
                # body is the last matched group
                q_body = q_match.group(len(q_match.groups())) or ""

                # Extract Bloom's tag
                b_match = blooms_pattern.search(line_str)
                if b_match:
                    tag_val = b_match.group(1).upper()
                    current_q_meta["blooms"] = BLOOMS_SHORT_CODE.get(tag_val, tag_val.capitalize())

                # Extract CO tag
                co_m = co_pattern.search(line_str)
                if co_m:
                    current_q_meta["co"] = co_m.group(1).upper()

                # Extract inline marks (e.g. (8) or (16) or [2 Marks])
                m_matches = marks_pattern.findall(line_str)
                if m_matches:
                    for mv in m_matches:
                        val = int(mv)
                        if val in [1, 2, 3, 5, 8, 10, 12, 13, 15, 16, 20]:
                            current_q_meta["marks"] = val

                current_q_meta["unit"] = current_unit
                current_q_text.append(q_body)
            else:
                if current_q_text:
                    # Append continuation line
                    # check for tags on continuation line
                    b_match = blooms_pattern.search(line_str)
                    if b_match and "blooms" not in current_q_meta:
                        tag_val = b_match.group(1).upper()
                        current_q_meta["blooms"] = BLOOMS_SHORT_CODE.get(tag_val, tag_val.capitalize())

                    co_m = co_pattern.search(line_str)
                    if co_m and "co" not in current_q_meta:
                        current_q_meta["co"] = co_m.group(1).upper()

                    m_matches = marks_pattern.findall(line_str)
                    if m_matches and "marks" not in current_q_meta:
                        for mv in m_matches:
                            val = int(mv)
                            if val in [1, 2, 3, 5, 8, 10, 12, 13, 15, 16, 20]:
                                current_q_meta["marks"] = val

                    current_q_text.append(line_str)

        save_current_q()
        return questions

        save_current_q()
        return questions

    @staticmethod
    def extract_sample_paper_structure(text: str) -> Dict[str, Any]:
        """Analyzes an uploaded sample paper to extract section hierarchy, marks distribution and exam headers."""
        pattern = {
            "institution_name": "Autonomous Engineering Examinations",
            "department_name": "Department of Computer Science & Engineering",
            "exam_title": "End Semester Degree Examination",
            "duration_minutes": 180,
            "total_marks": 100,
            "sections": []
        }

        # Header detection
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        for line in lines[:10]:
            if any(k in line.lower() for k in ["college", "university", "institute", "academy"]):
                pattern["institution_name"] = line
            elif any(k in line.lower() for k in ["department", "school of"]):
                pattern["department_name"] = line
            elif any(k in line.lower() for k in ["examination", "semester", "assessment"]):
                pattern["exam_title"] = line
            elif "max. marks" in line.lower() or "maximum marks" in line.lower():
                m_match = re.search(r"(\d+)", line)
                if m_match:
                    pattern["total_marks"] = int(m_match.group(1))

        # Detect sections like PART - A, PART - B, PART - C, SECTION 1, etc.
        section_matches = list(re.finditer(r"(PART\s*[-–]\s*[A-C]|SECTION\s*[-–]?\s*[A-C1-3])", text, re.IGNORECASE))
        if section_matches:
            for idx, sm in enumerate(section_matches):
                sec_name = sm.group(1).upper()
                start_pos = sm.start()
                end_pos = section_matches[idx + 1].start() if idx + 1 < len(section_matches) else len(text)
                sec_text = text[start_pos:end_pos]

                # Find marks formula like "10 x 2 = 20" or "5 x 13 = 65" or "5 x 16 = 80"
                formula_match = re.search(r"(\d+)\s*[xX*×]\s*(\d+)\s*=\s*(\d+)", sec_text)
                if formula_match:
                    q_count = int(formula_match.group(1))
                    marks_each = int(formula_match.group(2))
                    total_sec_marks = int(formula_match.group(3))
                else:
                    # fallback based on Part letter
                    if "A" in sec_name:
                        q_count, marks_each, total_sec_marks = 10, 2, 20
                    elif "B" in sec_name:
                        q_count, marks_each, total_sec_marks = 5, 13, 65
                    else:
                        q_count, marks_each, total_sec_marks = 1, 15, 15

                pattern["sections"].append({
                    "section_name": sec_name,
                    "section_title": f"{sec_name} ({q_count} × {marks_each} = {total_sec_marks} Marks)",
                    "instructions": f"Answer ALL questions ({q_count} × {marks_each} = {total_sec_marks} Marks)",
                    "total_questions_to_answer": q_count,
                    "total_questions": q_count if "A" in sec_name else q_count * 2, # either/or has 2x options
                    "marks_per_question": marks_each,
                    "has_either_or": ("B" in sec_name or "C" in sec_name)
                })
        else:
            # Default standard autonomous Anna University format
            pattern["sections"] = [
                {
                    "section_name": "PART - A",
                    "section_title": "Short Answer Questions (10 × 2 = 20 Marks)",
                    "instructions": "Answer ALL questions (10 × 2 = 20 Marks)",
                    "total_questions_to_answer": 10,
                    "total_questions": 10,
                    "marks_per_question": 2,
                    "has_either_or": False
                },
                {
                    "section_name": "PART - B",
                    "section_title": "Descriptive / Analytical Questions (5 × 13 = 65 Marks)",
                    "instructions": "Answer ALL questions. Either / Or choice for each question (5 × 13 = 65 Marks)",
                    "total_questions_to_answer": 5,
                    "total_questions": 10,
                    "marks_per_question": 13,
                    "has_either_or": True
                },
                {
                    "section_name": "PART - C",
                    "section_title": "Application / Design Case Study (1 × 15 = 15 Marks)",
                    "instructions": "Comprehensive evaluation. Either / Or choice (1 × 15 = 15 Marks)",
                    "total_questions_to_answer": 1,
                    "total_questions": 2,
                    "marks_per_question": 15,
                    "has_either_or": True
                }
            ]

        return pattern
