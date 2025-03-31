import streamlit as st

# TEMPORARY
from time import sleep

with open('style.css') as f:
	st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)


header_col1, header_col2, header_col3 = st.columns(3, gap='small')
divider = st.container()
body = st.container()
text_input_container = st.empty()


response = 'Response '
query = ''


def callback():
	#Logic for sending off query to model goes here 
	response = 'This is a response'

def reset():
	# TODO: This doesn't seem to work properly Want to reset the page back to the original state
	response = ''
	query = ''

def progress():
	# TODO: Make this into a functional progress bar if need be 
	progress_text = "Operation in progress. Please wait."
	my_bar = st.progress(0, text=progress_text)

	for percent_complete in range(25):
		sleep(0.1)
		my_bar.progress(percent_complete + 1, text=progress_text)

	my_bar.empty()
	progress_text = ""


with header_col1:
	st.title('Lawlet :scales:', False)
	st.text('Legal document lookup')


with header_col2:
	pass


with header_col3:
	# Room for socials or contact or something
	st.text('info')
	

with divider:
	st.divider()

with body:

	query = text_input_container.text_input(label='', placeholder="Enter your legal query here.", label_visibility='collapsed', on_change=callback)

	if query != '':
		text_input_container.empty()		
		progress()	

		query_bubble = '''
			<div class="talk-bubble tri-right btm-right">
				<div class="talktext">
					<p>{query}</p>
				</div>
			</div>
		'''	
		st.markdown(query_bubble.format(query=query), unsafe_allow_html=True)


		response_bubble = '''
			<div class="talk-bubble tri-right btm-left">
				<div class="talktext">
					<p>{response}</p>
				</div>
			</div>
		'''
		st.markdown(response_bubble.format(response=response), unsafe_allow_html=True)

		st.button('ask another question', on_click=reset)
		
