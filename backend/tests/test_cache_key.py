import unittest

from app.core.cache import make_cache_key


class TestMakeCacheKey(unittest.TestCase):
    def test_same_inputs_produce_same_key(self):
        key_a = make_cache_key("What is X?", "doc.pdf", 5, False)
        key_b = make_cache_key("What is X?", "doc.pdf", 5, False)
        self.assertEqual(key_a, key_b)

    def test_strips_query_whitespace(self):
        key_a = make_cache_key("  hello  ", None, 5, False)
        key_b = make_cache_key("hello", None, 5, False)
        self.assertEqual(key_a, key_b)

    def test_none_filename_uses_all_scope(self):
        key = make_cache_key("hello", None, 5, False)
        self.assertTrue(key.startswith("chat:all:"))

    def test_different_scope_produces_different_key(self):
        key_a = make_cache_key("hello", "a.pdf", 5, False)
        key_b = make_cache_key("hello", "b.pdf", 5, False)
        self.assertNotEqual(key_a, key_b)

    def test_top_k_and_include_full_content_affect_key(self):
        base = make_cache_key("hello", "a.pdf", 5, False)
        other_top_k = make_cache_key("hello", "a.pdf", 3, False)
        other_content = make_cache_key("hello", "a.pdf", 5, True)
        self.assertNotEqual(base, other_top_k)
        self.assertNotEqual(base, other_content)


if __name__ == "__main__":
    unittest.main()
