def test_cors_origins_parsed_as_trimmed_list():
    from app.config import Settings

    s = Settings(cors_origins="https://a.com, http://localhost:5181 ,")
    assert s.cors_origins_list == ["https://a.com", "http://localhost:5181"]


def test_cors_origins_empty_is_empty_list():
    from app.config import Settings

    assert Settings(cors_origins="").cors_origins_list == []
