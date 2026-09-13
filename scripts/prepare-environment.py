"""Screen TTC candidate geometry against Toronto's published environmental polygons.

This is a 2D map overlay, not an impact calculation, regulatory setback or approval.
Analysis uses full source geometry in Toronto's EPSG:2952 metre projection.
"""
import argparse
import hashlib
import io
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import shapefile
from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import LineString, shape, mapping
from shapely.ops import transform, unary_union

SOURCES = {
    'ravine': {'title': 'Ravine & Natural Feature Protection area',
        'url': 'https://open.toronto.ca/dataset/ravine-natural-feature-protection-area/',
        'download': 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/204a7e54-8963-4e35-992e-5f21544ef595/resource/bb81bb0f-f88a-4f3e-bca7-a328154ba31b/download/ravine-natural-feature-protection-area-wgs84.zip',
        'modified': '2019-07-23', 'scope': 'Toronto only; historical download, not verified current legal boundaries'},
    'esa': {'title': 'Environmentally Significant Areas',
        'url': 'https://open.toronto.ca/dataset/environmentally-significant-areas/',
        'download': 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/ef5a083a-5c2a-4207-9131-dfc917917069/resource/a72afc3e-881b-48f7-9a42-0b1fe55fdf4a/download/environmentally-significant-areas-4326.geojson',
        'modified': '2026-03-16', 'scope': 'Toronto only; 89 ESA designations represented by 92 source features'}
}


def polygons(geometry):
    if geometry.geom_type in ('Polygon', 'MultiPolygon'):
        return geometry
    return unary_union([polygons(g) for g in geometry.geoms if g.geom_type in ('Polygon', 'MultiPolygon', 'GeometryCollection')])


def screen(line, areas, proximity=50):
    merged = unary_union([a['geometry'] for a in areas if not a.get('geometryReview')])
    overlap = line.intersection(merged)
    nearby = [a for a in areas if line.distance(a['geometry']) <= proximity]
    return {
        'geometryReviewIds': [a['id'] for a in areas if a.get('geometryReview') and line.distance(a['geometry'].envelope) <= proximity],
        'intersects': line.intersects(merged),
        'overlapMetres': round(overlap.length, 1),
        'nearbyAreaIds': [a['id'] for a in nearby],
        'nearbyAreaNames': sorted({a['name'] for a in nearby}),
        'proximityMetres': proximity,
    }


