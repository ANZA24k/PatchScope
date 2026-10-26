"""Synthetic patch: empty inventory average must be zero."""


def average_cost(total, count):
    if count == 0:
        return 0
    return total / count
