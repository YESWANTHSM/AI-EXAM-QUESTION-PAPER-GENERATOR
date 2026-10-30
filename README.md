# AI-Based Question Paper Generator 🎓📄
### Academic Mini Project: Automated Outcome-Based Examination Question Paper Generation & Interactive Real-Time Editor

---

## 📌 Executive Summary

**AI-Based Question Paper Generator** is a full-stack, outcome-based academic platform designed for autonomous engineering colleges, universities, and educational institutions. It automates the preparation of balanced university-standard examination question papers strictly compliant with **Bloom’s Revised Taxonomy** and **Course Outcomes (CO1 to CO5)**.

Faculty members can ingest departmental Excel spreadsheets (`.xlsx`/`.xls`), Microsoft Word documents (`.docx`), PDFs, and syllabus files. The system intelligently extracts questions, analyzes sample paper formatting, balances section weightages, and synthesizes question papers with an **Interactive Document-Style Paper Editor** where individual questions can be edited inline, swapped with matching alternatives from the bank, regenerated using AI, reordered, and exported to official **PDF** and **Word (DOCX)** formats.

---

## 🚀 Key Features

### 1. Document Upload & Multi-Format Extraction
- **Supported Formats**: `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.txt`, `.csv`.
- **Dynamic Header Matcher**: Scans spreadsheets for column variants (*Question text*, *Marks*, *Unit*, *Topic*, *Cognitive Level*, *Course Outcome*, *Marking Rubrics*).
- **Format Structure Analyzer**: Parses uploaded sample papers to infer section hierarchy (e.g., Part A: 10 × 2M, Part B: 5 × 13M with Either/Or, Part C: 1 × 15M).
- **Sample Files Provided**: Pre-bundled test files (`CS3452_Theory_Of_Computation_Bank.xlsx`, `Sample_University_Exam_Pattern.docx`, `AI3001_Syllabus.txt`).

### 2. Central Academic Question Bank
- Multi-dimensional filters: Subject, Unit (1–5), Topic, Marks (2M, 8M, 13M, 15M, 16M), Difficulty (Easy, Medium, Hard), and Question Type.
- Full CRUD: Add, edit, delete, search, and export question banks in JSON format.

### 3. Dual-Mode Question Paper Generation Wizard
- **Mode A (Question Bank Mode)**: Strict deterministic assembly utilizing only validated questions from your uploaded bank (zero hallucinations).
- **Mode B (AI Generation Mode)**: Reference-driven procedural synthesis parameterized by cognitive difficulty tiers (*Easy*, *Medium*, *Hard*) with automated step-by-step evaluation rubrics.
- **Cognitive Balancing**: Interactive sliders to adjust Bloom's distribution (e.g. 30% Easy, 50% Medium, 20% Hard).

### 4. Interactive Document-Style Paper Editor (Centerpiece)
- **Official University Layout**: Authentic 12-digit register number box grid, QP code, course code, regulation disclaimer, and right-margin tags `(CO) [BT] (Marks)`.
- **Inline Editing**: Click any question statement to edit text directly.
- **Replace Question**: Opens ranked alternatives from the question bank matching the same marks, unit, and difficulty level.
- **AI Question Regeneration**: Synthesizes a fresh alternative question targeting the same topic and marks with full evaluation rubrics.
- **Live Marks Recalculation**: Adjusting question marks immediately updates section totals and grand total marks.
- **Reordering**: Move questions up or down within sections.
- **Undo / Redo History**: Complete state stack for editing freedom.
- **Database Persistence**: 1-click save persists edits to SQLite database.

### 5. Multi-Format Academic Export Engine
- **ReportLab PDF**: Pixel-perfect university standard exam sheet with official headers, instruction borders, and page geometry.
- **Microsoft Word (.docx)**: Fully editable Word document with styled tables and metadata.
- **Printable HTML Layout**: `@media print` layout suppressing web toolbars for direct clean paper printing.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Canvas Confetti |
| **Backend** | Python 3.14 / 3.10+, FastAPI, Uvicorn, SQLite3, SQLAlchemy 2.0 |
| **Document Processing** | OpenPyXL (Excel), PyPDF (PDF), Python-Docx (Word), CSV/IO |
| **Export Service** | ReportLab (PDF Generation), Python-Docx (Word Generation) |
| **AI / NLP Engine** | Hybrid: Offline Academic Procedural Synthesizer + Optional Google Gemini / OpenAI API integration |

