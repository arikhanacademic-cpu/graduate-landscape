import importlib.util,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('import_data',ROOT/'scripts/import_data.py')
imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)

class ImportTests(unittest.TestCase):
    def row(self,median='40000'):
        return dict(academic_year='2017/2018',earnings_median=median,earnings_LQ='30000',earnings_UQ='50000',grads_earnings_include='100',grads='120',sust_emp_with_or_without_fs='80',fs_with_or_without_sust_emp='20',sust_emp_fs_or_both='90')
    def test_suppression_is_not_zero(self):
        for value in ['c','x','z','low','',None]:self.assertIsNone(imp.number(value))
        self.assertEqual(imp.number('0'),0)
    def test_duplicate_source_record_does_not_double_sample(self):
        row=self.row();self.assertEqual(imp.unique_metric([row,row])['sample'],100)
    def test_different_regional_medians_never_averaged(self):
        result=imp.unique_metric([self.row('30000'),self.row('50000')]);self.assertIsNone(result['median']);self.assertEqual(result['status'],'conflicting-regional-records')
    def test_suppressed_median_remains_unavailable(self):
        result=imp.unique_metric([self.row('c')]);self.assertIsNone(result['median']);self.assertEqual(result['status'],'suppressed')
    def test_empty_group_is_not_an_observation(self):self.assertIsNone(imp.unique_metric([]))

if __name__=='__main__':unittest.main()
