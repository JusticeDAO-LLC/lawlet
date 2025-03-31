import os
import sys
import sqlite3

def main():
	print("extract")
	dir = os.path.dirname(__file__)
	parent = os.path.dirname(dir)
	conn = sqlite3.connect(parent + '/USCode.db')
	c = conn.cursor()
	c.execute('SELECT * FROM Laws')
	return c.fetchall()


if __name__ == '__main__':
	main()