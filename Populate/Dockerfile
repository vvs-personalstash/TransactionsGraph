FROM python:3.11-slim
WORKDIR /app
COPY populate.py generate_rows.py requirements.txt ./
RUN pip install -r requirements.txt
CMD ["python", "populate.py"]