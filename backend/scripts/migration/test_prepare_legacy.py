import unittest
from pathlib import Path
from prepare_legacy import mapped_path, clean, timestamp, ident

class PreparationTest(unittest.TestCase):
    def test_windows_prefix_mapping_and_traversal(self):
        root=Path(__file__).resolve().parents[2]
        self.assertEqual(mapped_path(root,r'C:\wamp64\www\GESTION_STOCK\pj\image.jpg'),(root/'pj/image.jpg').resolve())
        for value in ['../secret',r'C:\Users\secret',r'pj\..\secret','/outside']:
            self.assertIsNone(mapped_path(root,value))

    def test_sensitive_history_not_copied(self):
        row={'history_id':'1','type':'update','before_change':'un ancien secret','details':'identifiants'}
        self.assertNotIn('un ancien secret',str(clean('history',row)))
        self.assertEqual(clean('history',{'type':'Prix','before_change':'100','after_change':'200'})['before_change'],'100')
        self.assertNotIn('abc123',str(clean('history',{'type':'Prix','details':'password=abc123'})))

    def test_no_free_text_business_date(self):
        self.assertIsNone(timestamp('vente du 12 mars'))
        self.assertEqual(timestamp('2026-02-23'),'2026-02-23T00:00:00+03:00')
        self.assertIsNone(timestamp('2026-02-30'))

    def test_stable_identifiers_isolated_by_source_and_table(self):
        self.assertEqual(ident('source','mvt','1'),ident('source','mvt','1'))
        self.assertNotEqual(ident('source','mvt','1'),ident('source','produit','1'))
        self.assertNotEqual(ident('source','mvt','1'),ident('other','mvt','1'))

if __name__=='__main__': unittest.main()
