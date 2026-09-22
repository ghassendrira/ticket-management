# Embedding Service

This module is a Python FastAPI service, not a Maven or Spring Boot module. It has no `pom.xml`, Java sources, or Spring Boot application class, so `mvn spring-boot:run` is not a valid command here.

## Run on Windows PowerShell

From `backend/embedding-service`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python main.py
```

The first start downloads the `all-MiniLM-L6-v2` model. The service is then available at `http://localhost:8000` and its interactive API documentation is at `http://localhost:8000/docs`.

The process stays running after the model loads and prints:

```text
Embedding service running on http://0.0.0.0:8000
```

For development with automatic reload:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Build and test the service

Python services do not use Maven packaging. Install the dependencies to validate the environment:

```powershell
python -m pip install -r requirements.txt
python -m compileall main.py
```

Useful checks after starting the service:

```powershell
Invoke-RestMethod http://localhost:8000/
Invoke-RestMethod -Method Post -Uri http://localhost:8000/embed -ContentType "application/json" -Body '{"texts":["hello","world"]}'
```

The batch response has the form `{"embeddings":[[...],[...]]}`. The existing single-text form (`{"text":"hello"}`) and `/embed-batch` endpoint are also supported.

To stop the server, press `Ctrl+C`; to leave the virtual environment, run `deactivate`.
