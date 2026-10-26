from demo.fixed import average_cost


def test_empty_inventory():
    assert average_cost(100, 0) == 0


def test_normal_inventory():
    assert average_cost(100, 4) == 25
