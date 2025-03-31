import os
from cloudkit_worker import run

if __name__ == '__main__':
	run(skillset=os.path.join(os.path.dirname(__file__), 'skillset'))