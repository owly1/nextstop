import importlib.util
import unittest
from pathlib import Path
from shapely.geometry import LineString, Polygon, box

spec=importlib.util.spec_from_file_location('flood',Path(__file__).with_name('prepare-flood.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class Screening(unittest.TestCase):
    def test_crossing(self):
        self.assertEqual(module.overlap(LineString([(-1,5),(11,5)]),[box(0,0,10,10)]),{'intersects':True,'overlapMetres':10.0})
    def test_touch_is_not_clear(self):
        self.assertEqual(module.overlap(LineString([(-1,-1),(0,0)]),[box(0,0,10,10)]),{'intersects':True,'overlapMetres':0.0})
    def test_disjoint(self):
        self.assertEqual(module.overlap(LineString([(-2,-2),(-1,-1)]),[box(0,0,10,10)]),{'intersects':False,'overlapMetres':0.0})
    def test_overlapping_polygons_not_double_counted(self):
        self.assertEqual(module.overlap(LineString([(-1,5),(15,5)]),[box(0,0,10,10),box(5,0,12,10)])['overlapMetres'],12.0)
    def test_invalid_excluded(self):
        bowtie=Polygon([(0,0),(10,10),(0,10),(10,0),(0,0)])
        self.assertFalse(bowtie.is_valid)
        self.assertEqual(module.overlap(LineString([(-1,5),(11,5)]),[bowtie])['overlapMetres'],0)

if __name__=='__main__':unittest.main()
