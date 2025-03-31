import createClient from '@cloudkit/client'


export default ({ master }) => {
	let client = createClient({ url: master })

	client.on('connect', () => {
		console.log('counsel connected to cloud')
	})

	client.on('error', e => {
		console.log(`counsel connection error: ${e.message}`)
	})

	return async ({ question }) => {
		let guess = await client.request({
			command: 'text_completion',
			prompt: constructQuestionToLawGuess({ question }),
			max_tokens: 250,
			temperature: 0
		})

		let uscode = await client.request({
			command: 'uscode_retrieve',
			text: guess.text
		})

		let answer = await client.request({
			command: 'text_completion',
			prompt: constructAnswer({ question, uscode }),
			max_tokens: 420,
			temperature: 0
		})

		return {
			answer: answer.text
		}
	}
}


function constructQuestionToLawGuess({ question }){
	return `<<SYS>>
You are a legal expert.
<</SYS>>

[INST]Draft a written U.S law that applies to the following question:

${question}

The draft should consist of no more than 3 sentences. It should provide a reference for finding current written U.S. law.[/INST] Draft: 
`
}

function constructAnswer({ question, uscode }){
	return `<<SYS>>
You are a legal expert.
<</SYS>>

[INST]${uscode.title} U.S. Code - § ${uscode.nr} ${uscode.name}

${uscode.summary}


Please give me a short answer to this question:
${question}

Explain how "${uscode.title} U.S. Code - § ${uscode.nr} ${uscode.name}" applies to my question. Be concise.[/INST]`
}