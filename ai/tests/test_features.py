from vericanopy_ai.config import FEATURE_NAMES, PipelineConfig
from vericanopy_ai.extract import FixtureProvider, load_demo_project
from vericanopy_ai.features import build_features


def test_build_features_shape_order_rounding():
    cfg = PipelineConfig(bootstrap=10)
    proj = load_demo_project("A")
    s = FixtureProvider().sample(proj, 2024, cfg)
    fr = build_features(s, proj, 2024, cfg)
    assert len(fr.vector) == 16 and len(FEATURE_NAMES) == 16
    assert FEATURE_NAMES[0] == "support_ratio" and FEATURE_NAMES[15] == "data_freshness"
    for v in fr.vector:
        assert round(v, 6) == v
    assert 0 <= fr.vector[0] <= 1.5
    assert 0 <= fr.vector[4] <= 1
    assert fr.reversal_tco2e >= 0 and isinstance(fr.reversal_tco2e, int)
    assert fr.diagnostics["years_since_start"] == 2024 - 2019 + 1


def test_project_C_fire_year_raises_reversal_and_fire_features():
    cfg = PipelineConfig(bootstrap=10)
    proj = load_demo_project("C")
    f20 = build_features(FixtureProvider().sample(proj, 2020, cfg), proj, 2020, cfg)
    f21 = build_features(FixtureProvider().sample(proj, 2021, cfg), proj, 2021, cfg)
    assert f21.vector[8] > f20.vector[8] + 0.2  # reversal_fraction
    assert f21.vector[9] > f20.vector[9] + 0.2  # fire_fraction
    assert f21.reversal_tco2e > 0
