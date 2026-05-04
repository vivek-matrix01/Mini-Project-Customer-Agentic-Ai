# Mini-Project: Advanced Intelligence Engine Architecture & Flowchart

## 1. High-Level Architecture Overview
The project is built on a modern microservices architecture consisting of three main components:
1. **Frontend (React)**: Handles the UI, Chat interactions, and Analytics dashboard. Runs on `http://localhost:5173`.
2. **Main Backend API (Spring Boot/Java)**: Handles Authentication, Database transactions (PostgreSQL/MySQL), and serves as an API Gateway for the frontend. Runs on `http://localhost:8080`.
3. **AI LLM Microservice (FastAPI/Python)**: Uses Langchain and Ollama (`mistral` model) to perform NLP analysis on textual reviews. Runs on `http://localhost:8000`.

---

## 2. Endpoints Reference

### **Backend API (Spring Boot - Port 8080)**
* **POST /auth/login**
  * **Controller:** `AuthController.java`
  * **Payload:** `{ "email": "...", "password": "..." }`
  * **Description:** Authenticates user and returns an Authorization Token.
* **POST /user/register**
  * **Controller:** `UserController.java`
  * **Description:** Registers a new user.
* **GET /user/{id}**
  * **Controller:** `UserController.java`
  * **Description:** Fetches user details by ID.
* **POST /reviews**
  * **Controller:** `ReviewController.java`
  * **Payload:** `{ "productId": 123, "reviewText": "..." }`
  * **Headers:** `Authorization: Bearer <token>`
  * **Description:** Secures the entry point for review submission. Forwards the review text to the AI Microservice for NLP analysis, then saves all results to the database.
* **GET /analytics/{productId}**
  * **Controller:** `AnalyticsController.java`
  * **Description:** Aggregates and returns analytical data (sentiment counts, severity counts, top categories, top keywords) for a given product ID.

### **AI Microservice (FastAPI - Port 8000)**
* **POST /analyze**
  * **File:** `app.py`
  * **Payload:** `{ "review": "text to analyze" }`
  * **Description:** Invokes Langchain's Ollama model to analyze sentiment, categorize the complaint, calculate severity, extract keywords, and generate a 1-line summary. Returns formatted JSON.

---

## 3. Workflows (Textual Flowcharts)

### **Workflow A: User Authentication (Login)**
```text
[ React Frontend: Auth.jsx ]
         |
         | (1) User enters email/password & clicks 'Sign In'
         v
[ Spring Boot: AuthController ] --- POST http://localhost:8080/auth/login
         |
         | (2) Validates credentials against Database
         | (3) Generates Token
         v
[ React Frontend: Auth.jsx ]
         |
         | (4) Saves token in localStorage
         v
[ State App.jsx ] ---> Updates Active User -> Re-renders App Dashboard/Chat
```

### **Workflow B: Review Submission & AI Processing**
```text
[ React Frontend: App.jsx (Chat Tab)] 
         |
         | (1) User types review & Product ID -> clicks Send
         | (2) POST http://localhost:8080/reviews (Includes Auth Token)
         v
[ Spring Boot: ReviewController / ReviewService ]
         |
         | (3) Verifies Auth Token & Extracts User
         | (4) Constructs internal HTTP POST request
         |
         +-------------------------------------------------------------+
         |                                                             |
         | (5) POST http://localhost:8000/analyze                      |
         v                                                             v
[ FastAPI: app.py (/analyze) ]                                         |
         |                                                             |
         | (6) Injects review into PROMPT                              |
         | (7) Calls Local LLM -> ChatOllama(model="mistral")          |
         | (8) Parses LLM text response into standard JSON             |
         |       (Sentiment, Categories, Severity, Keywords, Summary)  |
         |                                                             |
         | (9) Returns structured JSON                                 |
         |                                                             |
         +-----------------------------+-------------------------------+
                                       |
                                       v
[ Spring Boot: ReviewService ] (Receives JSON)
         |
         | (10) Maps JSON to `Review` Java Entity
         | (11) Saves `Review` to Database (review table)
         | (12) Loops via parsed categories -> Saves mapped entities (review_category table)
         | (13) Loops via parsed keywords -> Saves mapped entities (review_keyword table)
         | (14) Returns completely saved Object back to Frontend
         v
[ React Frontend: App.jsx ]
         |
         | (15) Appends AI generated 'Summary' message in the Chat UI
         | (16) Triggers "Thank you" Success Snackbar
```

### **Workflow C: Viewing Analytics Dashboard**
```text
[ React Frontend: Dashboard.jsx ]
         |
         | (1) User enters Product ID & clicks 'Search'
         | (2) GET http://localhost:8080/analytics/{productId}
         v
[ Spring Boot: AnalyticsController ]
         |
         | (3) Executes native SQL GroupBy Queries via JdbcTemplate:
         |      - Count(*) Group by Sentiment
         |      - Count(*) Group by Severity
         |      - Count(*) Group by category_name (JOIN queries)
         |      - Count(*) Group by keyword (JOIN Queries + Limit 10)
         |
         | (4) Returns Map<String, Object> containing nested Arrays
         v
[ React Frontend: Dashboard.jsx ]
         |
         | (5) State receives JSON data
         | (6) Data parsed through `convert()` & `getInsight()` methods
         | (7) Renders Recharts (PieCharts & BarCharts) on the DOM
```

---

## 4. Database Interaction Flow 
```text
[ Review Submission ]
   |
   +---> INSERT INTO review (product_id, review_text, sentiment, severity, summary, user_id)
   |
   +---> INSERT INTO review_category (review_id, category_name)
   |
   +---> INSERT INTO review_keyword (review_id, keyword)

[ Dashboard Analytics ]
   |
   +---> SELECT count(*) FROM review WHERE product_id = X GROUP BY sentiment
   |
   +---> SELECT count(*) FROM review_category JOIN review ... GROUP BY category_name
   |
   +---> SELECT count(*) FROM review_keyword JOIN review ... GROUP BY keyword
```
