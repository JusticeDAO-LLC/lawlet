import os
import sys
from .llamaindex.infer import init, query

class USCodeKNN:
    def __init__(self, resources):
        self.queryEngine = init(resources)
        pass

    def __call__(self, **kwargs):
        return query(self.queryEngine, kwargs['text'])
    
#if __name__ == '__main__':
#    dir = os.path.dirname(__file__)
#    parentDir = os.path.dirname(dir)
#    downloadsDir = parentDir + '/downloads'
#    p = USCodeKNN({'db': downloadsDir})
#    print(p(query='something'))
    