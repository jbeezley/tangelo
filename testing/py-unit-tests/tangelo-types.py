import json
import unittest

import tangelo


class Tester(unittest.TestCase):
    def test_tangelo_types_numeric(self):
        """
        Demonstrate the correct usage of @tangelo.types.
        """

        def op(a, b, c=None, d=None):
            return a + b + c + d

        @tangelo.types(int, float, c=int, d=float)
        def op_typed(a, b, c=None, d=None):
            return op(a, b, c, d)

        self.assertEqual(op("1", "2", c="3", d="4"), "1234")
        self.assertEqual(op_typed("1", "2", c="3", d="4"), 10.0)

    def test_tangelo_types_json(self):
        """
        Demonstrate that @tangelo.types works with any non-base-type conversion functions.
        """

        @tangelo.types(json.loads)
        def extract_foo(data):
            return data["foo"]

        json_text = json.dumps({"foo": "bar",
                                "baz": "quux"})

        self.assertEqual(extract_foo(json_text), "bar")

    def test_tangelo_types_bad_converstion(self):
        """
        Demonstrate the failure mode when a value cannot be converted.
        """

        @tangelo.types(int)
        def identity(x):
            return x

        result = identity("3.2")

        self.assertEqual(type(result), dict)
        self.assertTrue("error" in result)
        self.assertEqual(result["error"], "invalid literal for int() with base 10: '3.2'")


if __name__ == "__main__":
    unittest.main()