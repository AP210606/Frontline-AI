# 🚀 Frontline AI – Customer Support Triage System

An AI-powered Customer Support Triage System that automatically analyzes raw customer messages and converts them into structured support decisions using Google's Gemini AI.

Built for the **Frontline AI One-Day Build Challenge**.

---

## ✨ Features

- 🤖 AI-powered customer message analysis
- 📂 Single & Batch message processing (TXT / CSV)
- 🏷️ Automatic category classification
- ⚡ Priority prediction (P0–P3)
- 📝 AI-generated summary
- 🎯 Suggested support action
- 👨‍💼 Human escalation detection
- 📊 Confidence score visualization
- 📄 Structured JSON output
- 📈 Dashboard analytics
- 📚 Analysis history
- 📤 Export results as JSON / CSV
- 🛡️ Prompt injection protection
- ✅ JSON validation
- 📉 Evaluation mode with metrics

---

# 🛠️ Tech Stack

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express.js

### AI
- Google Gemini API

---

# 📁 Project Structure

```
Frontline-AI/
│
├── src/
│   ├── components/
│   ├── services/
│   ├── utils/
│   └── App.tsx
│
├── public/
├── server.ts
├── package.json
├── vite.config.ts
├── .env.example
└── README.md
```

---

# ⚙️ Prerequisites

Install the following before running the project:

- Node.js (v18 or above)
- npm
- Visual Studio Code

Check installation:

```bash
node -v
npm -v
```

---

# 🔑 Environment Variables

Create a `.env` file in the project root.

Example:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Replace `YOUR_GEMINI_API_KEY` with your own Google Gemini API key.

---

# 📥 Installation

Clone the repository:

```bash
git clone https://github.com/AP210606/Frontline-AI.git
```

Move into the project folder:

```bash
cd Frontline-AI
```

Install all dependencies:

```bash
npm install
```

---

# ▶️ Run the Project

Start the development server:

```bash
npm run dev
```

Wait until you see:

```
Frontline AI Server running on http://0.0.0.0:3000
```

Open your browser and visit:

```
http://localhost:3000
```

**Note:** Do **not** open `http://0.0.0.0:3000`. Always use `http://localhost:3000`.

---

# 🏗️ Production Build

Build the project:

```bash
npm run build
```

Run the production server:

```bash
npm start
```

Open:

```
http://localhost:3000
```

---

# 📊 How to Use

### 1. Open the application

```
http://localhost:3000
```

### 2. Enter a customer message

Example:

```
My package was supposed to arrive yesterday, but I still haven't received it.
```

### 3. Click **Analyze**

The AI will generate:

- Category
- Priority
- Summary
- Suggested Action
- Confidence Score
- Human Review Decision
- JSON Output

---

# 📂 Batch Processing

Upload:

- TXT
- CSV

The application processes each message independently.

Results can be exported as:

- JSON
- CSV

---

# 📄 Example Output

```json
{
  "category": "Shipping",
  "priority": "P1",
  "summary": "Customer reports delayed package delivery.",
  "suggested_action": "Forward to logistics team.",
  "needs_human": false,
  "confidence": 0.94
}
```

---

# 🧪 Evaluation Mode

The Evaluation Dashboard displays:

- Accuracy
- Precision
- Recall
- F1 Score
- Latency
- Confidence Distribution
- Failure Analysis

---

# 🛡️ AI Reliability

The system is designed to:

- Handle broken English
- Handle ambiguous requests
- Detect multiple issues
- Prevent hallucinations
- Detect prompt injection
- Validate JSON output
- Escalate low-confidence cases

---

# 📸 Screenshots

Add screenshots here after uploading them to the repository.

Example:

```
screenshots/dashboard.png
screenshots/analyzer.png
screenshots/evaluation.png
```

---

# 📜 Available Scripts

| Command | Description |
|----------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build production version |
| `npm start` | Run production server |

---

# 👨‍💻 Author

**AP210606**

GitHub:

https://github.com/AP210606

---

# 📄 License

This project is developed for educational and hackathon purposes.
