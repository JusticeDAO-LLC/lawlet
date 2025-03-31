import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'ingest'))
from ingest import extract, transform, load

data = extract.main()
filtered, metadata = transform.main(data)
results = load.main(filtered, metadata)
