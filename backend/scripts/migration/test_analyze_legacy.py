import tempfile
import unittest
from pathlib import Path
from analyze_legacy import read_dump, rows, analyze

TEST_ROOT = Path(__file__).resolve().parents[2] / ".local" / "migration-tests"
TEST_ROOT.mkdir(parents=True, exist_ok=True)


class ParserTest(unittest.TestCase):
    def test_literals_and_escapes(self):
        parsed = list(rows("('a; b, c', NULL, 'NULL', 1.23456, 'l\\'image', 'it''s', 'ligne\\n2');", 0))
        self.assertEqual(parsed, [["a; b, c", None, "NULL", "1.23456", "l'image", "it's", "ligne\n2"]])

    def test_truncation_and_expressions_rejected(self):
        for value in ["('a)", "(1", "(NOW());", "('a' 'b');"]:
            with self.assertRaises(ValueError):
                list(rows(value, 0))

    def test_no_sql_execution_or_password_export(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as folder:
            source = Path(folder, "legacy.sql")
            source.write_text("CREATE TABLE IF NOT EXISTS `user` (`Password` text);\nINSERT INTO `user` (`Password`) VALUES ('INSERT INTO `user` (`Password`) VALUES (1);');", encoding="utf-8")
            counts, data = read_dump(source)
            self.assertEqual(counts["user"], 1)
            self.assertNotIn("user", data)
            self.assertNotIn("Password", str(analyze(source)))

    def test_wrong_column_count_rejected(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as folder:
            source = Path(folder, "legacy.sql")
            source.write_text("INSERT INTO `user` (`a`, `b`) VALUES (1);", encoding="utf-8")
            with self.assertRaises(ValueError):
                read_dump(source)


if __name__ == "__main__":
    unittest.main()
