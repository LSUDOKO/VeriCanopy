import math

import numpy as np
import pandas as pd

from vericanopy_ai.measure import (
    fire_fraction,
    leakage_delta,
    loss_rate,
    sar_optical_agreement,
    support_ratio,
    tco2e,
)


def test_support_ratio_clip_and_flag():
    r, flag = support_ratio(0.009, 0.009)
    assert math.isclose(r, 1.0) and not flag
    r, flag = support_ratio(0.02, 0.009)  # > 1.5 clipped
    assert math.isclose(r, 1.5)
    r, flag = support_ratio(-0.001, 0.009)
    assert r == 0.0
    r, flag = support_ratio(0.005, 0.0)  # claimed <= observed project loss -> no claimable effect
    assert r == 0.0 and flag


def test_tco2e_formula():
    # 1 ha, 100 Mg/ha AGB, CF 0.47: 100*0.47*44/12 = 172.333...
    assert math.isclose(tco2e(1.0, 100.0), 172.3333333, rel_tol=1e-6)
    assert math.isclose(tco2e(2.0, 50.0, cf=0.5), 183.3333333, rel_tol=1e-6)


def test_loss_rate_annual():
    df = pd.DataFrame({"loss_year": [0, 2021, 2022, 0, 2019]})
    # window 2020..2024 (5 years): 2 of the 4 pixels still forest in 2020 are lost (2019 loss excluded)
    assert math.isclose(loss_rate(df, 2020, 2024), (2 / 4) / 5)


def test_fire_and_agreement_and_leakage():
    df = pd.DataFrame(
        {"burned_year": [2021, 0, 2021, 0], "ndvi_drop": [1, 0, 1, 0], "sar_change": [1, 0, 0, 0]}
    )
    assert fire_fraction(df, 2021) == 0.5
    assert sar_optical_agreement(df) == 0.75
    assert math.isclose(leakage_delta(0.02, 0.01, 0.015, 0.015), 1.0)  # inner ring doubled, outer flat
    assert leakage_delta(0.0, 0.0, 0.0, 0.0) == 0.0
    assert np.isfinite(leakage_delta(0.01, 0.0, 0.0, 0.0))
