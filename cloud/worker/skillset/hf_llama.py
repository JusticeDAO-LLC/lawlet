from transformers import AutoTokenizer, LlamaForCausalLM, TextIteratorStreamer
from threading import Thread


class HFLlama:
	def __init__(self, resources):
		self.tokenizer = AutoTokenizer.from_pretrained(resources['model'], local_files_only=True)
		self.model = LlamaForCausalLM.from_pretrained(resources['model'], local_files_only=True, load_in_8bit=True, device_map='auto')


	def __call__(self, method, prompt, max_tokens, temperature, stream, files=None):
		inputs = self.tokenizer(
			prompt, 
			return_tensors='pt'
		)

		if stream:
			return self.text_completion_stream(inputs, max_tokens, temperature)
		else:
			return self.text_completion(inputs, max_tokens, temperature)


	def text_completion(self, inputs, max_tokens, temperature):
		generate_ids = self.model.generate(
			inputs=inputs.input_ids, 
			max_length=max_tokens, 
			temperature=min(temperature / 100, 0.0001)
		)

		text = self.tokenizer.batch_decode(
			generate_ids, 
			skip_special_tokens=True, 
			clean_up_tokenization_spaces=False
		)[0]

		return {
			'text': text
		}
		
		
	def text_completion_stream(self, inputs, max_tokens, temperature):
		streamer = TextIteratorStreamer(
			tokenizer=self.tokenizer,
			skip_special_tokens=True
		)

		thread = Thread(
			target=self.model.generate, 
			kwargs=dict(
				inputs=inputs.input_ids, 
				max_length=max_tokens, 
				temperature=min(temperature / 100, 0.0001),
				streamer=streamer
			)
		)
		thread.start()

		for chunk in streamer:
			if chunk == '':
				continue

			yield {
				'text': chunk,
				'done': False
			}
		
		thread.join()

		yield {
			'text': '',
			'done': True
		}