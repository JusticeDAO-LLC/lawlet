import Koa from 'koa'
import server from 'app:server'
import createCounsel from './counsel.js'

let koa = new Koa()
let counsel = createCounsel({
	master: 'wss://lawlet.mwni.io/cloud/?pass=topsecret'
})

koa.use(
	async (ctx, next) => {
		ctx.state.counsel = counsel
		await next()
	}
)

koa.use(
	await server({ ssr: true })
)

koa.listen(6280)
