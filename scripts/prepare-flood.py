"""Build reproducible TRCA flood screening, retaining uncertainty and source classes."""
import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from shapely.geometry import shape, mapping, LineString, box
from shapely.ops import transform, unary_union
from pyproj import Transformer

PROJECT = Transformer.from_crs(4326,2952,always_xy=True).transform
UNPROJECT = Transformer.from_crs(2952,4326,always_xy=True).transform
LICENCE = 'https://trca.ca/about/open-data-licence/'
CREDIT = 'Contains information made available under the Toronto and Region Conservation Authority (TRCA)’s Open Data Licence v 1.0'

def overlap(line, geometries):
    valid = [g for g in geometries if g.is_valid and not g.is_empty]
    union = unary_union(valid)
    return {'intersects':line.intersects(union), 'overlapMetres':round(line.intersection(union).length,1)}

def prepare(raw, corridors, output):
    provenance = []
    def read(path):
        content=path.read_bytes()
        provenance.append({'file':path.name,'sha256':hashlib.sha256(content).hexdigest()})
        return json.loads(content)
    records={}
    for kind in ['polygon','line']:
        expected=read(raw/f'nextstop-flood-{kind}-ids.json')['objectIds']
        features=[]
        for path in sorted(raw.glob(f'nextstop-flood-{kind}-[0-9]*.geojson')):
            features.extend(read(path)['features'])
        actual=[f['properties']['OBJECTID'] for f in features]
        assert len(actual)==len(set(actual)) and set(actual)==set(expected), f'{kind}: incomplete or duplicate download'
        records[kind]=features
    candidates=read(corridors)
    groups=defaultdict(list);line_records=[];invalid=[];display=[];types={}
    for kind,features in records.items():
        field='FloodPlainSource' if kind=='polygon' else 'Layer'
        types[kind]=dict(Counter(f['properties'].get(field) or 'Unknown' for f in features))
        for feature in features:
            if feature.get('geometry') is None:
                invalid.append((kind,feature['properties']['OBJECTID'],None))
                continue
            g=transform(PROJECT,shape(feature['geometry']))
            category=feature['properties'].get(field) or 'Unknown'
            if g.is_empty or not g.is_valid:
                invalid.append((kind,feature['properties']['OBJECTID'],box(*g.bounds) if not g.is_empty else None))
                continue
            if kind=='polygon': groups[category].append(g)
            else: line_records.append((category,g))
            # Attributed flood lines provide the context missing from polygon outlines.
            # Display the uncertain classes; ordinary engineered/estimated edges are in polygons.
            if kind=='polygon' or category not in ['FLOODLINE-ENGINEERED','FLOODLINE-ESTIMATED']:
                display.append({'type':'Feature','properties':{'sourceType':category,'kind':kind,'sourceId':feature['properties']['OBJECTID']},'geometry':mapping(transform(UNPROJECT,g.simplify(5,preserve_topology=True)))})
    unions={category:unary_union(geometries) for category,geometries in groups.items()}
    all_polygons=unary_union(list(unions.values()))
    evidence={}
    for c in candidates:
        line=transform(PROJECT,LineString(c['coordinates']))
        nearby=defaultdict(list)
        for category,g in line_records:
            distance=line.distance(g)
            if distance<=50:nearby[category].append(distance)
        affected=[{'kind':kind,'sourceId':identifier} for kind,identifier,bounds in invalid if bounds is None or line.distance(bounds)<=50]
        evidence[c['id']]={'status':'screened_with_limits','mappedOverlap':overlap(line,[all_polygons]),'overallFloodRisk':None,'floodDepthMetres':None,'annualProbability':None,'urbanDrainageStatus':'not_assessed','polygonResults':[{'sourceType':category,**overlap(line,[union])} for category,union in sorted(unions.items())], 'nearbyLineRecords':[{'sourceType':category,'count':len(distances),'nearestMetres':round(min(distances),1)} for category,distances in sorted(nearby.items())], 'excludedGeometryNearby':affected,'completeCoverageConfirmed':False}
    data={'type':'FeatureCollection','features':display,'corridors':evidence,'retrievedAt':datetime.now(timezone.utc).isoformat(),'sourceRecordCounts':{kind:len(rows) for kind,rows in records.items()},'sourceCategories':types,'excludedGeometryCount':len(invalid),'sourceFiles':provenance,'licence':LICENCE,'attribution':CREDIT,
      'sources':{'polygon':'https://services1.arcgis.com/d0ZCwU7eGKVeNiEE/arcgis/rest/services/Floodline_TRCA_Polygon/FeatureServer/1','line':'https://services1.arcgis.com/d0ZCwU7eGKVeNiEE/arcgis/rest/services/Floodline_TRCA_Line/FeatureServer/0','catalogue':'https://trca-camaps.opendata.arcgis.com/','viewer':'https://trca.ca/conservation/flood-risk-management/flood-plain-map-viewer/'},
      'method':'Complete paginated GeoJSON records verified against service object IDs. WGS84 projected to EPSG:2952; full valid polygon unions grouped by source class for 2D overlap, including edge contact. Companion line records checked within an illustrative 50 m, not a legal setback. Invalid geometries excluded; nearby bounding boxes flag uncertain results. Display geometry alone simplified by 5 m.',
      'limitations':['Generalized riverine regulatory-event context, not exact regulatory limits or engineering clearance.','No local-drainage, flood-depth, annual-probability or future-climate calculation.','Spill markers can indicate flooding beyond mapped polygons; absence of nearby markers does not confirm complete coverage.','Layer retrieval date is not the observation or hydraulic-study date of every area.','Overlap is not a construction footprint or a flooding prediction for an elevated or underground design.','No change to ranking, modes, costs or illustrative travel times.']}
    output.write_text(json.dumps(data,separators=(',',':')))
    print(json.dumps({'counts':data['sourceRecordCounts'],'categories':types,'invalid':len(invalid),'display':len(display),'corridors':evidence},indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    for arg in ['raw','corridors','output']:parser.add_argument('--'+arg,type=Path,required=True)
    args=parser.parse_args();prepare(args.raw,args.corridors,args.output)
