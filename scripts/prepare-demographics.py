"""Join Toronto's 158-neighbourhood census profiles and boundary polygons.

Requires openpyxl, shapely and pyproj. Inputs are explicit local source files;
no live endpoints or credentials are used by the published website.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import openpyxl
import shapely
from shapely.geometry import shape, mapping, LineString
from shapely.ops import transform
from pyproj import Transformer

POPULATION_ROW = 'Total - Age groups of the population - 25% sample data'
PROFILE_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/6e19a90f-971c-46b3-852c-0c48c436d1fc/resource/19d4a806-7385-4889-acf2-256f1e079060/download/nbhd_2021_census_profile_full_158model.xlsx'
BOUNDARY_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/fc443770-ef0a-4025-9c2c-2cb558bfab00/resource/0719053b-28b7-48ea-b863-068823a93aaa/download/neighbourhoods-4326.geojson'


def prepare(profiles, boundaries, corridors, output):
    rows = list(openpyxl.load_workbook(profiles, read_only=True, data_only=True).worksheets[0].values)
    assert rows[0][0] == 'Neighbourhood Name' and rows[1][0] == 'Neighbourhood Number'
    population_rows = [row for row in rows if row[0] == POPULATION_ROW]
    assert len(population_rows) == 1, 'Population variable must match exactly once'
    populations = {str(int(n)): {'name': rows[0][i], 'population': population_rows[0][i]}
                   for i, n in enumerate(rows[1]) if i > 0}
    assert len(populations) == 158
    assert all(isinstance(p['population'], (int, float)) and p['population'] > 0 for p in populations.values())
    project = Transformer.from_crs('EPSG:4326', 'EPSG:2952', always_xy=True).transform
    unproject = Transformer.from_crs('EPSG:2952', 'EPSG:4326', always_xy=True).transform
    raw = json.loads(Path(boundaries).read_text())
    assert len(raw['features']) == 158
    geometries, features = {}, []
    for feature in raw['features']:
        identifier = str(int(feature['properties']['AREA_SHORT_CODE']))
        assert identifier in populations and identifier not in geometries, 'Exact one-to-one join required'
        geometry = transform(project, shape(feature['geometry']))
        assert geometry.is_valid and not geometry.is_empty, 'Do not silently repair changed boundaries'
        geometries[identifier] = geometry
        area_km2 = geometry.area / 1_000_000
        population = populations[identifier]['population']
        populations[identifier].update({'areaKm2': area_km2, 'densityPerKm2': population / area_km2})
        # Analysis uses the original polygons; only the display copy is simplified.
        display = transform(unproject, geometry.simplify(12, preserve_topology=True))
        features.append({'type': 'Feature', 'properties': {
            'id': identifier, 'name': populations[identifier]['name'], 'population': population,
            'areaKm2': round(area_km2, 4), 'densityPerKm2': round(population / area_km2),
            'censusYear': 2021, 'populationBasis': '25% sample, weighted estimates'},
            'geometry': mapping(display)})
    assert set(geometries) == set(populations)
    corridor_evidence = {}
    for corridor in json.loads(Path(corridors).read_text()):
        buffer = transform(project, LineString(corridor['coordinates'])).buffer(800, quad_segs=24)
        intersections = []
        for identifier, geometry in geometries.items():
            overlap = buffer.intersection(geometry).area / 1_000_000
            if overlap > 0.000001:
                p = populations[identifier]
                intersections.append({'id': identifier, 'name': p['name'], 'overlapKm2': overlap,
                                      'population': p['population'], 'densityPerKm2': p['densityPerKm2']})
        matched = sum(p['overlapKm2'] for p in intersections)
        assert matched > 0
        coverage = matched / (buffer.area / 1_000_000)
        assert coverage <= 1.001, 'Neighbourhood overlaps must not inflate the result'
        density = sum(p['overlapKm2'] * p['densityPerKm2'] for p in intersections) / matched
        corridor_evidence[corridor['id']] = {
            'densityPerKm2': round(density), 'bufferMetres': 800, 'censusYear': 2021,
            'coverageFraction': round(coverage, 4), 'matchedAreaKm2': round(matched, 4),
            'neighbourhoods': sorted(intersections, key=lambda p: -p['overlapKm2'])}
    assert len(corridor_evidence) == 6
    output.mkdir(parents=True, exist_ok=True)
    def write(name, data):
        (output / name).write_text(json.dumps(data, separators=(',', ':'), ensure_ascii=False))
    write('neighbourhood-density.json', {'type': 'FeatureCollection', 'features': features})
    write('corridor-demographics.json', corridor_evidence)
    write('demographics-provenance.json', {
        'censusYear': 2021, 'retrievedAt': datetime.now(timezone.utc).isoformat(),
        'licence': 'Open Government Licence – Toronto', 'licenceUrl': 'https://open.toronto.ca/open-data-licence/',
        'attribution': 'Contains information licensed under the Open Government Licence – Toronto. Adapted from Statistics Canada, Census of Population, 2021. This does not constitute an endorsement by Statistics Canada.',
        'sources': [
            {'title': 'Neighbourhood Profiles', 'catalogue': 'https://open.toronto.ca/dataset/neighbourhood-profiles/',
             'download': PROFILE_URL, 'resourceModified': '2023-10-06', 'sha256': hashlib.sha256(Path(profiles).read_bytes()).hexdigest()},
            {'title': 'Neighbourhoods', 'catalogue': 'https://open.toronto.ca/dataset/neighbourhoods/',
             'download': BOUNDARY_URL, 'resourceModified': '2026-02-20', 'sha256': hashlib.sha256(Path(boundaries).read_bytes()).hexdigest()}],
        'populationVariable': POPULATION_ROW, 'populationBasis': 'Weighted 25% sample estimates; not the 100% enumeration count. Do not multiply by four.',
        'populationTotalForValidation': sum(p['population'] for p in populations.values()),
        'method': 'Join exactly by neighbourhood number. Divide the source population estimate by the full polygon area in EPSG:2952. Intersect original polygons with an 800 m straight-line buffer around each corridor. Weight neighbourhood densities by intersection area; exclude areas outside Toronto and report coverage. Display polygons alone are simplified by 12 m.',
        'limitations': ['2021 historical context, not a current population estimate.', 'Neighbourhood averages hide local variation and assume uniform density within each polygon.', 'Polygon area includes non-residential land and may include water.', 'The 800 m corridor buffer is not a walking catchment and is not tied to selected stops.', 'No riders, jobs, destinations, trip flows or regional areas outside Toronto are inferred.'],
        'ranking': 'Density context replaces bus-stop count in the corridor coverage component when available. The design scale of 6,000 people/km² and cap of 1.5 are illustrative weights, not rail demand thresholds.'})
    print(json.dumps({'neighbourhoods': len(features), 'corridors': len(corridor_evidence),
                      'densityContext': {k: v['densityPerKm2'] for k, v in corridor_evidence.items()},
                      'coverage': {k: v['coverageFraction'] for k, v in corridor_evidence.items()}}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ['profiles', 'boundaries', 'corridors', 'output']:
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    prepare(args.profiles, args.boundaries, args.corridors, args.output)
