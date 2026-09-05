import importlib
from types import SimpleNamespace


def test_get_connection_uses_postgres_when_database_url_is_set(monkeypatch):
    import backend.db_path as db_path
    import backend.models.user as user_module

    called = {}

    def fake_connect(url):
        called['url'] = url
        return SimpleNamespace()

    monkeypatch.setattr(db_path, 'DATABASE_URL', 'postgresql://test-db')
    monkeypatch.setattr(db_path, 'is_postgres', lambda: True)
    monkeypatch.setattr(user_module, 'psycopg', SimpleNamespace(connect=fake_connect), raising=False)

    conn = user_module.get_connection()

    assert conn is not None
    assert called['url'] == 'postgresql://test-db'
