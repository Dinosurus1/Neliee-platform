# Setup

1. Levantar DB:
   docker compose up -d

2. Backend:
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload

3. Frontend:
   cd frontend
   npm install
   npm run dev