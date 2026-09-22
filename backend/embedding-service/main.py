from fastapi import FastAPI
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Embedding Service")

# Le modele se telecharge automatiquement au premier lancement (~90 Mo)
model = SentenceTransformer('all-MiniLM-L6-v2')


class EmbedRequest(BaseModel):
    text: str | None = None
    texts: list[str] | None = None


class EmbedBatchRequest(BaseModel):
    texts: list[str]


@app.get("/")
def health():
    return {"status": "ok", "model": "all-MiniLM-L6-v2", "dimensions": 384}


@app.post("/embed")
def embed(req: EmbedRequest):
    if req.text is not None:
        vector = model.encode(req.text).tolist()
        return {"embedding": vector}
    if req.texts:
        vectors = model.encode(req.texts).tolist()
        return {"embeddings": vectors}
    return {"embeddings": []}


@app.post("/embed-batch")
def embed_batch(req: EmbedBatchRequest):
    vectors = model.encode(req.texts).tolist()
    return {"embeddings": vectors}


if __name__ == "__main__":
    print("Embedding service running on http://0.0.0.0:8000", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=8000)