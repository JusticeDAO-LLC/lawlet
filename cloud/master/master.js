import createMaster from '@cloudkit/master'

const requiredModels = [
	'hf_llama2',
	'uscode_knn'
]

const master = createMaster({
	args: process.argv.slice(2),
	workerVersion: 1,
})

master.defineTaskHardwareRequirements({
	command: 'text_completion',
	calculate: task => {
		return { gpuMemory: 20000 }
	}
})

master.defineTaskHardwareRequirements({
	command: 'uscode_retrieve',
	calculate: task => {
		return { gpuMemory: 0 }
	}
})

master.on('new-worker', worker => {
	if(worker.model)
		return

	for(let model of requiredModels){
		let hasWorker = master.workers.some(
			worker => worker.model === model || worker.__upcomingModel === model
		)

		if(!hasWorker){
			worker.loadModel({ model })
			worker.__upcomingModel = model
			return
		}
	}

	worker.loadModel({ model: requiredModels[1] })
})