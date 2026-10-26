"""Synthetic incomplete patch: delegates behavior to an unavailable dependency."""

import external_inventory_engine


def average_cost(total, count):
    return external_inventory_engine.calculate_average(total, count)
