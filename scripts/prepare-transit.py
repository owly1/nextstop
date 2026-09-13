"""Prepare a small, attributed geometry snapshot from the City of Toronto GTFS.

Usage: python3 scripts/prepare-transit.py /path/to/opendata_ttc_schedules.zip
Uses one representative shape per daytime route for display, not journey planning.
"""
import csv
import io
import json
import math
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
archive = zipfile.ZipFile(sys.argv[1])
def rows(name):
    return csv.DictReader(io.TextIOWrapper(archive.open(name), encoding="utf-8-sig"))

routes = {r["route_id"]: r for r in rows("routes.txt") if not 300 <= int(r["route_short_name"]) < 400}
route_shapes = defaultdict(set)
shape_trips = {}
for trip in rows("trips.txt"):
    if trip["route_id"] in routes and trip["direction_id"] == "0":
        route_shapes[trip["route_id"]].add(trip["shape_id"])
        shape_trips.setdefault(trip["shape_id"], trip["trip_id"])
wanted = set.union(*route_shapes.values())
shapes = defaultdict(list)
for row in rows("shapes.txt"):
    if row["shape_id"] in wanted:
        shapes[row["shape_id"]].append((int(row["shape_pt_sequence"]), [float(row["shape_pt_lon"]), float(row["shape_pt_lat"])]))
shapes = {k: [p[1] for p in sorted(v)] for k, v in shapes.items()}

def km(a, b):
    return math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2))*111.32, (a[1]-b[1])*111.32)
def length(coords):
    return sum(km(a,b) for a,b in zip(coords,coords[1:]))
def simplify(coords, distance=.025):
    kept=[coords[0]]
    for point in coords[1:-1]:
        if km(kept[-1],point)>distance:
            kept.append(point)
    return kept+[coords[-1]]

chosen = {rid: max(ids, key=lambda sid:length(shapes[sid])) for rid, ids in route_shapes.items()}
trip_routes = {shape_trips[sid]: rid for rid,sid in chosen.items()}
route_stop_ids = defaultdict(list)
for row in rows("stop_times.txt"):
    if row["trip_id"] in trip_routes:
        route_stop_ids[trip_routes[row["trip_id"]]].append((int(row["stop_sequence"]),row["stop_id"]))
stops = {r["stop_id"]: r for r in rows("stops.txt")}
features=[]
route_stops={}
for rid,sid in chosen.items():
    r=routes[rid]
    features.append({"type":"Feature","properties":{"id":rid,"name":r["route_long_name"],"number":r["route_short_name"],"type":"rail" if rid in ["1","2","4","5","6"] else "streetcar" if r["route_type"]=="0" else "bus","color":"#"+r["route_color"],"km":round(length(shapes[sid]),2)},"geometry":{"type":"LineString","coordinates":simplify(shapes[sid])}})
    route_stops[rid]=[{"name":stops[s]["stop_name"],"coordinates":[float(stops[s]["stop_lon"]),float(stops[s]["stop_lat"])]} for _,s in sorted(route_stop_ids[rid])]

out=ROOT/"dist/data"
out.mkdir(exist_ok=True)
(out/"ttc-network.json").write_text(json.dumps({"type":"FeatureCollection","features":features},separators=(",",":")))
(out/"ttc-stops.json").write_text(json.dumps(route_stops,separators=(",",":")))
(out/"provenance.json").write_text(json.dumps({"publisher":"City of Toronto / Toronto Transit Commission","dataset":"TTC Routes and Schedules","source_url":"https://open.toronto.ca/dataset/ttc-routes-and-schedules/","download_url":"https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/opendata_ttc_schedules.zip","source_modified":"2026-08-27","retrieved":"2026-09-12","license":"Open Government Licence – Toronto","license_url":"https://open.toronto.ca/open-data-licence/","attribution":"Contains information licensed under the Open Government Licence – Toronto.","transformation":"Longest direction-0 shape per daytime route, simplified to approximately 25 metres between retained vertices. Representative trip stops retained. Branches, other directions and service calendars are not modelled for routing.","limitations":"A geometry snapshot, not a live service map or complete multimodal routing model. GO Transit, regional buses and future committed projects are not included.","calendar":list(rows("calendar.txt"))},indent=2))
print(json.dumps({"routes":len(features),"rail_routes":[f["properties"]["number"] for f in features if f["properties"]["type"]=="rail"],"candidate_routes":{rid:len(route_stops.get(rid,[])) for rid in ["35","85","54","29","39","60","53"]}}))
