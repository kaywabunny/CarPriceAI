FROM python:3.11-slim

WORKDIR /app

# System deps (lightgbm often needs libgomp1)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first to avoid hash verification issues
RUN pip install --upgrade pip

# Copy requirements (supports both names)
COPY requirements.txt /app/requirements.txt
# If your file is actually named "requirements" (no .txt), use this line instead:
# COPY requirements /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
