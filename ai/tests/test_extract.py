import os

import pytest

from vericanopy_ai.config import PipelineConfig
from vericanopy_ai.extract import FixtureProvider, get_provider, load_demo_project


def test_fixture_provider_deterministic():
    cfg = PipelineConfig()
    p = FixtureProvider()
    proj = load_demo_project("A")
    s1 = p.sample(proj, 2024, cfg)
    s2 = p.sample(proj, 2024, cfg)
    assert s1.treat.equals(s2.treat) and s1.ctrl.equals(s2.ctrl)
    assert s1.meta["provider"] == "fixture"
    assert set(cfg.covariates) <= set(s1.treat.columns)
    assert len(s1.treat) == cfg.fixture_n_t and len(s1.ctrl) == cfg.fixture_n_c


def test_project_C_fire_year_has_burned_pixels():
    cfg = PipelineConfig()
    s = FixtureProvider().sample(load_demo_project("C"), 2021, cfg)
    burned = (s.treat["burned_year"] == 2021).mean()
    assert burned > 0.3
    s20 = FixtureProvider().sample(load_demo_project("C"), 2020, cfg)
    assert (s20.treat["burned_year"] == 2021).sum() == 0, "future outcomes must not leak into period 2020"


def test_ee_provider_requires_credentials(monkeypatch):
    monkeypatch.delenv("EE_SERVICE_ACCOUNT_JSON", raising=False)
    assert isinstance(get_provider(PipelineConfig()), FixtureProvider)
    monkeypatch.setenv("EE_SERVICE_ACCOUNT_JSON", "/nonexistent/ee.json")
    with pytest.raises(RuntimeError, match="Earth Engine"):
        get_provider(PipelineConfig())
    os.environ.pop("EE_SERVICE_ACCOUNT_JSON", None)
