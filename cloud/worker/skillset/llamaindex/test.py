import os
import sys
#add path skillset to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'skillset'))
from skillset import knn

knn.main()