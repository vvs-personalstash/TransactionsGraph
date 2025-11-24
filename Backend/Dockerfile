# Python Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY database.py .
COPY models.py .
COPY wait-for-neo4j.py .

# Expose port
EXPOSE 8080

# Run the wait script and then start the app
ENTRYPOINT ["python", "wait-for-neo4j.py"]