---

## 📁 Project Directory Structure

```
d:/New folder/
├── backend/
│   ├── database.py              # SQLite & SQLAlchemy engine configuration
│   ├── models.py                # Database models (User, Subject, Question, Paper, Section, etc.)
│   ├── document_parser.py       # Multi-format parser (Excel, Word, PDF, Text)
│   ├── ai_engine.py             # Mode A & Mode B paper assembly & procedural synthesis
│   ├── export_service.py        # ReportLab PDF & python-docx export engines
│   ├── seed_data.py             # Realistic subjects, 40+ questions, and sample exam paper
│   ├── create_sample_files.py   # Generates sample test files (.xlsx, .docx, .txt)
│   ├── main.py                  # FastAPI REST API endpoints
│   ├── exam_generator.db        # SQLite database
│   ├── uploads/                 # Uploaded documents storage directory
│   └── sample_files/            # Downloadable sample question banks and model papers
├── frontend/
│   ├── src/
│   │   ├── types.ts             # TypeScript domain interfaces
│   │   ├── api.ts               # Frontend REST API client
│   │   ├── App.tsx              # Main application shell & tab routing
│   │   ├── index.css            # Tailwind styling, fonts & @media print rules
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      # Dark navy sidebar navigation
│   │   │   └── Navbar.tsx       # Top bar with institution stamp & status
│   │   └── views/
│   │       ├── DashboardView.tsx           # Real-time metrics & charts
│   │       ├── UploadDocumentsView.tsx     # Drag-and-drop document upload
│   │       ├── QuestionBankView.tsx        # Searchable question repository
│   │       ├── GeneratePaperWizardView.tsx # 6-Step generation wizard
│   │       ├── PaperEditorView.tsx         # Interactive live paper editor
│   │       ├── GeneratedPapersView.tsx     # Archived papers repository
│   │       └── SettingsView.tsx            # Institution letterhead settings
│   ├── public/
│   │   └── sample_files/        # Static downloadable sample files for testing
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.app.json
├── test_e2e.py                  # End-to-end automated verification script
└── README.md
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- Python 3.10+ (Python 3.14 verified)
- Node.js 18+ (Node v24.19 / npm verified)

### 2. Backend Setup & Startup

1. Open a terminal in the `backend` directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy pypdf python-docx openpyxl reportlab
   ```
3. Start the FastAPI backend server:
   ```bash
   py -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The database `exam_generator.db` is automatically created and seeded on initial startup.*
   Backend API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

### 3. Frontend Setup & Startup

1. Open a second terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web application at:
   👉 **`http://localhost:5173/`**

---

## 🧪 Testing the Application Workflow

1. **Dashboard**: Navigate to `http://localhost:5173/`. Observe live metrics (Total questions, available subjects, cognitive difficulty balance).
2. **Interactive Paper Editor**: Click **Paper Editor** in the sidebar. Notice the seeded sample paper (*CS3301 - Data Structures End Semester Exam*):
   - Click question text to edit inline.
   - Click **Replace** on any question to browse alternatives from the question bank matching that unit and marks.
   - Click **AI Regen** to synthesize a fresh question.
   - Click **PDF** or **Word** in the top control deck to download the actual formatted question paper.
3. **Upload Documents**: Go to **Upload Documents**, select a subject, and drag & drop `backend/sample_files/CS3452_Theory_Of_Computation_Bank.xlsx`. Click **Preview** to inspect the auto-extracted questions.
4. **Generate Paper Wizard**: Click **Generate Paper**, choose subject, select units, choose examination pattern, select Mode A or Mode B, and click **Generate Examination Paper**. You are redirected immediately to the editor with your synthesized paper!

---

## 🔒 Offline Demo Mode & Environment Variables

- **Zero Cloud Requirement**: The platform runs 100% offline using algorithmic procedural NLP synthesis.
- **Optional LLM API Keys**:
  If you wish to connect an external LLM for Mode B generation, configure your environment variables:
  ```bash
  set GEMINI_API_KEY="your-gemini-api-key"
  # or
  set OPENAI_API_KEY="your-openai-api-key"
  ```
  The system automatically detects keys and upgrades synthesis accordingly without any code changes.
