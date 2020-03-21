import csv
import requests
import json

with open('tickets.csv') as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    line_count = 0
    for row in csv_reader:
        if line_count == 0:
            print(f'Column names are {", ".join(row)}')
            line_count += 1
        else:

            if row[0] == 'NULL' or row[0] == 'file' or not row[0].lower().endswith(('.jpg', '.png')):
                pass
            else:
                print(
                    f'\t{row[0]}')
                URL = 'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyB07Pi5wswlk4zZZcVuCIex7vFRGegAn_k'
                PARAMS = {
                    'key': 'AIzaSyB07Pi5wswlk4zZZcVuCIex7vFRGegAn_k'
                }
                body = {
                    "requests": [
                        {
                            "image": {
                                "source": {
                                    "imageUri": row[0]
                                }
                            },
                            "features": [
                                {
                                    "type": "DOCUMENT_TEXT_DETECTION",
                                    "maxResults": 1
                                }
                            ]
                        }
                    ]
                }
                r = requests.post(url=URL, json=body)
                data = r.json()
                with open('ticket' + str(line_count + 1) + '.json', 'w') as json_file:
                    json.dump(data, json_file)
            line_count += 1
    print(f'Processed {line_count} lines.')