def prepare(ravines, esa, boundaries, corridors, output):
    project = Transformer.from_crs('EPSG:4326', 'EPSG:2952', always_xy=True).transform
    unproject = Transformer.from_crs('EPSG:2952', 'EPSG:4326', always_xy=True).transform
    z = zipfile.ZipFile(ravines)
    assert 'WGS 84' in z.read('RAVINE_BYLAW_WGS84.prj').decode()
    reader = shapefile.Reader(**{ext: io.BytesIO(z.read('RAVINE_BYLAW_WGS84.' + ext)) for ext in ['shp', 'shx', 'dbf']})
    raw = {
        'ravine': [{'id': str(r.record['OBJECTID']), 'name': 'Ravine protection polygon ' + str(r.record['OBJECTID']), 'geometry': shape(r.shape.__geo_interface__)} for r in reader.iterShapeRecords()],
        'esa': [{'id': str(f['properties']['_id']), 'name': f['properties']['ESA_NAME'], 'designation': f['properties']['ESA_NUM'], 'geometry': shape(f['geometry'])} for f in json.loads(Path(esa).read_text())['features']]
    }
    assert len(raw['ravine']) == 854 and len(raw['esa']) == 92, 'Review changed source coverage before accepting'
    assert len({a['designation'] for a in raw['esa']}) == 89
    prepared, features, repairs = {}, [], {}
    for kind, areas in raw.items():
        prepared[kind] = []
        repairs[kind] = []
        for area in areas:
            geometry = transform(project, area['geometry'])
            needs_review = not geometry.is_valid
            if needs_review:
                # The 2019 file has nested shells. Repair only for provisional display; exclude from measured overlap.
                before = geometry.area
                geometry = polygons(make_valid(geometry))
                repairs[kind].append({'id': area['id'], 'areaChangeM2': round(geometry.area - before, 4)})
            assert geometry.is_valid and not geometry.is_empty and geometry.area > 0
            prepared[kind].append({**area, 'geometry': geometry, 'geometryReview': needs_review})
            display = transform(unproject, geometry.simplify(5, preserve_topology=True))
            features.append({'type': 'Feature', 'properties': {'id': kind + '-' + area['id'], 'kind': kind, 'geometryReview': needs_review, 'name': area['name'], 'sourceDate': SOURCES[kind]['modified']}, 'geometry': mapping(display)})
    city = unary_union([transform(project, shape(f['geometry'])) for f in json.loads(Path(boundaries).read_text())['features']])
    evidence = {}
    for c in json.loads(Path(corridors).read_text()):
        line = transform(project, LineString(c['coordinates']))
        assert line.is_valid and line.length > 0
        evidence[c['id']] = {'lineMetres': round(line.length, 1),
            'torontoBandCoverage': round(line.buffer(50, quad_segs=24).intersection(city).area / line.buffer(50, quad_segs=24).area, 4),
            **{kind: screen(line, areas) for kind, areas in prepared.items()}}
    assert len(evidence) == 6
    output.mkdir(parents=True, exist_ok=True)
    def write(name, data):
        (output / name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    write('environment-areas.json', {'type': 'FeatureCollection', 'features': features})
    write('corridor-environment.json', evidence)
    write('environment-provenance.json', {
        'retrievedAt': datetime.now(timezone.utc).isoformat(), 'sources': SOURCES,
        'sha256': {name: hashlib.sha256(Path(path).read_bytes()).hexdigest() for name, path in [('ravine', ravines), ('esa', esa), ('cityNeighbourhoods', boundaries), ('corridors', corridors)]},
        'licence': 'https://open.toronto.ca/open-data-licence/',
        'attribution': 'Contains information licensed under the Open Government Licence – Toronto.',
        'method': 'EPSG:2952. Length of TTC representative corridor line intersecting the union of each polygon layer, including its boundary. Nearby features have minimum line distance <=50 m. This is an illustrative search distance, not a legal setback or construction width. Coverage is the share of a 50 m line buffer within the union of Toronto neighbourhood polygons. Overlap analysis uses unsimplified source-valid polygons only. 65 invalid ravine polygons have nested shells: these are excluded from measured overlap; make_valid is used only for provisional display and proximity context. A corridor within 50 m of a provisional polygon envelope is flagged as incomplete. Display geometry alone is simplified by 5 m.',
        'geometryRepairs': repairs,
        'limitations': ['65 invalid ravine polygons are excluded from measured line overlap; affected corridors have incomplete screening. Their repaired display boundaries are provisional.', '2D intersections do not distinguish bridges, tunnels or ground-level works.', 'TTC geometry is a simplified bus route, not a surveyed alignment.', 'Historical ravine boundaries require current verification.', 'Missing coverage outside Toronto is unknown, not free of constraints.', 'Greenbelt, national parks, conservation-authority hazards, floodplains, species, tree inventories, terrain elevations, geology and groundwater are not screened.', 'No intersection is not environmental clearance; adjacent works and construction access may have impacts.', 'This evidence does not change ranking or cost assumptions.']
    })
    print(json.dumps(evidence, indent=2))
    print('Recorded geometry repairs:', {k: len(v) for k, v in repairs.items()})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for key in ['ravines', 'esa', 'boundaries', 'corridors', 'output']:
        parser.add_argument('--' + key, type=Path, required=True)
    prepare(**vars(parser.parse_args()))
