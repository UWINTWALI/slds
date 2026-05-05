# The function we are testing
def format_poverty_rate(val):
   if val is None:
       return "—"
   return f"{val * 100:.1f}%"






# UT-01: test that the function formats decimal values correctly
def test_formats_decimal_as_percentage():
   assert format_poverty_rate(0.473) == "47.3%"



def test_formats_zero_correctly():
   assert format_poverty_rate(0.0) == "0.0%"



def test_formats_full_value_correctly():
   assert format_poverty_rate(1.0) == "100.0%"



def test_returns_dash_when_value_is_none():
   assert format_poverty_rate(None) == "—"