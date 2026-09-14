"""Keep Rouge's two federal spatial records separate; completeness is unresolved."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import shape, mapping, LineString
from shapely.ops import transform

SOURCE = 'https://open.canada.ca/data/en/dataset/9e1507cd-f25c-4c64-995b-6563bf9d65bd'
CPCAD = 'https://open.canada.ca/data/en/dataset/6c343726-1e92-451a-876a-76e17d398a1c'
PROJECT = Transformer.from_crs(4326, 2952, always_xy=True).transform
GEOGRAPHIC = Transformer.from_crs(2952, 4326, always_xy=True).transform

def screen(line, area):
    return {'intersects': line.intersects(area), 'overlapMetres': round(line.intersection(area).length, 1)}

def prepare(nrcan, cpcad, corridors):
    if nrcan.get('exceededTransferLimit') or cpcad.get('exceededTransferLimit'):
        raise ValueError('Source response is truncated')
    nr = [f for f in nrcan['features'] if f['properties'].get('adminAreaId') == '33245']
    cp = [f for f in cpcad['features'] if f['properties'].get('ZONE_ID') == 717900000]
    assert len(nr) == len(cp) == 1
    assert nr[0]['properties']['distributionType'] == 'NRU'
    assert cp[0]['properties']['TYPE_E'] == 'National Urban Park'
    assert cp[0]['properties']['MGMT_E'] == 'Parks Canada Agency'
    specs = [('nrcan', nr[0], 'NRCan legislative record', 'Retrieved September 14, 2026', SOURCE),
             ('cpcad', cp[0], 'CPCAD conservation record', 'December 2025 reporting snapshot', CPCAD)]
    features, geometries, records = [], {}, []
    for id, feature, label, date, url in specs:
        geometry = shape(feature['geometry'])
        assert geometry.is_valid and not geometry.is_empty
        geometry = transform(PROJECT, geometry)
        assert geometry.is_valid and not geometry.is_empty
        geometries[id] = geometry
        properties = {'id': id, 'name': 'Rouge National Urban Park', 'label': label, 'dateLabel': date, 'source': url}
        features.append({'type': 'Feature', 'properties': properties, 'geometry': mapping(transform(GEOGRAPHIC, geometry.simplify(5, preserve_topology=True)))})
        records.append({**properties, 'sourceAttributes': feature['properties'], 'mappedAreaKm2': round(geometry.area / 1e6, 3)})
    evidence = {}
    for c in corridors:
        line = transform(PROJECT, LineString(c['coordinates']))
        evidence[c['id']] = {'parkName': 'Rouge National Urban Park', 'coverageStatus': 'unresolved',
                            'records': {id: screen(line, area) for id, area in geometries.items()},
                            'parkWideConclusion': None}
    assert len(evidence) == 6
    geographic = [shape(f['geometry']) for f in features]
    bounds = [min(g.bounds[0] for g in geographic), min(g.bounds[1] for g in geographic),
              max(g.bounds[2] for g in geographic), max(g.bounds[3] for g in geographic)]
    return {'type': 'FeatureCollection', 'features': features, 'records': records, 'corridors': evidence,
            'mapBounds': [bounds[:2], bounds[2:]],
            'coverageStatus': 'unresolved', 'snapshotDate': '2026-09-14',
            'recordDifferenceKm2': round(geometries['nrcan'].symmetric_difference(geometries['cpcad']).area / 1e6, 3),
            'licence': 'https://open.canada.ca/en/open-government-licence-canada',
            'attribution': 'Contains information licensed under the Open Government Licence – Canada.',
            'method': 'Separate full-geometry 2D intersections in EPSG:2952 using GeoJSON returned in EPSG:4326. Boundary contact counts as intersection. Only display copies are simplified by 5 m. No union of the two records is used to infer park extent.',
            'limitations': ['Federal records have different extents; neither is assumed to provide complete current park coverage.',
                           'An absence of overlap in these records cannot rule out park impacts. Park-wide conclusions remain unknown.',
                           'Retrieval date is not a legal effective date. Check legal documents, surveys and current Parks Canada information.',
                           'Not a construction footprint, habitat loss estimate, permission, or absolute prohibition. No ranking, mode, speed or cost changes.',
                           'Rouge only; other national parks, proposed expansions and flood hazards are not screened by this layer.']}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ['nrcan', 'cpcad', 'corridors', 'output']:
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    data = prepare(*(json.loads(getattr(args, name).read_text()) for name in ['nrcan', 'cpcad', 'corridors']))
    data['inputSha256'] = {name: hashlib.sha256(getattr(args, name).read_bytes()).hexdigest() for name in ['nrcan', 'cpcad', 'corridors']}
    data['generatedAt'] = datetime.now(timezone.utc).isoformat()
    data['queries'] = [
        {'url': 'https://proxyinternet.nrcan-rncan.gc.ca/arcgis/rest/services/CLSS-SATC/CLSS_Administrative_Boundaries/MapServer/1/query', 'where': "adminAreaId='33245'", 'outFields': '*', 'outSR': 4326, 'returnGeometry': True, 'f': 'geojson'},
        {'url': 'https://maps-cartes.ec.gc.ca/arcgis/rest/services/CWS_SCF/CPCAD/MapServer/0/query', 'where': "UPPER(NAME_E) LIKE '%ROUGE%'", 'localSelection': 'ZONE_ID = 717900000', 'outFields': '*', 'outSR': 4326, 'returnGeometry': True, 'f': 'geojson'}]
    args.output.write_text(json.dumps(data, separators=(',', ':')))
    print(json.dumps({'records': len(data['features']), 'recordDifferenceKm2': data['recordDifferenceKm2'], 'corridors': data['corridors']}, indent=2))
