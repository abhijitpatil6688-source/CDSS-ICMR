FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --prefer-binary --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080
# Cloud Run injects $PORT (default 8080); fall back to 8000 for local docker run
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
