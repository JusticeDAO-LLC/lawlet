import { Button, Component, Fragment, HStack, Headline, Root, Text, VStack } from '@architekt/ui'
import { Form, TextInput, createModel } from '@architekt/forms'
import Stylesheet from './App.scss'
import { answerQuestion } from 'api:../server/api.js'

export default Component(({ ctx }) => {
	let submitting = false
	let answer
	let error
	let model = createModel({
		data: {
			question: ''
		},
		constraints: [
			{
				key: 'question',
				check: ({ question }) => {
					if(question.length === 0)
						throw 'required'
				}
			}
		],
		submit: async ({ question }) => {
			answer = (await answerQuestion({ question })).answer
		}
	})

	async function submit(){
		try{
			error = undefined
			submitting = true
			ctx.redraw()
			await model.submit()
		}catch(e){
			error = `${e.message} - Please retry!`
		}finally{
			submitting = false
			ctx.redraw()
		}
	}

	function reset(){
		answer = undefined
		model.set('question', '')
		ctx.redraw()
		ctx.dom[0].querySelector('textarea').focus()
	}

	return () => {
		Stylesheet()
		Root(() => {
			VStack({ class: 'header' }, () => {
				Headline({
					text: 'Lawlet ⚖️'
				})
				Text({
					text: 'Legal Question Answering'
				})
			})
			VStack({ class: 'body' }, () => {
				Form({ model }, () => {
					TextInput({
						class: 'question',
						key: 'question',
						multiline: true,
						autoFocus: true,
						placeholder: 'Ask a legal question and press [enter]',
						onKeyDown: e => {
							if(e.keyCode === 13)
								submit() + e.preventDefault()
						},
						disabled: submitting || (answer && !error)
					})
				})

				if(submitting){
					ResponseBubble(() => {
						HStack({ class: 'dots' }, () => {
							Text({ text: '•' })
							Text({ text: '•' })
							Text({ text: '•' })
						})
					})
				}else if(error){
					ResponseBubble(() => {
						Text({
							class: 'error',
							text: error
						})
					})
				}else if(answer){
					ResponseBubble(() => {
						Text({
							text: answer
						})
					})

					VStack({ class: 'again' }, () => {
						Button({
							class: 'reset',
							text: 'Ask another question',
							onTap: reset
						})
					})
				}
			})

			Text({
				class: 'powered',
				text: `🚀 Powered by Hugging Face, Llama-2, LlamaIndex and OpenAI's Curie.`
			})
		})
	}
})

const ResponseBubble = Fragment((props, content) => {
	HStack({ class: 'response' }, () => {
		Text({ 
			class: 'robot',
			text: '🤖' 
		})
		VStack({ class: 'bubble' }, () => {
			content()
		})
	})
})