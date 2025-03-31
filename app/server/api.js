@post({ path: '/api/answer' })
export async function answerQuestion({ ctx, question }){
	try{
		return await ctx.state.counsel({ question })
	}catch(e){
		throw {
			message: e.message,
			expose: true
		}
	}
}