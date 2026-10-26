# Synthetic fixture report
The fixed patch adds an explicit count == 0 guard returning 0.
The nonzero branch still returns total / count.
Local fixture tests check (100, 0) -> 0 and (100, 4) -> 25.
These are synthetic examples, not independently attested production results.
The failed fixture still divides by zero. The unknown fixture references an
unavailable external_inventory_engine; its behavior cannot be verified here.
