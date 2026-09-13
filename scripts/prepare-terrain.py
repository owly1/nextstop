"""Sample Toronto's published 2023 TIN polygon averages along TTC corridors.

Uses Avg_Elev, not triangle slope or inferred road/rail grade. Missing samples
remain null. The published website needs only the small derived JSON file.
"""
import argparse
import hashlib
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import shapefile
from pyproj import Transformer
from shapely.geometry import LineString, shape
from shapely.ops import transform

SOURCE = 'https://open.toronto.ca/dataset/triangular-irregular-network-tin/'
DOWNLOAD = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/4ab91af6-6b08-4318-aee0-87f163891e53/resource/6877e492-e416-4ce0-bff1-37ffbcc53409/download/triangular-irregular-network.zip'


def distances(length, spacing=100):
    if not math.isfinite(length) or length <= 0 or spacing <= 0:
        raise ValueError('Positive length and spacing required')
    return [*range(0, math.ceil(length / spacing) * spacing, spacing), length]


def summarize(samples):
    values = [p['elevationMetres'] for p in samples if p['elevationMetres'] is not None]
    return {'sampleCount': len(samples), 'availableCount': len(values),
        'sampleCoverage': len(values) / len(samples) if samples else 0,
        'minimumMetres': min(values) if values else None,
        'maximumMetres': max(values) if values else None}


def prepare(tin, archive, corridors, output):
    project = Transformer.from_crs('EPSG:4326', 'EPSG:2952', always_xy=True).transform
    unproject = Transformer.from_crs('EPSG:2952', 'EPSG:4326', always_xy=True).transform
    groups, points, samples = {}, [], []
    for c in json.loads(corridors.read_text()):
        line = transform(project, LineString(c['coordinates']))
        groups[c['id']] = []
        for distance in distances(line.length):
            point = line.interpolate(distance)
            groups[c['id']].append(len(samples))
            points.append(point)
            samples.append({'distanceMetres': round(distance, 1), 'coordinates': [round(v, 7) for v in unproject(point.x, point.y)], 'matches': [], 'invalidSourceIds': []})
    buckets = defaultdict(list)
    cell = 200
    for i, point in enumerate(points):
        buckets[(math.floor(point.x/cell), math.floor(point.y/cell))].append(i)
    bbox = [min(p.x for p in points), min(p.y for p in points), max(p.x for p in points), max(p.y for p in points)]
    reader = shapefile.Reader(str(tin))
    assert len(reader) == 2628358, 'Review a changed source before refreshing'
    assert [f[0] for f in reader.fields[1:]] == ['Avg_Elev', 'Slope', 'Aspect', 'Ptg_Slope']
    candidates = hits = invalid = 0
    for feature in reader.iterShapes(bbox=bbox):
        left, bottom, right, top = feature.bbox
        indices = []
        for x in range(math.floor(left/cell), math.floor(right/cell)+1):
            for y in range(math.floor(bottom/cell), math.floor(top/cell)+1):
                indices.extend(i for i in buckets.get((x, y), []) if left <= points[i].x <= right and bottom <= points[i].y <= top)
        if not indices:
            continue
        candidates += 1
        geometry = shape(feature.__geo_interface__)
        if not geometry.is_valid:
            invalid += 1
            for i in indices:
                samples[i]['invalidSourceIds'].append(feature.oid)
            continue
        matched = [i for i in indices if geometry.covers(points[i])]
        if not matched:
            continue
        elevation = reader.record(feature.oid, fields=['Avg_Elev'])[0]
        assert isinstance(elevation, (int, float)) and math.isfinite(elevation) and 0 < elevation < 1000
        hits += 1
        for i in matched:
            samples[i]['matches'].append({'recordIndex': feature.oid, 'averageElevationMetres': elevation})
    for sample in samples:
        matches = sample['matches']
        sample['elevationMetres'] = round(sum(m['averageElevationMetres'] for m in matches)/len(matches), 2) if matches and not sample['invalidSourceIds'] else None
    evidence = {identifier: {'spacingMetres': 100, 'sourceYear': 2023, 'verticalDatum': 'CGVD2013', 'samples': [samples[i] for i in indices], **summarize([samples[i] for i in indices])} for identifier, indices in groups.items()}
    assert len(evidence) == 6 and all(v['availableCount'] > 0 for v in evidence.values())
    output.mkdir(parents=True, exist_ok=True)
    def write(name, value):
        (output/name).write_text(json.dumps(value, separators=(',', ':')))
    write('corridor-terrain.json', evidence)
    write('terrain-provenance.json', {
        'source': SOURCE, 'download': DOWNLOAD, 'sourceYear': 2023,
        'catalogueResourceModified': '2024-09-04T19:27:22', 'downloadLastModifiedHeader': '2024-10-22T19:33:59Z',
        'retrievedAt': datetime.now(timezone.utc).isoformat(),
        'archiveSha256': hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest(),
        'corridorsSha256': hashlib.sha256(corridors.read_bytes()).hexdigest(),
        'licence': 'https://open.toronto.ca/open-data-licence/',
        'attribution': 'Contains information licensed under the Open Government Licence – Toronto.',
        'sourceDefinition': 'TIN polygons derived by the City from 2023 LiDAR-derived 2.5 m bare-earth elevation source data. Avg_Elev is the average elevation of each polygon. Horizontal EPSG:2952; vertical CGVD2013.',
        'method': 'Place samples every 100 m along projected candidate geometry, including both endpoints. Query containing or boundary-touching source TIN polygons. Use their Avg_Elev; average the values if multiple polygons contain a boundary sample. This is not vertex interpolation. Missing coverage is null and is never bridged in the profile. Invalid polygons near samples produce null results. Min/max summarize only available sample estimates. Reported coverage is the share of sample points, not a share of corridor area or length.',
        'sourceFeatureCount': len(reader), 'candidateFeatureCount': candidates, 'matchedFeatureCount': hits, 'invalidCandidateFeatureCount': invalid,
        'limitations': ['100 m sampling can miss local changes between points; 2.5 m describes source raster spacing, not accuracy or sample spacing.', 'Polygon-average estimates are not surveyed point heights.', 'Bare-earth terrain does not give bridge-deck, road, rail or tunnel elevation.', 'Profiles use approximate TTC bus geometry, not engineering alignments.', 'No route-grade threshold, soil type, bedrock depth, groundwater, excavation cost or feasible mode is inferred.', 'This historical context does not change ranking, speed or cost assumptions.']
    })
    print(json.dumps({key: {k: v for k, v in value.items() if k != 'samples'} for key, value in evidence.items()}, indent=2), flush=True)
    print('Candidate triangles', candidates, 'invalid', invalid, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for key in ['tin', 'archive', 'corridors', 'output']:
        parser.add_argument('--' + key, type=Path, required=True)
    prepare(**vars(parser.parse_args()))
