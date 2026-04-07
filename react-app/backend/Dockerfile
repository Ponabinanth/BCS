FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY . /app
RUN python -m pip install --upgrade pip && \
    pip install -r requirements.txt
EXPOSE 5501
ENV FLASK_ENV=development
CMD ["python", "app.py"]
