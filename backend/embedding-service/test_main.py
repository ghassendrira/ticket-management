from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_health():
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["model"] == "all-MiniLM-L6-v2"
    assert data["dimensions"] == 384


def test_embed():
    response = client.post(
        "/embed",
        json={"text": "hello world"}
    )

    assert response.status_code == 200

    data = response.json()

    assert "embedding" in data
    assert len(data["embedding"]) == 384


def test_embed_batch():
    response = client.post(
        "/embed-batch",
        json={"texts": ["hello", "world"]}
    )

    assert response.status_code == 200

    data = response.json()

    assert "embeddings" in data
    assert len(data["embeddings"]) == 2
    assert len(data["embeddings"][0]) == 384