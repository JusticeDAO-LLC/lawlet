import torch
from transformers import AutoTokenizer, AutoModelForCausalLM


class HFLlama:
	def __init__(self, resources):
		self.tokenizer = AutoTokenizer.from_pretrained(resources['model'], local_files_only=True)
		self.model = AutoModelForCausalLM.from_pretrained(resources['model'], local_files_only=True, torch_dtype=torch.float16).to('cuda')


	def __call__(self, method, prompt, max_tokens, temperature, files=None):
		inputs = self.tokenizer(
			prompt, 
			return_tensors='pt'
		)

		generate_ids = self.model.generate(
			inputs=inputs.input_ids.to('cuda'), 
			max_new_tokens=max_tokens, 
			temperature=min(temperature / 100, 0.0001)
		)

		text = self.tokenizer.batch_decode(
			generate_ids[:, inputs.input_ids.shape[1]:], 
			skip_special_tokens=True, 
			clean_up_tokenization_spaces=False
		)[0]

		return {
			'text': text
		}