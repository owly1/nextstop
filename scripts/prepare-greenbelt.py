"""Prepare a Greenbelt outer-boundary screening snapshot; no legal classification."""
import argparse
import hashlib
import io
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
import shapefile
from shapely.geometry import shape, mapping, LineString
from shapely.ops import transform
from pyproj import Transformer

parser = argparse.ArgumentParser()
for name in ['archive', 'corridors', 'output']:
    parser.add_argument('--'+name, type=Path, required=True)
args = parser.parse_args()
z = zipfile.ZipFile(args.archive)
base = 'LIO-2023-12-14/GREENBELT_OUTER_BOUNDARY'
reader = shapefile.Reader(**{e: io.BytesIO(z.read(base+'.'+e)) for e in ['shp','shx','dbf']})
assert len(reader) == 1 and reader.record(0)['EFF_DATE'] == '20231206120000'
assert 'GCS_North_American_1983' in z.read(base+'.prj').decode()
g = transform(Transformer.from_crs(4269,2952,always_xy=True).transform, shape(reader.shape(0).__geo_interface__))
assert g.is_valid and not g.is_empty
project = Transformer.from_crs(4326,2952,always_xy=True).transform
evidence = {}
for c in json.loads(args.corridors.read_text()):
    line = transform(project, LineString(c['coordinates']))
    evidence[c['id']] = {'intersects': line.intersects(g), 'overlapMetres': round(line.intersection(g).length,1), 'distanceMetres': round(line.distance(g),1), 'nearbyWithin50m': line.distance(g)<=50}
assert len(evidence) == 6
display = transform(Transformer.from_crs(2952,4326,always_xy=True).transform, g.simplify(10,preserve_topology=True))
data = {'type':'FeatureCollection','features':[{'type':'Feature','properties':{'name':'Greenbelt outer boundary','effectiveDate':'2023-12-06'},'geometry':mapping(display)}],
    'corridors':evidence, 'source':'https://data.ontario.ca/dataset/greenbelt-outer-boundary',
    'download':'https://ws.gisetl.lrc.gov.on.ca/fmedatadownload/Packages/GBOUTBND.zip',
    'licence':'https://www.ontario.ca/page/open-government-licence-ontario',
    'attribution':'Contains information licensed under the Open Government Licence – Ontario.',
    'retrievedAt':datetime.now(timezone.utc).isoformat(),'archiveSha256':hashlib.sha256(args.archive.read_bytes()).hexdigest(),
    'corridorsSha256':hashlib.sha256(args.corridors.read_bytes()).hexdigest(),
    'method':'Source NAD83 geographic coordinates projected to EPSG:2952. 2D intersection length and minimum line distance use full valid source geometry; display alone is simplified by 10 m. A 50 m proximity flag is illustrative, not a legal setback.',
    'limitations':['December 2023 boundary snapshot; verify current legal boundaries and applicable policies.', 'Outer boundary combines Niagara Escarpment, Oak Ridges Moraine, Protected Countryside and Urban River Valley areas; this screen does not identify the designation or ownership for a site.', 'Road geometry and boundary contact do not establish construction impacts, permission, or an absolute prohibition.', 'No change to ranking, mode selection or cost estimates. National park and flood-hazard screening remains separate unfinished work.']}
args.output.write_text(json.dumps(data,separators=(',',':')))
print(json.dumps(evidence,indent=2))
