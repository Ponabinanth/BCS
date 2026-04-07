import pytest

# Import the Flask app and use its test client so tests don't need a running server.
from app import app


@pytest.fixture
def client():
    app.testing = True
    with app.test_client() as c:
        yield c


def test_debug_info(client):
    resp = client.get('/_debug_info')
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, dict)
    assert 'index_exists' in data


def test_get_devices(client):
    resp = client.get('/api/devices')
    assert resp.status_code == 200
    data = resp.get_json()
    # Accept either list or object shapes
    assert data is not None
    assert isinstance(data, (list, dict))