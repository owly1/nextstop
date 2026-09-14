"""Check spatial edge cases and preserve unresolved park-wide coverage."""
import importlib.util
import json
import unittest
from pathlib import Path
from shapely.geometry import box, LineString, shape

spec = importlib.util.spec_from_file_location('parks', Path(__file__).with_name('prepare-parks.py'))
parks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parks)

class ParkChecks(unittest.TestCase):
    def test_boundary_contact_is_not_clearance(self):
        self.assertEqual(parks.screen(LineString([(-1, -1), (0, 0)]), box(0, 0, 10, 10)), {'intersects': True, 'overlapMetres': 0})

    def test_crossing_and_disjoint(self):
        self.assertEqual(parks.screen(LineString([(-5, 5), (15, 5)]), box(0, 0, 10, 10)), {'intersects': True, 'overlapMetres': 10})
        self.assertEqual(parks.screen(LineString([(-5, -1), (15, -1)]), box(0, 0, 10, 10)), {'intersects': False, 'overlapMetres': 0})

    def test_snapshot_keeps_records_and_unknowns(self):
        data = json.loads((Path(__file__).parents[1] / 'dist/data/rouge-park.json').read_text())
        self.assertEqual([r['id'] for r in data['records']], ['nrcan', 'cpcad'])
        self.assertAlmostEqual(data['recordDifferenceKm2'], 17.720, places=3)
        self.assertEqual(len(data['corridors']), 6)
        (west, south), (east, north) = data['mapBounds']
        for feature in data['features']:
            g = shape(feature['geometry'])
            self.assertTrue(g.is_valid)
            self.assertTrue(box(west, south, east, north).covers(g))
        for c in data['corridors'].values():
            self.assertEqual(c['coverageStatus'], 'unresolved')
            self.assertIsNone(c['parkWideConclusion'])
            for record in c['records'].values():
                self.assertEqual(record, {'intersects': False, 'overlapMetres': 0})

if __name__ == '__main__':
    unittest.main()
