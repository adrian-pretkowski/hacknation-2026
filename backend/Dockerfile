# Build context: katalog główny repo (potrzebny zus_rules/).
FROM python:3.12-slim
WORKDIR /srv
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY zus_rules zus_rules
COPY backend/app backend/app
WORKDIR /srv/backend
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENV ZUS_RULES_PATH=/srv/zus_rules/03_rules.yaml
EXPOSE 8000
# Heroku podaje port w $PORT (INT-12); lokalnie i w Dockerze 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
