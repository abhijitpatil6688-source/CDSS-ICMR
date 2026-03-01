#!/bin/bash
# ICMR CDSS — Local Development Starter

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting ICMR CDSS..."
echo ""

# Kill any existing processes on our ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start backend
echo "[1/2] Starting Backend (FastAPI) on http://localhost:8000 ..."
cd "$ROOT/backend"
venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID"

sleep 2

# Start frontend
echo "[2/2] Starting Frontend (React) on http://localhost:5173 ..."
cd "$ROOT/web"
npm run dev &
FRONTEND_PID=$!
echo "      Frontend PID: $FRONTEND_PID"

echo ""
echo "======================================"
echo "  ICMR CDSS running!"
echo "  Web UI  : http://localhost:5173"
echo "  API     : http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "======================================"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait and cleanup on Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
