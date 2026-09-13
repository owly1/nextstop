"""Extract two published aggregate TTS tables; never ingest household microdata."""
import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
import pdfplumber

REGIONS = ['Toronto', 'Durham', 'York', 'Peel', 'Halton', 'Hamilton']
SOURCE = 'https://dmg.utoronto.ca/wp-content/uploads/2025/08/2022-TTS-OD-Matrices-v1.4.pdf'


def extract(path):
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[51].extract_text()
    assert 'NEW BASELINE: PERSONS 5+' in page and 'GTHA, 6 REGIONS' in page
    matrices = {}
    for key, section in [('day', '3.1.1.'), ('am', '3.1.2.')]:
        block = page.split(section, 1)[1]
        if key == 'day':
            block = block.split('3.1.2.', 1)[0]
        matrix, row_totals = [], []
        for region in REGIONS:
            lines = [line for line in block.splitlines() if line.startswith(region.upper() + ' ')]
            assert len(lines) == 1, f'Expected exactly one {region} row'
            values = [int(n.replace(',', '')) for n in re.findall(r'\b[\d,]+\b', lines[0])]
            assert len(values) == 7 and all(n > 0 and n % 100 == 0 for n in values)
            matrix.append(values[:6]); row_totals.append(values[6])
        total_lines = [line for line in block.splitlines() if re.match(r'TOTAL \d', line)]
        assert len(total_lines) == 1
        totals = [int(n.replace(',', '')) for n in re.findall(r'\b[\d,]+\b', total_lines[0])]
        assert len(totals) == 7
        for row, total in zip(matrix, row_totals):
            assert abs(sum(row) - total) <= 350, 'Allow only published rounding discrepancies'
        for column, total in enumerate(totals[:6]):
            assert abs(sum(row[column] for row in matrix) - total) <= 350
        assert abs(sum(map(sum, matrix)) - totals[6]) <= 1850
        matrices[key] = {'values': matrix, 'publishedRowTotals': row_totals,
                         'publishedColumnTotals': totals[:6], 'publishedGrandTotal': totals[6]}
    assert matrices['am']['values'][2][0] == 95100
    assert matrices['day']['values'][0][2] == 365200
    return {'regions': REGIONS, 'surveyYear': 2022, 'matrices': matrices,
            'source': {'title': '2022 TTS regional origin–destination tables', 'url': SOURCE,
                       'page': 53, 'sections': ['3.1.1', '3.1.2'], 'published': 'January 2025',
                       'retrievedAt': datetime.now(timezone.utc).isoformat(),
                       'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()},
            'scope': 'Trips made by GTHA households, with both endpoints inside the GTHA. All modes and purposes; people age 5 and older. The 2022 survey collected travel in fall 2022 and spring 2023.',
            'periods': {'day': '24 hours', 'am': 'Trips starting 06:00–08:59'},
            'limitations': ['Expanded survey estimates, rounded to the nearest hundred.',
                            'Trips involving places or households outside the GTHA are excluded.',
                            'All of Toronto is a single region; no neighbourhood-to-neighbourhood flows are inferred.',
                            'These are trips, not distinct people or transit riders.',
                            '2022 uses a new age/walking-trip definition and is not directly comparable with earlier cycles.',
                            'No assignment to proposed routes or influence on corridor ranking is made.'],
            'attribution': 'Transportation Tomorrow Survey, regional origin–destination report, January 2025; public aggregate tables hosted by the University of Toronto Data Management Group.',
            'rights': 'Numerical facts extracted from the public report. No household records or full report are redistributed. The Toronto open-data licence for other datasets is not claimed for TTS.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('report', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    result = extract(args.report)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print('Verified 72 regional OD cells, row and column totals, age basis and source page.')
