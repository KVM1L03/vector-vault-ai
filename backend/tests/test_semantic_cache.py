import unittest

from app.core.semantic_cache import is_similarity_hit, normalize_filename_scope


class TestSemanticCacheHelpers(unittest.TestCase):
    def test_normalize_filename_scope_passes_through(self):
        self.assertIsNone(normalize_filename_scope(None))
        self.assertEqual(normalize_filename_scope("doc.pdf"), "doc.pdf")

    def test_is_similarity_hit_at_threshold(self):
        self.assertTrue(is_similarity_hit(0.92, 0.92))
        self.assertTrue(is_similarity_hit(0.95, 0.92))

    def test_is_similarity_hit_below_threshold(self):
        self.assertFalse(is_similarity_hit(0.91, 0.92))
        self.assertFalse(is_similarity_hit(0.5, 0.92))


if __name__ == "__main__":
    unittest.main()
