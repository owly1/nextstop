"""Checks for overlap semantics that could otherwise imply false clearance."""
import importlib.util
import json
import unittest
from pathlib import Path
from shapely.geometry import LineString, box

spec = importlib.util.spec_from_file_location('prepare_environment', Path(__file__).with_name('prepare-environment.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def area(identifier, geometry):
    return {'id': identifier, 'name': identifier, 'geometry': geometry}


class ScreeningTests(unittest.TestCase):
    def test_overlapping_polygons_do_not_double_count(self):
        result = module.screen(LineString([(0, 0), (100, 0)]), [area('a', box(10, -1, 60, 1)), area('b', box(40, -1, 80, 1))])
        self.assertEqual(result['overlapMetres'], 70)
        self.assertTrue(result['intersects'])

    def test_boundary_contact_is_not_reported_as_absent(self):
        result = module.screen(LineString([(0, 0), (10, 0)]), [area('a', box(10, 0, 20, 10))])
        self.assertTrue(result['intersects'])
        self.assertEqual(result['overlapMetres'], 0)

    def test_nearby_without_crossing(self):
        result = module.screen(LineString([(0, 0), (100, 0)]), [area('near', box(10, 50, 20, 60)), area('far', box(10, 50.1, 20, 60))])
        self.assertFalse(result['intersects'])
        self.assertEqual(result['nearbyAreaIds'], ['near'])

    def test_provisional_shapes_do_not_become_measurements(self):
        result = module.screen(LineString([(0, 0), (100, 0)]), [{**area('uncertain', box(10, -1, 80, 1)), 'geometryReview': True}])
        self.assertFalse(result['intersects'])
        self.assertEqual(result['overlapMetres'], 0)
        self.assertEqual(result['geometryReviewIds'], ['uncertain'])

    def test_published_evidence(self):
        root = Path(__file__).resolve().parents[1] / 'dist' / 'data'
        evidence = json.loads((root / 'corridor-environment.json').read_text())
        display = json.loads((root / 'environment-areas.json').read_text())
        provenance = json.loads((root / 'environment-provenance.json').read_text())
        self.assertEqual(len(evidence), 6)
        ids = {f['properties']['id'] for f in display['features']}
        self.assertEqual(len(ids), 946)
        for value in evidence.values():
            self.assertGreater(value['torontoBandCoverage'], 0)
            self.assertLessEqual(value['torontoBandCoverage'], 1)
            for kind in ['ravine', 'esa']:
                screen = value[kind]
                self.assertGreaterEqual(screen['overlapMetres'], 0)
                self.assertLessEqual(screen['overlapMetres'], value['lineMetres'])
                self.assertTrue(all(kind + '-' + identifier in ids for identifier in screen['nearbyAreaIds']))
                if not screen['intersects']:
                    self.assertEqual(screen['overlapMetres'], 0)
        self.assertGreater(evidence['jane']['ravine']['overlapMetres'], 1000)
        self.assertEqual(evidence['dufferin']['ravine']['overlapMetres'], 0)
        self.assertEqual(evidence['finch']['esa']['nearbyAreaNames'], ['East Don Valley Swamp'])
        self.assertEqual(evidence['finch']['ravine']['overlapMetres'], 0)
        self.assertTrue(evidence['finch']['ravine']['geometryReviewIds'])
        self.assertTrue(.50 < evidence['steeles']['torontoBandCoverage'] < .54)
        self.assertEqual(len(provenance['geometryRepairs']['ravine']), 65)


if __name__ == '__main__':
    unittest.main()
